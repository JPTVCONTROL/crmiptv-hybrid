import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { Configuracao, DashboardResumo } from '../../core/models';
import {
  calcularDias,
  formatarData,
  formatarValor,
} from '../../shared/utils/formatters';
import { DadoFaturamento } from '../../components/dashboard/faturamento-chart.component';
import { resolverDiasAntecedencia } from '../../shared/utils/cobranca-diaria';
import { rotuloUltimoContato } from '../../shared/utils/contato';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';
import { ToastService } from '../../core/services/toast.service';
import { oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';

type ProximoVencimentoResumo = DashboardResumo['proximosVencimentos'][number];
type ClienteAtencaoResumo = DashboardResumo['clientesAtencao'][number];

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit, OnDestroy {
  loading = true;
  erroCarregamento = '';
  resumo: DashboardResumo | null = null;
  private readonly destroy$ = new Subject<void>();

  totalClientes = 0;
  qtdAtivos = 0;
  qtdAtrasados = 0;
  qtdInativos = 0;
  recebidoMes = '';
  aReceberEsteMes = '';
  qtdEsteMes = 0;
  aReceberProximosMeses = '';
  qtdProximosMeses = 0;
  vencemHoje = 0;
  faturamentoMensal: DadoFaturamento[] = [];
  proximosVencimentos: ProximoVencimentoResumo[] = [];
  clientesAtencao: ClienteAtencaoResumo[] = [];

  cobrancaNaoContactados = 0;
  cobrancaContactadosHoje = 0;
  cobrancaTotalElegiveis = 0;
  cobrancaRotinaFeita = false;
  cadastrosIncompletos = 0;
  pagandoMensalidadeId: number | null = null;

  subtituloPagina = '';

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

  get qtdAtencaoAtrasados(): number {
    return this.clientesAtencao.filter((c) => c.status === 'ATRASADO').length;
  }

  get qtdAtencaoInativos(): number {
    return this.clientesAtencao.filter((c) => c.status === 'INATIVO').length;
  }

  constructor(
    private dashboardService: DashboardService,
    private configuracaoService: ConfiguracaoService,
    private mensalidadeService: MensalidadeService,
    private pagamentoUi: PagamentoUiService,
    private sync: DadosSyncService,
    private toast: ToastService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
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
    this.erroCarregamento = '';

    this.dashboardService.obterResumo().subscribe({
      next: (resumo) => {
        this.resumo = resumo;
        this.aplicarResumo(resumo);
        this.loading = false;
      },
      error: (err: Error) => {
        this.loading = false;
        this.erroCarregamento =
          err.message?.trim() ||
          'Não foi possível carregar o resumo. Verifique se a API está rodando.';
        if (!silencioso) {
          void this.toast.error(this.erroCarregamento);
        }
      },
    });
  }

  private aplicarResumo(resumo: DashboardResumo): void {
    this.totalClientes = resumo.clientes.total;
    this.qtdAtivos = resumo.clientes.ativos;
    this.qtdAtrasados = resumo.clientes.atrasados;
    this.qtdInativos = resumo.clientes.inativos;
    this.recebidoMes = formatarValor(resumo.financeiro.recebidoMes);
    this.aReceberEsteMes = formatarValor(resumo.financeiro.aReceberEsteMes);
    this.qtdEsteMes = resumo.financeiro.qtdEsteMes;
    this.aReceberProximosMeses = formatarValor(
      resumo.financeiro.aReceberProximosMeses
    );
    this.qtdProximosMeses = resumo.financeiro.qtdProximosMeses;
    this.vencemHoje = resumo.financeiro.vencemHoje;
    this.faturamentoMensal = resumo.faturamentoMensal;
    this.proximosVencimentos = resumo.proximosVencimentos;
    this.clientesAtencao = resumo.clientesAtencao;

    this.cobrancaNaoContactados = resumo.cobrancaDiaria.naoContactados;
    this.cobrancaContactadosHoje = resumo.cobrancaDiaria.contactadosHoje;
    this.cobrancaTotalElegiveis = resumo.cobrancaDiaria.totalElegiveis;
    this.cobrancaRotinaFeita = resumo.cobrancaDiaria.rotinaFeita;
    this.cadastrosIncompletos = resumo.clientes.cadastrosIncompletos;
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
