import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { ClienteService } from '../../core/services/cliente.service';
import { DispositivoService } from '../../core/services/dispositivo.service';
import { PlanoService } from '../../core/services/plano.service';
import { ToastService } from '../../core/services/toast.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { RelatorioService, RelatorioResumoApi } from '../../core/services/relatorio.service';
import { Cliente, Mensalidade } from '../../core/models';
import {
  calcularDias,
  clienteEstaAtivo,
  dataIsoParaDateUtc,
  formatarData,
  formatarValor,
  statusCliente,
} from '../../shared/utils/formatters';
import {
  DadoCatalogoDistribuicao,
  montarDistribuicaoAplicativos,
  montarDistribuicaoDispositivos,
  montarDistribuicaoPlanos,
  totalDistribuicao,
} from '../../shared/utils/relatorio-catalogos';
import {
  ModoRelatorio,
  calcularProjecaoProximoAno,
  calcularResumoAnual,
  calcularResumoMensal,
  faturamentoPorMesNoAno,
  formatarVariacaoPercentual,
  mensalidadeEhCobravel,
} from '../../shared/utils/relatorio-financeiro.util';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_RELATORIOS,
} from '../../shared/utils/page-sync.util';
import { DadoFaturamento } from '../../components/dashboard/faturamento-chart.component';
import {
  EtapaFunilEfetividade,
  calcularEfetividadeFunilPeriodo,
  classeBadgeTipoFunil,
  fimPeriodoRelatorio,
  inicioPeriodoRelatorio,
} from '../../shared/utils/funil-cobranca.util';

interface PagamentoRelatorio {
  id: number;
  clienteId: number;
  clienteNome: string;
  referencia: string;
  valor: number;
  pagoEm: string;
}

interface CobrancaAtrasadaRelatorio {
  id: number;
  clienteId: number;
  clienteNome: string;
  referencia: string;
  valor: number;
  vencimento: string;
  diasAtraso: number;
}

@Component({
  selector: 'app-relatorios',
  templateUrl: './relatorios.page.html',
})
export class RelatoriosPage implements OnInit, OnDestroy {
  loading = true;
  private readonly destroy$ = new Subject<void>();
  clientes: Cliente[] = [];
  mensalidades: Mensalidade[] = [];
  private resumoApi: RelatorioResumoApi | null = null;

  modo: ModoRelatorio = 'MENSAL';
  periodo = this.periodoAtual();
  ano = new Date().getFullYear();

  clientesAtivos = 0;
  clientesAtrasados = 0;
  clientesInativos = 0;

  recebidoPeriodo = '';
  recebidoComparativo = '';
  variacaoRecebido = '';
  variacaoRecebidoPositiva = true;
  qtdPagamentosPeriodo = 0;
  mediaMensalAnual = '';
  melhorMesAnual = '';

  totalPendente = '';
  totalAtrasado = '';
  qtdPendentes = 0;
  qtdAtrasadas = 0;
  taxaInadimplencia = '0%';
  ticketMedio = '';

  faturamentoMensal: DadoFaturamento[] = [];
  faturamentoRecente: DadoFaturamento[] = [];
  faturamentoRecenteUltimoMes = '';
  faturamentoRecenteMedia = '';
  faturamentoRecenteVariacao = '';
  faturamentoRecenteVariacaoPositiva = true;
  faturamentoProjecao: DadoFaturamento[] = [];
  projecaoAno = 0;
  projecaoMrr = '';
  projecaoTotal = '';
  projecaoClientesPagantes = 0;

  ultimosPagamentos: PagamentoRelatorio[] = [];
  todasCobrancasAtrasadas: CobrancaAtrasadaRelatorio[] = [];
  distribuicaoPlanos: DadoCatalogoDistribuicao[] = [];
  distribuicaoAplicativos: DadoCatalogoDistribuicao[] = [];
  distribuicaoDispositivos: DadoCatalogoDistribuicao[] = [];

  etapasFunilEfetividade: EtapaFunilEfetividade[] = [];
  totalContatosFunil = 0;
  readonly classeBadgeFunil = classeBadgeTipoFunil;

