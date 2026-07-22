import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { RenovacaoMensalidadeService } from '../../core/services/renovacao-mensalidade.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiHealthService } from '../../core/services/api-health.service';
import { textoHintDashboardApiOffline } from '../../shared/utils/api-endereco';
import { AlertaOperacional, Configuracao, DashboardResumo } from '../../core/models';
import {
  calcularDias,
  dataIsoParaDateUtc,
  formatarData,
  formatarValor,
} from '../../shared/utils/formatters';
import {
  resolverDiasAntecedencia,
  JANELA_PROXIMOS_VENCIMENTOS_DIAS,
  sincronizarResumoDashboardRotina,
} from '../../shared/utils/cobranca-diaria';
import {
  META_NOVOS_CLIENTES_QTD_PADRAO,
  resolverDatasMetaNovosClientes,
  rotuloJanelaMetaNovosClientes,
} from '../../shared/utils/meta-novos-clientes.util';
import { rotuloUltimoContato } from '../../shared/utils/contato';
import { montarMensagemBloqueioMensalidade } from '../../shared/utils/cobranca-lote';
import { Mensalidade } from '../../core/models';
import { PullRefreshService } from '../../core/services/pull-refresh.service';
import { vincularSincronizacaoPagina, DOMINIOS_SYNC_OPERACAO } from '../../shared/utils/page-sync.util';
import {
  classesAlertaOperacional,
  iconeAlertaOperacional,
  ordenarAlertasOperacionais,
} from '../../shared/utils/alertas-operacionais.util';
import {
  ResumoEtapaFunil,
  classeBadgeTipoFunil,
} from '../../shared/utils/funil-cobranca.util';
import { PontoDisparoAutomacao } from '../../shared/utils/automacao-disparo';
import {
  rotuloPrazoTarefa,
  formatarDataTarefa,
} from '../../shared/utils/tarefa.util';

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
  qtdSomenteContato = 0;
  recebidoHoje = '';
  recebidoMes = '';
  aReceberEsteMes = '';
  qtdEsteMes = 0;
  vencemHoje = 0;
  proximosVencimentos: ProximoVencimentoResumo[] = [];
  clientesAtencao: ClienteAtencaoResumo[] = [];
  alertas: AlertaOperacional[] = [];

  cobrancaNaoContactados = 0;
  cobrancaContactadosHoje = 0;
  cobrancaTotalElegiveis = 0;
  cobrancaRotinaFeita = false;
  etapasFunil: ResumoEtapaFunil[] = [];
  cadastrosIncompletos = 0;
  pagandoMensalidadeId: number | null = null;

  mrr = '';
  arr = '';
  arrRotulo = '';
  ticketMedio = '';
  conexoes = 0;
  metaClientesAtual = 0;
  metaNovosClientesQtd = 0;
  metaNovosClientesInicioEm = '';
  metaNovosClientesFimEm = '';
  metaNovosClientesDiasRestantes = 0;
  metaNovosClientesEncerrada = false;
  metaNovosClientesPercentual = 0;
  metaNovosClientesAtingida = false;
  vencendoQtd = 0;
  vencendoValor = '';
  cobrancaAtrasadaQtd = 0;
  cobrancaAtrasadaValor = '';
  retencaoPercentual = '';
  churnPercentual = '';
  inadimplenciaPercentual = '';
  ganhosProximoAno = '';
  ganhosProximoAnoRotulo = '';
  totalCustosMensal = '';
  margemEstimada = '';
  margemPercentual = '';

  tarefasPendentes = 0;
  tarefasHoje = 0;
  tarefasAtrasadas = 0;
  tarefasProximas: DashboardResumo['tarefas']['proximas'] = [];

  iconeAlerta = iconeAlertaOperacional;
  classesAlerta = classesAlertaOperacional;
  classeBadgeFunil = classeBadgeTipoFunil;

  constructor(
    private dashboardService: DashboardService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private renovacao: RenovacaoMensalidadeService,
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

  get diasProximosVencimentos(): number {
    return JANELA_PROXIMOS_VENCIMENTOS_DIAS;
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

  get metaNovosClientesRotulo(): string {
    const janela = rotuloJanelaMetaNovosClientes(
      this.metaNovosClientesInicioEm,
      this.metaNovosClientesFimEm
    );

    if (this.metaNovosClientesAtingida) {
      return `Meta atingida · ${janela}`;
    }

    if (this.metaNovosClientesEncerrada) {
      return janela;
    }

    const faltam = Math.max(0, this.metaNovosClientesQtd - this.metaClientesAtual);
    const rotuloFaltam = faltam === 1 ? 'Falta 1' : `Faltam ${faltam}`;

    return `${rotuloFaltam} · ${janela}`;
  }

  get metaNovosClientesStatusRotulo(): string {
    if (this.metaNovosClientesAtingida) {
      return 'Meta atingida';
    }

    if (this.metaNovosClientesEncerrada) {
      return 'Prazo encerrado';
    }

    return 'Em andamento';
  }

  get classeStatusMeta(): string {
    if (this.metaNovosClientesAtingida) {
      return 'crm-dash-meta-chip--atingida';
    }

    if (this.metaNovosClientesEncerrada) {
      return 'crm-dash-meta-chip--encerrada';
    }

    return 'crm-dash-meta-chip--ativa';
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

  get alertasVisiveis(): AlertaOperacional[] {
    return ordenarAlertasOperacionais(this.alertas).slice(0, 6);
  }

  get erroHint(): string {
    if (!this.apiHealth.estaOnline()) {
      return textoHintDashboardApiOffline();
    }

    return 'A API está online, mas o resumo falhou. Clique em Tentar novamente ou confira o terminal do backend (crm_back).';
  }

  get proximosVencimentosVisiveis(): ProximoVencimentoResumo[] {
    return this.proximosVencimentos.slice(0, this.limiteLista);
  }

  get clientesAtencaoVisiveis(): ClienteAtencaoResumo[] {
    return this.clientesAtencao.slice(0, this.limiteLista);
  }

  get tarefasProximasVisiveis(): DashboardResumo['tarefas']['proximas'] {
    return this.tarefasProximas.slice(0, this.limiteLista);
  }

  rotuloPrazoTarefa = rotuloPrazoTarefa;
  formatarDataTarefa = formatarDataTarefa;

  queryParamsCobrancaEtapa(etapa: ResumoEtapaFunil): Record<string, string | number> {
    const params: Record<string, string | number> = { etapa: etapa.ponto };
    if (etapa.pendentes > 0) {
      params['pendentes'] = 1;
    }
    return params;
  }

  get qtdAtencaoAtrasados(): number {
    return this.clientesAtencao.filter((c) => c.status === 'ATRASADO').length;
  }

  ngOnInit(): void {
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_OPERACAO,
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

    forkJoin({
      resumo: this.dashboardService.obterResumo(),
      mensalidades: this.mensalidadeService.listar(),
    }).subscribe({
      next: ({ resumo, mensalidades }) => {
        const sincronizado = sincronizarResumoDashboardRotina(resumo, mensalidades);
        this.resumo = sincronizado;
        this.aplicarResumo(sincronizado);
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
    this.qtdSomenteContato = resumo.clientes.somenteContato ?? 0;
    this.recebidoHoje = formatarValor(resumo.financeiro.recebidoHoje ?? 0);
    this.recebidoMes = formatarValor(resumo.financeiro.recebidoMes);
    this.aReceberEsteMes = formatarValor(resumo.financeiro.aReceberEsteMes);
    this.qtdEsteMes = resumo.financeiro.qtdEsteMes;
    this.vencemHoje = resumo.financeiro.vencemHoje;
    this.proximosVencimentos = resumo.proximosVencimentos;
    this.clientesAtencao = resumo.clientesAtencao;
    this.alertas = resumo.alertas ?? [];
    this.tarefasPendentes = resumo.tarefas?.pendentes ?? 0;
    this.tarefasHoje = resumo.tarefas?.hoje ?? 0;
    this.tarefasAtrasadas = resumo.tarefas?.atrasadas ?? 0;
    this.tarefasProximas = resumo.tarefas?.proximas ?? [];

    this.cobrancaNaoContactados = resumo.cobrancaDiaria.naoContactados;
    this.cobrancaContactadosHoje = resumo.cobrancaDiaria.contactadosHoje;
    this.cobrancaTotalElegiveis = resumo.cobrancaDiaria.totalElegiveis;
    this.cobrancaRotinaFeita = resumo.cobrancaDiaria.rotinaFeita;
    this.etapasFunil = (resumo.cobrancaDiaria.etapasFunil ?? []).map((etapa) => ({
      ponto: etapa.ponto as PontoDisparoAutomacao,
      rotulo: etapa.rotulo,
      tipo: etapa.tipo,
      total: etapa.total,
      contactadosHoje: etapa.contactadosHoje,
      pendentes: etapa.pendentes,
    }));
    this.cadastrosIncompletos = resumo.clientes.cadastrosIncompletos;

    const m = resumo.metricas;
    const metaDatas = resolverDatasMetaNovosClientes(
      m.metaNovosClientesInicioEm,
      m.metaNovosClientesFimEm
    );

    this.mrr = formatarValor(m.mrr ?? 0);
    const mesesRestantes =
      m.arrMesesRestantes ?? 12 - new Date().getMonth();
    const anoArr = m.arrAno ?? new Date().getFullYear();
    this.arr = formatarValor(m.arr ?? (m.mrr ?? 0) * mesesRestantes);
    this.arrRotulo = `Até dez/${anoArr} · ${mesesRestantes} mes(es)`;
    this.ticketMedio = formatarValor(m.ticketMedio ?? 0);
    this.conexoes = m.conexoes ?? 0;
    this.metaClientesAtual =
      typeof m.metaClientesAtual === 'number'
        ? m.metaClientesAtual
        : Math.max(
            0,
            this.totalClientes - this.qtdCortesia - this.qtdSomenteContato
          );
    this.metaNovosClientesQtd =
      m.metaNovosClientesQtd ?? META_NOVOS_CLIENTES_QTD_PADRAO;
    this.metaNovosClientesInicioEm = metaDatas.inicioEm;
    this.metaNovosClientesFimEm = metaDatas.fimEm;
    this.metaNovosClientesDiasRestantes = m.metaNovosClientesDiasRestantes ?? 0;
    this.metaNovosClientesEncerrada = m.metaNovosClientesEncerrada ?? false;
    this.metaNovosClientesPercentual = m.metaNovosClientesPercentual ?? 0;
    this.metaNovosClientesAtingida = m.metaNovosClientesAtingida ?? false;
    this.vencendoQtd = m.vencendoQtd ?? 0;
    this.vencendoValor = formatarValor(m.vencendoValor ?? 0);
    this.cobrancaAtrasadaQtd = m.cobrancaAtrasadaQtd ?? 0;
    this.cobrancaAtrasadaValor = formatarValor(m.cobrancaAtrasadaValor ?? 0);
    this.retencaoPercentual = `${m.retencaoPercentual ?? 0}%`;
    this.churnPercentual = `${m.churnPercentual ?? 0}%`;
    this.inadimplenciaPercentual = `${m.inadimplenciaPercentual ?? 0}%`;
    this.ganhosProximoAno = formatarValor(m.ganhosProximoAno ?? 0);
    this.ganhosProximoAnoRotulo = `jan–dez/${m.ganhosProximoAnoAno ?? new Date().getFullYear() + 1} · MRR × 12`;
    this.totalCustosMensal = formatarValor(m.totalCustosMensal ?? 0);
    this.margemEstimada = formatarValor(m.margemEstimada ?? 0);
    this.margemPercentual = `${m.margemPercentual ?? 0}%`;
  }

  async renovarCliente(cliente: ClienteAtencaoResumo): Promise<void> {
    if (!cliente.mensalidadePendenteId) {
      void this.toast.warning('Este cliente não possui mensalidade pendente.');
      return;
    }

    if (this.pagandoMensalidadeId !== null) {
      return;
    }

    const mensalidadeId = cliente.mensalidadePendenteId;
    this.pagandoMensalidadeId = mensalidadeId;

    const ok = await this.renovacao.registrarRenovacao({
      mensalidadeId,
      clienteId: cliente.id,
      telefone: cliente.telefone,
      nome: cliente.nome,
      referencia: cliente.mensalidadeReferencia ?? '',
      valorFallback: cliente.mensalidadeValor ?? 0,
    });

    this.pagandoMensalidadeId = null;
    if (ok) {
      this.carregar(true);
    }
  }

  estaPagando(cliente: ClienteAtencaoResumo): boolean {
    return (
      cliente.mensalidadePendenteId !== null &&
      this.pagandoMensalidadeId === cliente.mensalidadePendenteId
    );
  }

  podeAvisarBloqueio(cliente: ClienteAtencaoResumo): boolean {
    return (
      cliente.mensalidadePendenteId !== null &&
      !!cliente.mensalidadeVencimento &&
      calcularDias(cliente.mensalidadeVencimento) < 0
    );
  }

  mensagemBloqueio(cliente: ClienteAtencaoResumo): string {
    return montarMensagemBloqueioMensalidade(
      this.mensalidadeAtencao(cliente),
      this.configuracao,
      undefined,
      cliente.nome
    );
  }

  onBloqueioRegistrado(evento: {
    mensalidadeId: number;
    bloqueioEnviadoEm: string;
  }): void {
    this.clientesAtencao = this.clientesAtencao.map((c) =>
      c.mensalidadePendenteId === evento.mensalidadeId
        ? { ...c, bloqueioEnviadoEm: evento.bloqueioEnviadoEm }
        : c
    );
  }

  private mensalidadeAtencao(cliente: ClienteAtencaoResumo): Mensalidade {
    return {
      id: cliente.mensalidadePendenteId!,
      clienteId: cliente.id,
      referencia: cliente.mensalidadeReferencia ?? '',
      valor: cliente.mensalidadeValor ?? 0,
      vencimento: cliente.mensalidadeVencimento!,
      status: 'PENDENTE',
      bloqueioEnviadoEm: cliente.bloqueioEnviadoEm ?? null,
    };
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

  metaAtencao(cliente: ClienteAtencaoResumo): string {
    const partes = [cliente.telefone];

    if (cliente.mensalidadeReferencia && cliente.mensalidadeValor != null) {
      partes.push(
        `${cliente.mensalidadeReferencia} · ${formatarValor(cliente.mensalidadeValor)}`
      );
    }

    return partes.filter(Boolean).join(' · ');
  }

  rotuloPrazoAtencao(cliente: ClienteAtencaoResumo): string {
    if (cliente.status === 'INATIVO') {
      return 'Inativo';
    }

    if (!cliente.expiraEm) {
      return 'Sem data';
    }

    const dias = calcularDias(cliente.expiraEm);
    if (dias === 0) {
      return 'Vence hoje';
    }
    if (dias === 1) {
      return 'Amanhã';
    }
    if (dias > 0) {
      return `Em ${dias} dias`;
    }

    return `${Math.abs(dias)} dia(s) atrasado`;
  }

  classeAtencaoItem(cliente: ClienteAtencaoResumo): string {
    if (cliente.status === 'INATIVO') {
      return 'crm-dash-vencimento--inativo';
    }

    return 'crm-dash-vencimento--atrasado';
  }

  partesDataExpiracao(expiraEm?: string | null): { dia: string; mes: string } {
    if (!expiraEm) {
      return { dia: '—', mes: 'SEM' };
    }

    return this.partesDataVencimento(expiraEm);
  }

  classeVencimentoItem(vencimento: string): string {
    const dias = calcularDias(vencimento);
    if (dias <= 0) return 'crm-dash-vencimento--hoje';
    if (dias === 1) return 'crm-dash-vencimento--amanha';
    if (dias <= 3) return 'crm-dash-vencimento--breve';
    return 'crm-dash-vencimento--normal';
  }

  partesDataVencimento(vencimento: string): { dia: string; mes: string } {
    const data = dataIsoParaDateUtc(vencimento);
    const dia = data.getUTCDate().toString().padStart(2, '0');
    const mes = data
      .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
      .replace('.', '')
      .toUpperCase();

    return { dia, mes };
  }

  fmtData = formatarData;
  fmtValor = formatarValor;
}
