import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { RenovacaoMensalidadeService } from '../../core/services/renovacao-mensalidade.service';
import { ToastService } from '../../core/services/toast.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { Configuracao, Mensalidade, StatusFinanceiro } from '../../core/models';
import {
  formatarValor,
  formatarData,
  statusFinanceiro,
  rotuloStatusFinanceiro,
  criarMapaTelefones,
  resolverTelefoneCliente,
} from '../../shared/utils/formatters';
import {
  nomeClienteMensalidade,
  trackByMensalidadeId,
  montarMensagemBloqueioMensalidade,
  mensalidadeEstaAtrasada,
} from '../../shared/utils/cobranca-lote';
import { CobrancaLoteFilaService } from '../../core/services/cobranca-lote-fila.service';
import {
  montarItensRenovacaoLote,
  oferecerMensagemRenovacao,
} from '../../shared/utils/whatsapp';
import { resolverDiasAntecedencia, clienteEhCortesia, clienteParticipaCobrancas } from '../../shared/utils/cobranca-diaria';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_OPERACAO,
} from '../../shared/utils/page-sync.util';
import {
  persistirFiltrosFinanceiro,
  restaurarFiltrosFinanceiro,
} from '../../shared/utils/financeiro-filtros-persist.util';
import {
  classesFilterChip,
  classesFilterChipContagem,
  VarianteFilterChip,
} from '../../shared/utils/filter-chip.util';
import { lerSessionJson, salvarSessionJson } from '../../shared/utils/session-persist.util';
import {
  contatoRegistradoHoje,
  classeDotContato,
} from '../../shared/utils/contato';

const CHAVE_DENSIDADE_FINANCEIRO = 'crm.financeiro.tabelaCompacta';

@Component({
  selector: 'app-financeiro',
  templateUrl: './financeiro.page.html',
})
export class FinanceiroPage implements OnInit, OnDestroy {
  mensalidades: Mensalidade[] = [];
  private readonly destroy$ = new Subject<void>();
  telefones = new Map<number, string>();
  nomesClientes = new Map<number, string>();
  loading = true;
  busca = '';
  filtro: StatusFinanceiro = 'TODOS';
  pagina = 1;
  readonly porPagina = 10;
  selecionados = new Set<number>();
  pagandoLote = false;
  tabelaCompacta = false;

