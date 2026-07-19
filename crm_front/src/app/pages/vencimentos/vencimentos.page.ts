import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { ToastService } from '../../core/services/toast.service';
import { Configuracao, Mensalidade } from '../../core/models';
import {
  formatarValor,
  formatarData,
  calcularDias,
  criarMapaTelefones,
  resolverTelefoneCliente,
} from '../../shared/utils/formatters';
import {
  mensalidadeEstaAtrasada,
  montarMensagemBloqueioMensalidade,
  montarMensagemCobrancaMensalidade,
  nomeClienteMensalidade,
  trackByMensalidadeId,
} from '../../shared/utils/cobranca-lote';
import {
  resolverDiasAntecedencia,
  rotuloDiasCobrancaDiaria,
} from '../../shared/utils/cobranca-diaria';
import { oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';

export type FiltroVencimento = 'TODOS' | 'HOJE' | 'PROXIMO' | 'ATRASADO';

@Component({
  selector: 'app-vencimentos',
  templateUrl: './vencimentos.page.html',
})
export class VencimentosPage implements OnInit {
  mensalidades: Mensalidade[] = [];
  telefones = new Map<number, string>();
  nomesClientes = new Map<number, string>();
  loading = true;
  busca = '';
  filtro: FiltroVencimento = 'TODOS';
  pagina = 1;
  readonly porPagina = 10;

  readonly opcoesFiltro: { valor: FiltroVencimento; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'HOJE', rotulo: 'Hoje' },
    { valor: 'PROXIMO', rotulo: 'Próximos' },
    { valor: 'ATRASADO', rotulo: 'Atrasados' },
  ];

  constructor(
    private mensalidadeService: MensalidadeService,
    private clienteService: ClienteService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService,
    private toast: ToastService
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
    this.carregar();
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
        this.telefones = criarMapaTelefones(clientes);
        this.nomesClientes = new Map(clientes.map((c) => [c.id, c.nome]));
        this.mensalidades = mensalidades
          .filter((m) => m.status === 'PENDENTE')
          .sort(
            (a, b) =>
              new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
          );
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get mensalidadesFiltradas(): Mensalidade[] {
    const termo = this.busca.toLowerCase().trim();

    return this.mensalidades.filter((m) => {
      const matchBusca =
        !termo || m.cliente?.nome?.toLowerCase().includes(termo);

      if (this.filtro === 'TODOS') return matchBusca;

      const dias = calcularDias(m.vencimento);
      if (this.filtro === 'ATRASADO') return matchBusca && dias < 0;
      if (this.filtro === 'HOJE') return matchBusca && dias === 0;
      if (this.filtro === 'PROXIMO') {
        return matchBusca && dias > 0 && dias <= this.diasAntecedencia;
      }

      return matchBusca;
    });
  }

  get paginadas(): Mensalidade[] {
    const inicio = (this.pagina - 1) * this.porPagina;
    return this.mensalidadesFiltradas.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.mensalidadesFiltradas.length / this.porPagina));
  }

  get totalPendente(): string {
    const v = this.mensalidades.reduce((t, m) => t + m.valor, 0);
    return formatarValor(v);
  }

  get vencemHoje(): number {
    return this.mensalidades.filter((m) => calcularDias(m.vencimento) === 0).length;
  }

  get atrasados(): number {
    return this.mensalidades.filter((m) => calcularDias(m.vencimento) < 0).length;
  }

  statusLabel(m: Mensalidade): string {
    return rotuloDiasCobrancaDiaria(calcularDias(m.vencimento)).toUpperCase();
  }

  definirFiltro(valor: FiltroVencimento): void {
    this.filtro = valor;
    this.pagina = 1;
  }

  contagemFiltro(valor: FiltroVencimento): number {
    if (valor === 'TODOS') {
      return this.mensalidades.length;
    }

    return this.mensalidades.filter((m) => {
      const dias = calcularDias(m.vencimento);
      if (valor === 'ATRASADO') return dias < 0;
      if (valor === 'HOJE') return dias === 0;
      if (valor === 'PROXIMO') return dias > 0 && dias <= this.diasAntecedencia;
      return false;
    }).length;
  }

  get temFiltrosAtivos(): boolean {
    return this.busca.trim().length > 0 || this.filtro !== 'TODOS';
  }

  limparFiltros(): void {
    this.busca = '';
    this.filtro = 'TODOS';
    this.pagina = 1;
  }

  classesChipStatus(filtro: FiltroVencimento): Record<string, boolean> {
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

    if (filtro === 'PROXIMO') {
      return {
        'border-amber-500': true,
        'bg-amber-600/15': true,
        'text-amber-200': true,
        'shadow-sm': true,
        'shadow-amber-900/20': true,
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

  classesChipContagem(filtro: FiltroVencimento): Record<string, boolean> {
    const ativo = this.filtro === filtro;

    if (!ativo) {
      return { 'bg-slate-700/80': true };
    }

    return {
      'bg-violet-500/25': filtro === 'TODOS',
      'bg-red-500/25': filtro === 'HOJE' || filtro === 'ATRASADO',
      'bg-amber-500/25': filtro === 'PROXIMO',
    };
  }

  telefone(m: Mensalidade): string {
    return resolverTelefoneCliente(m, this.telefones);
  }

  mensagem(m: Mensalidade): string {
    return montarMensagemCobrancaMensalidade(
      m,
      this.configuracao,
      this.nomesClientes
    );
  }

  mensagemBloqueio(m: Mensalidade): string {
    return montarMensagemBloqueioMensalidade(
      m,
      this.configuracao,
      this.nomesClientes
    );
  }

  async pagar(m: Mensalidade): Promise<void> {
    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    this.mensalidadeService.registrarPagamento(m.id, pagoEm).subscribe({
      next: (resultado) => {
        void oferecerMensagemRenovacao({
          telefone: this.telefone(m),
          nome: nomeClienteMensalidade(m, this.nomesClientes),
          referencia: m.referencia,
          valor: m.valor,
          novoVencimento: resultado.novoVencimento,
          empresa: this.configuracao?.nomeEmpresa ?? 'JPTV',
          templateRenovacao: this.configuracao?.mensagemRenovacao,
        });
        this.carregar(true);
      },
      error: (err) => void this.toast.error(err.message),
    });
  }

  fmtValor = formatarValor;
  fmtData = formatarData;
  trackByMensalidade = trackByMensalidadeId;
  mensalidadeAtrasada = mensalidadeEstaAtrasada;
}