  fmtData = formatarData;
  fmtValor = formatarValor;

  constructor(
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private aplicativoService: AplicativoService,
    private planoService: PlanoService,
    private dispositivoService: DispositivoService,
    private toast: ToastService,
    private sync: DadosSyncService,
    private relatorioService: RelatorioService
  ) {}

  ngOnInit(): void {
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_RELATORIOS,
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
      this.clienteService.listar(),
      this.mensalidadeService.listar(),
      this.aplicativoService.listar(),
      this.planoService.listar(),
      this.dispositivoService.listar(),
      this.relatorioService.obterResumo(
        this.modo === 'MENSAL' ? this.periodo : undefined,
        this.modo === 'ANUAL' ? this.ano : Number(this.periodo.split('-')[0])
      ),
    ]).subscribe({
      next: ([clientes, mensalidades, aplicativos, planos, dispositivos, resumoApi]) => {
        this.clientes = clientes;
        this.mensalidades = mensalidades;
        this.resumoApi = resumoApi;
        this.distribuicaoPlanos = montarDistribuicaoPlanos(clientes, planos);
        this.distribuicaoAplicativos = montarDistribuicaoAplicativos(
          clientes,
          aplicativos
        );
        this.distribuicaoDispositivos = montarDistribuicaoDispositivos(
          clientes,
          dispositivos
        );
        this.calcular();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        if (!silencioso) {
          void this.toast.error('Erro ao carregar relatórios.');
        }
      },
    });
  }

  get totalClientesPlanos(): number {
    return totalDistribuicao(this.distribuicaoPlanos);
  }

  get totalClientesAplicativos(): number {
    return totalDistribuicao(this.distribuicaoAplicativos);
  }

  get totalTelasDispositivos(): number {
    return totalDistribuicao(this.distribuicaoDispositivos);
  }

  get rotuloPeriodo(): string {
    if (this.modo === 'ANUAL') {
      return String(this.ano);
    }

    const [ano, mes] = this.periodo.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  get rotuloComparativo(): string {
    return this.modo === 'ANUAL' ? 'Vs. ano anterior' : 'Vs. mês anterior';
  }

  get anosDisponiveis(): number[] {
    const atual = new Date().getFullYear();
    const anos = new Set<number>();

    for (const mensalidade of this.mensalidades) {
      if (mensalidade.status === 'PAGO' && mensalidade.pagoEm) {
        anos.add(dataIsoParaDateUtc(mensalidade.pagoEm).getUTCFullYear());
      }
    }

    anos.add(atual);
    anos.add(atual + 1);

    return Array.from(anos).sort((a, b) => b - a);
  }

  definirModo(modo: ModoRelatorio): void {
    if (this.modo === modo) {
      return;
    }

    this.modo = modo;

    if (modo === 'ANUAL') {
      const [ano] = this.periodo.split('-').map(Number);
      this.ano = ano;
    } else {
      this.periodo = `${this.ano}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    }

    this.atualizarResumoApi();
  }

  recalcular(): void {
    this.atualizarResumoApi();
  }

  private atualizarResumoApi(): void {
    this.relatorioService
      .obterResumo(
        this.modo === 'MENSAL' ? this.periodo : undefined,
        this.modo === 'ANUAL' ? this.ano : Number(this.periodo.split('-')[0])
      )
      .subscribe({
        next: (resumoApi) => {
          this.resumoApi = resumoApi;
          this.calcular();
        },
        error: () => this.calcular(),
      });
  }

  exportarCsv(): void {
    if (this.ultimosPagamentos.length === 0) {
      void this.toast.warning('Nenhum pagamento no período selecionado para exportar.');
      return;
    }

    const linhas = [
      ['Cliente', 'Referência', 'Valor', 'Pago em'].join(';'),
      ...this.ultimosPagamentos.map((p) =>
        [
          `"${p.clienteNome.replace(/"/g, '""')}"`,
          p.referencia,
          p.valor.toFixed(2).replace('.', ','),
          this.fmtData(p.pagoEm),
        ].join(';')
      ),
    ];

    const nomeArquivo =
      this.modo === 'ANUAL'
        ? `pagamentos-${this.ano}.csv`
        : `pagamentos-${this.periodo}.csv`;

    this.baixarCsv(linhas, nomeArquivo);
  }

  exportarCsvAnual(): void {
    if (this.modo !== 'ANUAL') {
      return;
    }

    const linhas = [
      ['Mês', 'Faturamento'].join(';'),
      ...this.faturamentoMensal.map((item) =>
        [item.mes, item.total.toFixed(2).replace('.', ',')].join(';')
      ),
    ];

    this.baixarCsv(linhas, `faturamento-mensal-${this.ano}.csv`);
  }

  exportarCsvInadimplentes(): void {
    if (this.todasCobrancasAtrasadas.length === 0) {
      void this.toast.warning('Nenhuma cobrança atrasada para exportar.');
      return;
    }

    const linhas = [
      ['Cliente', 'Referência', 'Valor', 'Vencimento', 'Dias atraso'].join(';'),
      ...this.todasCobrancasAtrasadas.map((item) =>
        [
          `"${item.clienteNome.replace(/"/g, '""')}"`,
          item.referencia,
          item.valor.toFixed(2).replace('.', ','),
          this.fmtData(item.vencimento),
          item.diasAtraso.toString(),
        ].join(';')
      ),
    ];

    this.baixarCsv(linhas, `inadimplentes-${this.periodoAtual()}.csv`);
  }

  private periodoAtual(): string {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }

  private baixarCsv(linhas: string[], nomeArquivo: string): void {
    const blob = new Blob(['\uFEFF' + linhas.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  private calcular(): void {
    this.clientesAtivos = this.clientes.filter((c) =>
      clienteEstaAtivo(c.expiraEm)
    ).length;
    this.clientesAtrasados = this.clientes.filter(
      (c) => statusCliente(c.expiraEm) === 'ATRASADO'
    ).length;
    this.clientesInativos = this.clientes.filter(
      (c) => statusCliente(c.expiraEm) === 'INATIVO'
    ).length;

    const pendentes = this.mensalidades.filter(
      (m) => m.status === 'PENDENTE' && mensalidadeEhCobravel(m)
    );

    const pendenteValor = pendentes.reduce((t, m) => t + m.valor, 0);
    const atrasadas = pendentes.filter((m) => calcularDias(m.vencimento) < 0);
    const atrasadoValor = atrasadas.reduce((t, m) => t + m.valor, 0);

    this.totalPendente = formatarValor(pendenteValor);
    this.totalAtrasado = formatarValor(atrasadoValor);
    this.qtdPendentes = pendentes.length;
    this.qtdAtrasadas = atrasadas.length;

    const taxa = pendentes.length
      ? ((atrasadas.length / pendentes.length) * 100).toFixed(1)
      : '0';
    this.taxaInadimplencia = `${taxa}%`;

    this.ticketMedio = pendentes.length
      ? formatarValor(pendenteValor / pendentes.length)
      : formatarValor(0);

    const inicioFunil = inicioPeriodoRelatorio(this.modo, this.periodo, this.ano);
    const fimFunil = fimPeriodoRelatorio(this.modo, this.periodo, this.ano);
    this.etapasFunilEfetividade = calcularEfetividadeFunilPeriodo(
      this.mensalidades,
      inicioFunil,
      fimFunil
    );
    this.totalContatosFunil = this.etapasFunilEfetividade.reduce(
      (total, etapa) => total + etapa.contatos,
      0
    );

    this.todasCobrancasAtrasadas = this.montarCobrancasAtrasadas(pendentes);

    if (this.resumoApi?.projecaoProximoAno) {
      const projecao = this.resumoApi.projecaoProximoAno;
      this.projecaoAno = projecao.ano;
      this.projecaoMrr = formatarValor(projecao.mrr);
      this.projecaoTotal = formatarValor(projecao.totalEsperado);
      this.projecaoClientesPagantes = projecao.clientesPagantes;
      this.faturamentoProjecao = projecao.faturamentoMensal;
    } else {
      const projecao = calcularProjecaoProximoAno(this.clientes);
      this.projecaoAno = projecao.ano;
      this.projecaoMrr = formatarValor(projecao.mrr);
      this.projecaoTotal = formatarValor(projecao.totalEsperado);
      this.projecaoClientesPagantes = projecao.clientesPagantes;
      this.faturamentoProjecao = projecao.faturamentoMensal;
    }

    if (this.modo === 'ANUAL') {
      this.calcularModoAnual();
    } else {
      this.calcularModoMensal();
    }

    this.montarFaturamentoRecente();
  }

  private montarFaturamentoRecente(): void {
    const MESES = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const hoje = new Date();
    const faturamentoRecente: DadoFaturamento[] = [];

    for (let i = 5; i >= 0; i--) {
      const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const rotulo = `${MESES[referencia.getMonth()]}/${String(referencia.getFullYear()).slice(-2)}`;
      const total = this.mensalidades
        .filter((mensalidade) => {
          if (mensalidade.status !== 'PAGO' || !mensalidade.pagoEm) {
            return false;
          }

          const pago = dataIsoParaDateUtc(mensalidade.pagoEm);
          return (
            pago.getUTCMonth() === referencia.getMonth() &&
            pago.getUTCFullYear() === referencia.getFullYear()
          );
        })
        .reduce((acc, mensalidade) => acc + mensalidade.valor, 0);

      faturamentoRecente.push({ mes: rotulo, total });
    }

    this.faturamentoRecente = faturamentoRecente;

    const ultimo = faturamentoRecente[faturamentoRecente.length - 1]?.total ?? 0;
    const anterior = faturamentoRecente[faturamentoRecente.length - 2]?.total ?? 0;
    const soma = faturamentoRecente.reduce((acc, item) => acc + item.total, 0);

    this.faturamentoRecenteUltimoMes = formatarValor(ultimo);
    this.faturamentoRecenteMedia = formatarValor(soma / 6);

    if (faturamentoRecente.length < 2 || anterior <= 0) {
      this.faturamentoRecenteVariacao =
        ultimo > 0 ? 'Primeiro mês com receita' : 'Sem receita no último mês';
      this.faturamentoRecenteVariacaoPositiva = ultimo >= anterior;
      return;
    }

    const variacao = Math.round(((ultimo - anterior) / anterior) * 100);
    const sinal = variacao > 0 ? '+' : '';
    this.faturamentoRecenteVariacao = `${sinal}${variacao}% vs. mês anterior`;
    this.faturamentoRecenteVariacaoPositiva = ultimo >= anterior;
  }

  private calcularModoMensal(): void {
    const resumoApi = this.resumoApi?.resumoMensal;
    const [ano] = this.periodo.split('-').map(Number);

    if (resumoApi) {
      this.recebidoPeriodo = formatarValor(resumoApi.recebido);
      this.recebidoComparativo = formatarValor(resumoApi.recebidoMesAnterior);
      this.qtdPagamentosPeriodo = resumoApi.qtdPagamentos;
      this.variacaoRecebidoPositiva = resumoApi.variacaoPercentual >= 0;
      this.variacaoRecebido = formatarVariacaoPercentual(resumoApi.variacaoPercentual);
    } else {
      const resumo = calcularResumoMensal(this.mensalidades, this.periodo);
      this.recebidoPeriodo = formatarValor(resumo.recebido);
      this.recebidoComparativo = formatarValor(resumo.recebidoMesAnterior);
      this.qtdPagamentosPeriodo = resumo.qtdPagamentos;
      this.variacaoRecebidoPositiva = resumo.variacaoPercentual >= 0;
      this.variacaoRecebido = formatarVariacaoPercentual(resumo.variacaoPercentual);
    }

    this.mediaMensalAnual = '';
    this.melhorMesAnual = '';
    this.faturamentoMensal =
      this.resumoApi?.resumoAnual.faturamentoMensal ??
      faturamentoPorMesNoAno(this.mensalidades, ano);

    const pagosPeriodo = this.mensalidades.filter(
      (m) => m.status === 'PAGO' && this.estaNoPeriodo(m.pagoEm)
    );
    this.ultimosPagamentos = this.montarPagamentosPeriodo(pagosPeriodo);
  }

  private calcularModoAnual(): void {
    const resumoApi = this.resumoApi?.resumoAnual;

    if (resumoApi) {
      this.recebidoPeriodo = formatarValor(resumoApi.recebido);
      this.recebidoComparativo = formatarValor(resumoApi.recebidoAnoAnterior);
      this.variacaoRecebidoPositiva = resumoApi.variacaoPercentual >= 0;
      this.variacaoRecebido = formatarVariacaoPercentual(resumoApi.variacaoPercentual);
      this.mediaMensalAnual = formatarValor(resumoApi.mediaMensal);
      this.faturamentoMensal = resumoApi.faturamentoMensal;

      const melhor = [...resumoApi.faturamentoMensal].sort((a, b) => b.total - a.total)[0];
      this.melhorMesAnual = melhor
        ? `${melhor.mes} · ${formatarValor(melhor.total)}`
        : '—';

      this.qtdPagamentosPeriodo = this.mensalidades.filter(
        (m) =>
          m.status === 'PAGO' &&
          m.pagoEm &&
          dataIsoParaDateUtc(m.pagoEm).getUTCFullYear() === this.ano
      ).length;
    } else {
      const resumo = calcularResumoAnual(this.mensalidades, this.ano);
      this.recebidoPeriodo = formatarValor(resumo.recebido);
      this.recebidoComparativo = formatarValor(resumo.recebidoAnoAnterior);
      this.qtdPagamentosPeriodo = resumo.qtdPagamentos;
      this.variacaoRecebidoPositiva = resumo.variacaoPercentual >= 0;
      this.variacaoRecebido = formatarVariacaoPercentual(resumo.variacaoPercentual);
      this.mediaMensalAnual = formatarValor(resumo.mediaMensal);
      this.melhorMesAnual = resumo.melhorMes
        ? `${resumo.melhorMes.mes} · ${formatarValor(resumo.melhorMes.total)}`
        : '—';
      this.faturamentoMensal = resumo.faturamentoMensal;
    }

    const pagosAno = this.mensalidades.filter(
      (m) =>
        m.status === 'PAGO' &&
        m.pagoEm &&
        dataIsoParaDateUtc(m.pagoEm).getUTCFullYear() === this.ano
    );
    this.ultimosPagamentos = this.montarPagamentosPeriodo(pagosAno);
  }

  private estaNoPeriodo(dataIso?: string | null): boolean {
    if (!dataIso) return false;

    const [ano, mes] = this.periodo.split('-').map(Number);
    const data = dataIsoParaDateUtc(dataIso);

    return data.getUTCFullYear() === ano && data.getUTCMonth() + 1 === mes;
  }

  private montarPagamentosPeriodo(pagos: Mensalidade[]): PagamentoRelatorio[] {
    return pagos
      .map((m) => ({
        id: m.id,
        clienteId: m.clienteId,
        clienteNome: m.cliente?.nome ?? 'Cliente',
        referencia: m.referencia,
        valor: m.valor,
        pagoEm: m.pagoEm!,
      }))
      .sort(
        (a, b) => new Date(b.pagoEm).getTime() - new Date(a.pagoEm).getTime()
      );
  }

  private montarCobrancasAtrasadas(
    pendentes: Mensalidade[]
  ): CobrancaAtrasadaRelatorio[] {
    return pendentes
      .filter((m) => calcularDias(m.vencimento) < 0)
      .map((m) => ({
        id: m.id,
        clienteId: m.clienteId,
        clienteNome: m.cliente?.nome ?? 'Cliente',
        referencia: m.referencia,
        valor: m.valor,
        vencimento: m.vencimento,
        diasAtraso: Math.abs(calcularDias(m.vencimento)),
      }))
      .sort((a, b) => b.diasAtraso - a.diasAtraso);
  }
}
