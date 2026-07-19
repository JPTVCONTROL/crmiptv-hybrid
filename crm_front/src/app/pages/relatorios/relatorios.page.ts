import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { ClienteService } from '../../core/services/cliente.service';
import { DispositivoService } from '../../core/services/dispositivo.service';
import { PlanoService } from '../../core/services/plano.service';
import { ToastService } from '../../core/services/toast.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
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
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';

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

  periodo = this.periodoAtual();

  clientesAtivos = 0;
  clientesAtrasados = 0;
  clientesInativos = 0;
  recebidoPeriodo = '';
  recebidoMesAnterior = '';
  variacaoRecebido = '';
  variacaoRecebidoPositiva = true;
  qtdPagamentosPeriodo = 0;
  totalPendente = '';
  totalAtrasado = '';
  qtdPendentes = 0;
  qtdAtrasadas = 0;
  taxaInadimplencia = '0%';
  ticketMedio = '';
  ultimosPagamentos: PagamentoRelatorio[] = [];
  todasCobrancasAtrasadas: CobrancaAtrasadaRelatorio[] = [];
  distribuicaoPlanos: DadoCatalogoDistribuicao[] = [];
  distribuicaoAplicativos: DadoCatalogoDistribuicao[] = [];
  distribuicaoDispositivos: DadoCatalogoDistribuicao[] = [];

  fmtData = formatarData;
  fmtValor = formatarValor;

  constructor(
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private aplicativoService: AplicativoService,
    private planoService: PlanoService,
    private dispositivoService: DispositivoService,
    private toast: ToastService,
    private sync: DadosSyncService
  ) {}

  ngOnInit(): void {
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades', 'dashboard', 'catalogos'],
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
    ]).subscribe({
      next: ([clientes, mensalidades, aplicativos, planos, dispositivos]) => {
        this.clientes = clientes;
        this.mensalidades = mensalidades;
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
      error: () => (this.loading = false),
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
    const [ano, mes] = this.periodo.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  recalcular(): void {
    this.calcular();
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

    const blob = new Blob(['\uFEFF' + linhas.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pagamentos-${this.periodo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

    const blob = new Blob(['\uFEFF' + linhas.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inadimplentes-${this.periodo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private periodoAtual(): string {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
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

    const pendentes = this.mensalidades.filter((m) => m.status === 'PENDENTE');
    const pagosPeriodo = this.mensalidades.filter(
      (m) => m.status === 'PAGO' && this.estaNoPeriodo(m.pagoEm)
    );
    const pagosMesAnterior = this.mensalidades.filter(
      (m) => m.status === 'PAGO' && this.estaNoPeriodoAnterior(m.pagoEm)
    );

    const pendenteValor = pendentes.reduce((t, m) => t + m.valor, 0);
    const atrasadas = pendentes.filter((m) => calcularDias(m.vencimento) < 0);
    const atrasadoValor = atrasadas.reduce((t, m) => t + m.valor, 0);
    const recebidoValor = pagosPeriodo.reduce((t, m) => t + m.valor, 0);
    const recebidoAnteriorValor = pagosMesAnterior.reduce((t, m) => t + m.valor, 0);

    this.totalPendente = formatarValor(pendenteValor);
    this.totalAtrasado = formatarValor(atrasadoValor);
    this.recebidoPeriodo = formatarValor(recebidoValor);
    this.recebidoMesAnterior = formatarValor(recebidoAnteriorValor);
    this.qtdPagamentosPeriodo = pagosPeriodo.length;
    this.qtdPendentes = pendentes.length;
    this.qtdAtrasadas = atrasadas.length;

    if (recebidoAnteriorValor <= 0) {
      this.variacaoRecebido = recebidoValor > 0 ? '+100%' : '0%';
      this.variacaoRecebidoPositiva = recebidoValor >= recebidoAnteriorValor;
    } else {
      const variacao =
        ((recebidoValor - recebidoAnteriorValor) / recebidoAnteriorValor) * 100;
      this.variacaoRecebidoPositiva = variacao >= 0;
      this.variacaoRecebido = `${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}%`;
    }

    const taxa = pendentes.length
      ? ((atrasadas.length / pendentes.length) * 100).toFixed(1)
      : '0';
    this.taxaInadimplencia = `${taxa}%`;

    this.ticketMedio = pendentes.length
      ? formatarValor(pendenteValor / pendentes.length)
      : formatarValor(0);

    this.ultimosPagamentos = this.montarPagamentosPeriodo(pagosPeriodo);
    this.todasCobrancasAtrasadas = this.montarCobrancasAtrasadas(pendentes);
  }

  private estaNoPeriodo(dataIso?: string | null): boolean {
    if (!dataIso) return false;

    const [ano, mes] = this.periodo.split('-').map(Number);
    const data = dataIsoParaDateUtc(dataIso);

    return data.getUTCFullYear() === ano && data.getUTCMonth() + 1 === mes;
  }

  private estaNoPeriodoAnterior(dataIso?: string | null): boolean {
    if (!dataIso) return false;

    const [ano, mes] = this.periodo.split('-').map(Number);
    const referencia = new Date(Date.UTC(ano, mes - 2, 1, 12, 0, 0));
    const data = dataIsoParaDateUtc(dataIso);

    return (
      data.getUTCFullYear() === referencia.getUTCFullYear() &&
      data.getUTCMonth() === referencia.getUTCMonth()
    );
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
