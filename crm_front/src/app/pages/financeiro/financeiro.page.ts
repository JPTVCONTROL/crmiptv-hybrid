import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Subject, forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { ToastService } from '../../core/services/toast.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { Cliente, Configuracao, Mensalidade, StatusFinanceiro } from '../../core/models';
import {
  formatarValor,
  formatarData,
  statusFinanceiro,
  criarMapaTelefones,
  resolverTelefoneCliente,
} from '../../shared/utils/formatters';
import {
  nomeClienteMensalidade,
  trackByMensalidadeId,
} from '../../shared/utils/cobranca-lote';
import { oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';
import { resolverDiasAntecedencia } from '../../shared/utils/cobranca-diaria';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';

@Component({
  selector: 'app-financeiro',
  templateUrl: './financeiro.page.html',
})
export class FinanceiroPage implements OnInit, OnDestroy {
  mensalidades: Mensalidade[] = [];
  private readonly destroy$ = new Subject<void>();
  telefones = new Map<number, string>();
  nomesClientes = new Map<number, string>();
  clientesPorId = new Map<number, Cliente>();
  loading = true;
  busca = '';
  filtro: StatusFinanceiro = 'TODOS';
  pagina = 1;
  readonly porPagina = 10;
  selecionados = new Set<number>();
  pagandoLote = false;

  readonly opcoesFiltro: { valor: StatusFinanceiro; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'PENDENTE', rotulo: 'Vencendo' },
    { valor: 'REGULAR', rotulo: 'Regular' },
    { valor: 'ATRASADO', rotulo: 'Atrasado' },
  ];

  constructor(
    private route: ActivatedRoute,
    private mensalidadeService: MensalidadeService,
    private clienteService: ClienteService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService,
    private toast: ToastService,
    private modalCtrl: ModalController,
    private sync: DadosSyncService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  get diasAntecedencia(): number {
    return resolverDiasAntecedencia(this.configuracao);
  }

  ngOnInit(): void {
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
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
      }
    });

    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades'],
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
        this.mensalidades = mensalidades.filter((m) => m.status !== 'PAGO');
        this.telefones = criarMapaTelefones(clientes);
        this.nomesClientes = new Map(clientes.map((c) => [c.id, c.nome]));
        this.clientesPorId = new Map(clientes.map((c) => [c.id, c]));

        const idsValidos = new Set(this.mensalidades.map((m) => m.id));
        this.selecionados = new Set(
          [...this.selecionados].filter((id) => idsValidos.has(id))
        );

        this.loading = false;
      },
      error: () => (this.loading = false),
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

  telefone(m: Mensalidade): string {
    return resolverTelefoneCliente(m, this.telefones);
  }

  async editarCliente(m: Mensalidade): Promise<void> {
    const cliente = this.clientesPorId.get(m.clienteId);
    if (!cliente) {
      void this.toast.error('Cliente não encontrado.');
      return;
    }

    const modal = await this.modalCtrl.create({
      component: NovoClienteModalComponent,
      componentProps: { cliente },
      cssClass: 'crm-modal crm-modal-cliente',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
  }

  async pagar(m: Mensalidade): Promise<void> {
    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    this.mensalidadeService.registrarPagamento(m.id, pagoEm).subscribe({
      next: (resultado) => {
        this.selecionados.delete(m.id);
        this.selecionados = new Set(this.selecionados);
        void oferecerMensagemRenovacao({
          telefone: this.telefone(m),
          nome: nomeClienteMensalidade(m, this.nomesClientes),
          referencia: m.referencia,
          valor: resultado.valorRenovacao ?? m.valor,
          novoVencimento: resultado.novoVencimento,
          empresa: this.configuracao?.nomeEmpresa ?? 'JPTV',
          templateRenovacao: this.configuracao?.mensagemRenovacao,
        });
        this.carregar(true);
      },
      error: (err) => void this.toast.error(err.message),
    });
  }

  async pagarSelecionados(): Promise<void> {
    if (this.selecionados.size === 0 || this.pagandoLote) return;

    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    this.pagandoLote = true;
    this.mensalidadeService
      .registrarPagamentos([...this.selecionados], pagoEm)
      .subscribe({
        next: (resultado) => {
          this.pagandoLote = false;
          this.limparSelecao();
          this.carregar(true);

          if (resultado.erros.length > 0) {
            void this.toast.warning(
              `${resultado.sucesso} pago(s), ${resultado.erros.length} falha(s).`
            );
          } else {
            void this.toast.success(
              `${resultado.sucesso} pagamento(s) registrado(s) com sucesso.`
            );
          }
        },
        error: (err) => {
          this.pagandoLote = false;
          void this.toast.error(err.message ?? 'Erro ao registrar pagamentos.');
        },
      });
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
  }

  classesChipStatus(filtro: StatusFinanceiro): Record<string, boolean> {
    const ativo = this.filtro === filtro;

    if (!ativo) {
      return {
        'border-slate-700': true,
        'bg-slate-800/50': true,
        'text-slate-400': true,
        'hover:border-slate-600': true,
        'hover:text-slate-300': true,
      };
    }

    if (filtro === 'TODOS') {
      return {
        'border-violet-500': true,
        'bg-violet-600/15': true,
        'text-violet-200': true,
        'shadow-sm': true,
        'shadow-violet-900/20': true,
      };
    }

    if (filtro === 'PENDENTE') {
      return {
        'border-amber-500': true,
        'bg-amber-600/15': true,
        'text-amber-200': true,
        'shadow-sm': true,
        'shadow-amber-900/20': true,
      };
    }

    if (filtro === 'REGULAR') {
      return {
        'border-green-500': true,
        'bg-green-600/15': true,
        'text-green-200': true,
        'shadow-sm': true,
        'shadow-green-900/20': true,
      };
    }

    return {
      'border-red-500': true,
      'bg-red-600/15': true,
      'text-red-200': true,
      'shadow-sm': true,
      'shadow-red-900/20': true,
    };
  }

  classesChipContagem(filtro: StatusFinanceiro): Record<string, boolean> {
    const ativo = this.filtro === filtro;

    if (!ativo) {
      return { 'bg-slate-700/80': true };
    }

    return {
      'bg-violet-500/25': filtro === 'TODOS',
      'bg-amber-500/25': filtro === 'PENDENTE',
      'bg-green-500/25': filtro === 'REGULAR',
      'bg-red-500/25': filtro === 'ATRASADO',
    };
  }

  fmtValor = formatarValor;
  fmtData = formatarData;

  trackByMensalidade = trackByMensalidadeId;
}