  readonly opcoesFiltro: { valor: StatusFinanceiro; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'PENDENTE', rotulo: 'Vencendo' },
    { valor: 'REGULAR', rotulo: 'Longe do vencimento' },
    { valor: 'ATRASADO', rotulo: 'Atrasado' },
  ];

  constructor(
    private route: ActivatedRoute,
    private mensalidadeService: MensalidadeService,
    private clienteService: ClienteService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService,
    private renovacao: RenovacaoMensalidadeService,
    private toast: ToastService,
    private sync: DadosSyncService,
    private cobrancaLoteFila: CobrancaLoteFilaService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  get diasAntecedencia(): number {
    return resolverDiasAntecedencia(this.configuracao);
  }

  ngOnInit(): void {
    this.tabelaCompacta =
      lerSessionJson<boolean>(CHAVE_DENSIDADE_FINANCEIRO) === true;

    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }

    const filtrosSalvos = restaurarFiltrosFinanceiro();
    if (filtrosSalvos) {
      this.busca = filtrosSalvos.busca;
      this.filtro = filtrosSalvos.filtro;
      this.pagina = filtrosSalvos.pagina;
    }

    this.route.queryParamMap.subscribe((params) => {
      const status = params.get('status');
      if (
        status === 'PENDENTE' ||
        status === 'REGULAR' ||
        status === 'ATRASADO'
      ) {
        this.filtro = status;
        this.pagina = 1;
        this.persistirFiltros();
      } else if (!filtrosSalvos) {
        this.filtro = 'TODOS';
        this.pagina = 1;
      }
    });

    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_OPERACAO,
      () => this.carregar(true)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar(true);
    }
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    forkJoin([
      this.mensalidadeService.listar(),
      this.clienteService.listar(),
    ]).subscribe({
      next: ([mensalidades, clientes]) => {
        this.mensalidades = mensalidades.filter(
          (m) => m.status !== 'PAGO' && !clienteEhCortesia(m.cliente)
        );
        this.telefones = criarMapaTelefones(clientes);
        this.nomesClientes = new Map(clientes.map((c) => [c.id, c.nome]));

        const idsValidos = new Set(this.mensalidades.map((m) => m.id));
        this.selecionados = new Set(
          [...this.selecionados].filter((id) => idsValidos.has(id))
        );

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        if (!silencioso) {
          void this.toast.error('Erro ao carregar o financeiro.');
        }
      },
    });
  }

  get filtradas(): Mensalidade[] {
    let lista = [...this.mensalidades];

    if (this.filtro !== 'TODOS') {
      lista = lista.filter(
        (m) => statusFinanceiro(m.vencimento, this.diasAntecedencia) === this.filtro
      );
    }

    if (this.busca.trim()) {
      const t = this.busca.toLowerCase();
      lista = lista.filter((m) => m.cliente?.nome?.toLowerCase().includes(t));
    }

    const ordem = { PENDENTE: 0, REGULAR: 1, ATRASADO: 2 };
    lista.sort((a, b) => {
      const sa = statusFinanceiro(a.vencimento, this.diasAntecedencia);
      const sb = statusFinanceiro(b.vencimento, this.diasAntecedencia);
      if (ordem[sa] !== ordem[sb]) return ordem[sa] - ordem[sb];
      return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
    });

    return lista;
  }

  get paginadas(): Mensalidade[] {
    const inicio = (this.pagina - 1) * this.porPagina;
    return this.filtradas.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filtradas.length / this.porPagina));
  }

  resumo(tipo: StatusFinanceiro): { qtd: number; valor: string } {
    const lista =
      tipo === 'TODOS'
        ? this.mensalidades
        : this.mensalidades.filter(
            (m) => statusFinanceiro(m.vencimento, this.diasAntecedencia) === tipo
          );
    const valor = lista.reduce((t, m) => t + m.valor, 0);
    return { qtd: lista.length, valor: formatarValor(valor) };
  }

  status(m: Mensalidade): StatusFinanceiro {
    return statusFinanceiro(m.vencimento, this.diasAntecedencia);
  }

  rotuloStatus(m: Mensalidade): string {
    return rotuloStatusFinanceiro(this.status(m));
  }

  classesStatusFinanceiro(m: Mensalidade): Record<string, boolean> {
    const s = this.status(m);
    return {
      'crm-badge-atrasado': s === 'ATRASADO',
      'crm-badge-pendente': s === 'PENDENTE',
      'crm-badge-neutral': s === 'REGULAR',
    };
  }

  telefone(m: Mensalidade): string {
    return resolverTelefoneCliente(m, this.telefones);
  }

  participaCobrancas(m: Mensalidade): boolean {
    return clienteParticipaCobrancas(m.cliente);
  }

  mensalidadeAtrasada(m: Mensalidade): boolean {
    return mensalidadeEstaAtrasada(m.vencimento);
  }

  mensagemBloqueio(m: Mensalidade): string {
    return montarMensagemBloqueioMensalidade(
      m,
      this.configuracao,
      this.nomesClientes,
      nomeClienteMensalidade(m, this.nomesClientes)
    );
  }

  onBloqueioRegistrado(evento: {
    mensalidadeId: number;
    bloqueioEnviadoEm: string;
  }): void {
    this.mensalidades = this.mensalidades.map((m) =>
      m.id === evento.mensalidadeId
        ? {
            ...m,
            bloqueioEnviadoEm: evento.bloqueioEnviadoEm,
            ultimoContatoEm: evento.bloqueioEnviadoEm,
          }
        : m
    );
  }

  async renovar(m: Mensalidade): Promise<void> {
    const ok = await this.renovacao.registrarRenovacao({
      mensalidadeId: m.id,
      clienteId: m.clienteId,
      telefone: this.telefone(m),
      nome: nomeClienteMensalidade(m, this.nomesClientes),
      referencia: m.referencia,
      valorFallback: m.valor,
      planoIdAtual: m.cliente?.planoId,
      nomePlanoAtual: m.cliente?.plano?.nome,
    });
    if (!ok) return;

    this.selecionados.delete(m.id);
    this.selecionados = new Set(this.selecionados);
    this.carregar(true);
  }

  async renovarSelecionados(): Promise<void> {
    if (this.selecionados.size === 0 || this.pagandoLote) return;

    const selecionadas = this.mensalidades.filter((m) =>
      this.selecionados.has(m.id)
    );
    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    this.pagandoLote = true;
    this.mensalidadeService
      .registrarPagamentos([...this.selecionados], pagoEm)
      .subscribe({
        next: async (resultado) => {
          this.pagandoLote = false;
          this.limparSelecao();
          this.carregar(true);

          if (resultado.erros.length > 0) {
            void this.toast.warning(
              `${resultado.sucesso} pago(s), ${resultado.erros.length} falha(s).`
            );
          } else {
            void this.toast.success(
              `${resultado.sucesso} renovação(ões) registrada(s) com sucesso.`
            );
          }

          const empresa = this.configuracao?.nomeEmpresa ?? 'JPTV';
          const itensRenovacao = montarItensRenovacaoLote(
            resultado.pagamentos ?? [],
            selecionadas,
            this.telefones,
            this.nomesClientes,
            empresa,
            this.configuracao?.mensagemRenovacao
          );

          if (itensRenovacao.length > 0) {
            await this.cobrancaLoteFila.executar(itensRenovacao, {
              titulo: 'Mensagens de renovação',
              rotuloAbrir: 'Abrir WhatsApp',
            });
          }
        },
        error: (err) => {
          this.pagandoLote = false;
          void this.toast.error(err.message ?? 'Erro ao registrar pagamentos.');
        },
      });
  }

  get valorTotalSelecionados(): string {
    const total = this.mensalidades
      .filter((m) => this.selecionados.has(m.id))
      .reduce((acc, m) => acc + m.valor, 0);
    return formatarValor(total);
  }

  get mensalidadesSelecionadas(): Mensalidade[] {
    return this.mensalidades.filter((m) => this.selecionados.has(m.id));
  }

  get qtdSelecionados(): number {
    return this.selecionados.size;
  }

  estaSelecionado(m: Mensalidade): boolean {
    return this.selecionados.has(m.id);
  }

  alternarSelecao(m: Mensalidade): void {
    if (this.selecionados.has(m.id)) {
      this.selecionados.delete(m.id);
    } else {
      this.selecionados.add(m.id);
    }
    this.selecionados = new Set(this.selecionados);
  }

  alternarTodosFiltrados(): void {
    if (this.todosFiltradosSelecionados) {
      this.selecionados = new Set();
      return;
    }

    this.selecionados = new Set(this.filtradas.map((m) => m.id));
  }

  get todosFiltradosSelecionados(): boolean {
    return (
      this.filtradas.length > 0 &&
      this.filtradas.every((m) => this.selecionados.has(m.id))
    );
  }

  get todosPaginaSelecionados(): boolean {
    return (
      this.paginadas.length > 0 &&
      this.paginadas.every((m) => this.selecionados.has(m.id))
    );
  }

  alternarPagina(): void {
    if (this.todosPaginaSelecionados) {
      for (const m of this.paginadas) {
        this.selecionados.delete(m.id);
      }
    } else {
      for (const m of this.paginadas) {
        this.selecionados.add(m.id);
      }
    }
    this.selecionados = new Set(this.selecionados);
  }

  selecionarAtrasados(): void {
    this.selecionados = new Set(
      this.filtradas
        .filter((m) => this.status(m) === 'ATRASADO')
        .map((m) => m.id)
    );
  }

  limparSelecao(): void {
    this.selecionados = new Set();
  }

  definirFiltro(valor: StatusFinanceiro): void {
    this.filtro = valor;
    this.pagina = 1;
    this.persistirFiltros();
  }

  contagemFiltro(valor: StatusFinanceiro): number {
    if (valor === 'TODOS') {
      return this.mensalidades.length;
    }

    return this.mensalidades.filter(
      (m) => statusFinanceiro(m.vencimento, this.diasAntecedencia) === valor
    ).length;
  }

  get temFiltrosAtivos(): boolean {
    return this.busca.trim().length > 0 || this.filtro !== 'TODOS';
  }

  limparFiltros(): void {
    this.busca = '';
    this.filtro = 'TODOS';
    this.pagina = 1;
    this.persistirFiltros();
  }

  onBuscaChange(): void {
    this.pagina = 1;
    this.persistirFiltros();
  }

  onPaginaChange(delta: number): void {
    this.pagina += delta;
    this.persistirFiltros();
  }

  private persistirFiltros(): void {
    persistirFiltrosFinanceiro({
      busca: this.busca,
      filtro: this.filtro,
      pagina: this.pagina,
    });
  }

  classesChipStatus(filtro: StatusFinanceiro): string {
    const ativo = this.filtro === filtro;
    const variantes: Record<StatusFinanceiro, VarianteFilterChip> = {
      TODOS: 'violet',
      PENDENTE: 'amber',
      REGULAR: 'emerald',
      ATRASADO: 'red',
    };
    return classesFilterChip(ativo, variantes[filtro]);
  }

  classesChipContagem(filtro: StatusFinanceiro): string {
    const ativo = this.filtro === filtro;
    const variantes: Record<StatusFinanceiro, VarianteFilterChip> = {
      TODOS: 'violet',
      PENDENTE: 'amber',
      REGULAR: 'emerald',
      ATRASADO: 'red',
    };
    return classesFilterChipContagem(ativo, variantes[filtro]);
  }

  alternarDensidadeTabela(): void {
    this.tabelaCompacta = !this.tabelaCompacta;
    salvarSessionJson(CHAVE_DENSIDADE_FINANCEIRO, this.tabelaCompacta);
  }

  get classesTabela(): string {
    return this.tabelaCompacta ? 'crm-table crm-table--compact' : 'crm-table';
  }

  linhaContactada(m: Mensalidade): boolean {
    return contatoRegistradoHoje(m.ultimoContatoEm);
  }

  classeDot(m: Mensalidade): string {
    return classeDotContato(m.ultimoContatoEm);
  }

  fmtValor = formatarValor;
  fmtData = formatarData;

  trackByMensalidade = trackByMensalidadeId;
}
