import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { AlertaOperacional, Configuracao, DashboardResumo } from '../../core/models';
import {
  calcularDias,
  formatarData,
  formatarValor,
} from '../../shared/utils/formatters';
import { DadoFaturamento } from '../../components/dashboard/faturamento-chart.component';
import { resolverDiasAntecedencia } from '../../shared/utils/cobranca-diaria';
import { rotuloUltimoContato } from '../../shared/utils/contato';
import { PullRefreshService } from '../../core/services/pull-refresh.service';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';
import { ToastService } from '../../core/services/toast.service';
import { ApiHealthService } from '../../core/services/api-health.service';
import { oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';
import {
  classesAlertaOperacional,
  iconeAlertaOperacional,
  ordenarAlertasOperacionais,
} from '../../shared/utils/alertas-operacionais.util';

type ProximoVencimentoResumo = DashboardResumo['proximosVencimentos'][number];
type ClienteAtencaoResumo = DashboardResumo['clientesAtencao'][number];

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit, OnDestroy {
  loading = true;
  atualizando = false;
  erroCarregamento = '';
  resumo: DashboardResumo | null = null;
  private readonly destroy$ = new Subject<void>();
  readonly limiteLista = 5;

  totalClientes = 0;
  qtdAtivos = 0;
  qtdAtrasados = 0;
  qtdInativos = 0;
  qtdCortesia = 0;
  recebidoHoje = '';
  recebidoMes = '';
  aReceberEsteMes = '';
  qtdEsteMes = 0;
  vencemHoje = 0;
  faturamentoMensal: DadoFaturamento[] = [];
  proximosVencimentos: ProximoVencimentoResumo[] = [];
  clientesAtencao: ClienteAtencaoResumo[] = [];
  alertas: AlertaOperacional[] = [];

  cobrancaNaoContactados = 0;
  cobrancaContactadosHoje = 0;
  cobrancaTotalElegiveis = 0;
  cobrancaRotinaFeita = false;
  cadastrosIncompletos = 0;
  pagandoMensalidadeId: number | null = null;

  mrr = '';
  arr = '';
  arrRotulo = '';
  ticketMedio = '';
  conexoes = 0;
  novosClientes30d = 0;
  variacaoNovosRotulo = '';
  variacaoNovosPositiva = true;
  vencendoQtd = 0;
  vencendoValor = '';
  cobrancaAtrasadaQtd = 0;
  cobrancaAtrasadaValor = '';
  retencaoPercentual = '';
  churnPercentual = '';
  inadimplenciaPercentual = '';
  ltvEstimado = '';
  permanenciaMediaMeses = '';

  subtituloPagina = '';

  iconeAlerta = iconeAlertaOperacional;
  classesAlerta = classesAlertaOperacional;

  constructor(
    private dashboardService: DashboardService,
    private configuracaoService: ConfiguracaoService,
    private mensalidadeService: MensalidadeService,
    private pagamentoUi: PagamentoUiService,
    private sync: DadosSyncService,
    private toast: ToastService,
    private router: Router,
    private pullRefresh: PullRefreshService,
    private apiHealth: ApiHealthService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  get diasAntecedencia(): number {
    return resolverDiasAntecedencia(this.configuracao);
  }

  get metaMesPercentual(): number {
    if (!this.resumo) return 0;
    const recebido = this.resumo.financeiro.recebidoMes;
    const aReceber = this.resumo.financeiro.aReceberEsteMes;
    const total = recebido + aReceber;
    if (total <= 0) return recebido > 0 ? 100 : 0;
    return Math.min(100, Math.round((recebido / total) * 100));
  }

  get percentualAtivos(): string {
    if (this.totalClientes <= 0) {
      return '0%';
    }

    return `${Math.round((this.qtdAtivos / this.totalClientes) * 100)}%`;
  }

  get rotinaPercentual(): number {
    if (this.cobrancaTotalElegiveis <= 0) {
      return this.cobrancaRotinaFeita ? 100 : 0;
    }
    return Math.min(
      100,
      Math.round(
        (this.cobrancaContactadosHoje / this.cobrancaTotalElegiveis) * 100
      )
    );
  }

  get variacaoFaturamentoRotulo(): string {
    if (this.faturamentoMensal.length < 2) {
      return 'Sem histórico anterior';
    }

    const atual = this.faturamentoMensal[this.faturamentoMensal.length - 1]?.total ?? 0;
    const anterior =
      this.faturamentoMensal[this.faturamentoMensal.length - 2]?.total ?? 0;

    if (anterior <= 0) {
      return atual > 0 ? 'Primeiro mês com receita' : 'Sem receita no período';
    }

    const variacao = Math.round(((atual - anterior) / anterior) * 100);
    const sinal = variacao > 0 ? '+' : '';
    return `${sinal}${variacao}% vs. mês anterior`;
  }

  get variacaoFaturamentoPositiva(): boolean {
    if (this.faturamentoMensal.length < 2) return true;
    const atual = this.faturamentoMensal[this.faturamentoMensal.length - 1]?.total ?? 0;
    const anterior =
      this.faturamentoMensal[this.faturamentoMensal.length - 2]?.total ?? 0;
    return atual >= anterior;
  }

  get alertasVisiveis(): AlertaOperacional[] {
    return ordenarAlertasOperacionais(this.alertas).slice(0, 6);
  }

  get erroHint(): string {
    if (!this.apiHealth.estaOnline()) {
      return 'Confirme se o backend está ativo em http://localhost:3001 (npm run dev na raiz do projeto).';
    }

    return 'A API está online, mas o resumo falhou. Clique em Tentar novamente ou confira o terminal do backend (crm_back).';
  }

  get proximosVencimentosVisiveis(): ProximoVencimentoResumo[] {
    return this.proximosVencimentos.slice(0, this.limiteLista);
  }

  get clientesAtencaoVisiveis(): ClienteAtencaoResumo[] {
    return this.clientesAtencao.slice(0, this.limiteLista);
  }

  get qtdAtencaoAtrasados(): number {
    return this.clientesAtencao.filter((c) => c.status === 'ATRASADO').length;
  }

  get qtdAtencaoInativos(): number {
    return this.clientesAtencao.filter((c) => c.status === 'INATIVO').length;
  }

  ngOnInit(): void {
    this.subtituloPagina = this.montarSubtitulo();
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades', 'dashboard'],
      () => this.carregar(true)
    );
    this.pullRefresh.registrar((concluir) => this.carregar(true, concluir));
  }

  ngOnDestroy(): void {
    this.pullRefresh.limpar();
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar(true);
    }
  }

  carregar(silencioso = false, aoConcluir?: () => void): void {
    if (!silencioso && !this.resumo) {
      this.loading = true;
    } else if (silencioso || this.resumo) {
      this.atualizando = true;
    }
    this.erroCarregamento = '';
    this.apiHealth.verificar();

    this.dashboardService.obterResumo().subscribe({
      next: (resumo) => {
        this.resumo = resumo;
        this.aplicarResumo(resumo);
        this.loading = false;
        this.atualizando = false;
        aoConcluir?.();
      },
      error: (err: Error) => {
        this.loading = false;
        this.atualizando = false;
        this.erroCarregamento =
          err.message?.trim() ||
          'Não foi possível carregar o resumo. Verifique se a API está rodando.';
        if (!silencioso) {
          void this.toast.error(this.erroCarregamento);
        }
        aoConcluir?.();
      },
    });
  }

  abrirAlerta(alerta: AlertaOperacional): void {
    if (alerta.rota) {
      void this.router.navigateByUrl(alerta.rota);
    }
  }

  private aplicarResumo(resumo: DashboardResumo): void {
    this.totalClientes = resumo.clientes.total;
    this.qtdAtivos = resumo.clientes.ativos;
    this.qtdAtrasados = resumo.clientes.atrasados;
    this.qtdInativos = resumo.clientes.inativos;
    this.qtdCortesia = resumo.clientes.cortesia ?? 0;
    this.recebidoHoje = formatarValor(resumo.financeiro.recebidoHoje ?? 0);
    this.recebidoMes = formatarValor(resumo.financeiro.recebidoMes);
    this.aReceberEsteMes = formatarValor(resumo.financeiro.aReceberEsteMes);
    this.qtdEsteMes = resumo.financeiro.qtdEsteMes;
    this.vencemHoje = resumo.financeiro.vencemHoje;
    this.faturamentoMensal = resumo.faturamentoMensal;
    this.proximosVencimentos = resumo.proximosVencimentos;
    this.clientesAtencao = resumo.clientesAtencao;
    this.alertas = resumo.alertas ?? [];

    this.cobrancaNaoContactados = resumo.cobrancaDiaria.naoContactados;
    this.cobrancaContactadosHoje = resumo.cobrancaDiaria.contactadosHoje;
    this.cobrancaTotalElegiveis = resumo.cobrancaDiaria.totalElegiveis;
    this.cobrancaRotinaFeita = resumo.cobrancaDiaria.rotinaFeita;
    this.cadastrosIncompletos = resumo.clientes.cadastrosIncompletos;

    const m = resumo.metricas;
    this.mrr = formatarValor(m.mrr);
    const mesesRestantes =
      m.arrMesesRestantes ?? 12 - new Date().getMonth();
    const anoArr = m.arrAno ?? new Date().getFullYear();
    this.arr = formatarValor(m.arr ?? m.mrr * mesesRestantes);
    this.arrRotulo = `Até dez/${anoArr} · ${mesesRestantes} mes(es)`;
    this.ticketMedio = formatarValor(m.ticketMedio);
    this.conexoes = m.conexoes;
    this.novosClientes30d = m.novosClientes30d;
    this.variacaoNovosPositiva = m.variacaoNovosClientes >= 0;
    const sinalNovos = m.variacaoNovosClientes > 0 ? '+' : '';
    this.variacaoNovosRotulo = `${sinalNovos}${m.variacaoNovosClientes}% vs. 30d ant.`;
    this.vencendoQtd = m.vencendoQtd;
    this.vencendoValor = formatarValor(m.vencendoValor);
    this.cobrancaAtrasadaQtd = m.cobrancaAtrasadaQtd;
    this.cobrancaAtrasadaValor = formatarValor(m.cobrancaAtrasadaValor);
    this.retencaoPercentual = `${m.retencaoPercentual}%`;
    this.churnPercentual = `${m.churnPercentual}%`;
    this.inadimplenciaPercentual = `${m.inadimplenciaPercentual}%`;
    this.ltvEstimado = formatarValor(m.ltvEstimado);
    this.permanenciaMediaMeses = `${m.permanenciaMediaMeses} meses`;
  }

  async quitarCliente(cliente: ClienteAtencaoResumo): Promise<void> {
    if (!cliente.mensalidadePendenteId) {
      void this.toast.warning('Este cliente não possui mensalidade pendente.');
      return;
    }

    if (this.pagandoMensalidadeId !== null) {
      return;
    }

    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) {
      return;
    }

    const mensalidadeId = cliente.mensalidadePendenteId;
    this.pagandoMensalidadeId = mensalidadeId;

    this.mensalidadeService.registrarPagamento(mensalidadeId, pagoEm).subscribe({
      next: (resultado) => {
        this.pagandoMensalidadeId = null;
        void oferecerMensagemRenovacao({
          telefone: cliente.telefone,
          nome: cliente.nome,
          referencia: cliente.mensalidadeReferencia ?? '',
          valor: resultado.valorRenovacao ?? cliente.mensalidadeValor ?? 0,
          novoVencimento: resultado.novoVencimento,
          empresa: this.configuracao?.nomeEmpresa ?? 'JPTV',
          templateRenovacao: this.configuracao?.mensagemRenovacao,
        });
        void this.toast.success('Pagamento registrado.');
        this.carregar(true);
      },
      error: (err: Error) => {
        this.pagandoMensalidadeId = null;
        void this.toast.error(err.message);
      },
    });
  }

  estaPagando(cliente: ClienteAtencaoResumo): boolean {
    return (
      cliente.mensalidadePendenteId !== null &&
      this.pagandoMensalidadeId === cliente.mensalidadePendenteId
    );
  }

  private montarSubtitulo(): string {
    const hoje = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `Resumo de ${hoje}`;
  }

  rotuloExpiracao(expiraEm?: string | null): string {
    if (!expiraEm) return 'Sem data de vencimento';

    const dias = calcularDias(expiraEm);
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Vence amanhã';
    if (dias > 0) return `Vence em ${dias} dia(s)`;
    if (dias === -1) return 'Venceu ontem';
    return `Venceu há ${Math.abs(dias)} dia(s)`;
  }

  rotuloVencimento(vencimento: string): string {
    const dias = calcularDias(vencimento);
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Amanhã';
    if (dias > 0) return `Em ${dias} dias`;
    return `${Math.abs(dias)} dia(s) atrasado`;
  }

  rotuloContato(ultimoContatoEm?: string | null): string {
    return rotuloUltimoContato(ultimoContatoEm);
  }

  fmtData = formatarData;
  fmtValor = formatarValor;
}
