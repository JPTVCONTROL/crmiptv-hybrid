import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { ToastService } from '../../core/services/toast.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { Cliente, Mensalidade } from '../../core/models';
import {
  calcularDias,
  clienteEstaAtivo,
  formatarData,
  formatarValor,
  statusCliente,
} from '../../shared/utils/formatters';
import { DadoFaturamento } from '../../components/dashboard/faturamento-chart.component';

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
export class RelatoriosPage implements OnInit {
  loading = true;
  clientes: Cliente[] = [];
  mensalidades: Mensalidade[] = [];

  periodo = this.periodoAtual();

  clientesAtivos = 0;
  clientesAtrasados = 0;
  clientesInativos = 0;
  recebidoPeriodo = '';
  qtdPagamentosPeriodo = 0;
  totalPendente = '';
  totalAtrasado = '';
  qtdPendentes = 0;
  taxaInadimplencia = '0%';
  ticketMedio = '';
  faturamentoMensal: DadoFaturamento[] = [];
  ultimosPagamentos: PagamentoRelatorio[] = [];
  cobrancasAtrasadas: CobrancaAtrasadaRelatorio[] = [];

  fmtData = formatarData;
  fmtValor = formatarValor;

  constructor(
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    forkJoin([
      this.clienteService.listar(),
      this.mensalidadeService.listar(),
    ]).subscribe({
      next: ([clientes, mensalidades]) => {
        this.clientes = clientes;
        this.mensalidades = mensalidades;
        this.calcular();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
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

    const pendenteValor = pendentes.reduce((t, m) => t + m.valor, 0);
    const atrasadoValor = pendentes
      .filter((m) => calcularDias(m.vencimento) < 0)
      .reduce((t, m) => t + m.valor, 0);
    const recebidoValor = pagosPeriodo.reduce((t, m) => t + m.valor, 0);

    this.totalPendente = formatarValor(pendenteValor);
    this.totalAtrasado = formatarValor(atrasadoValor);
    this.recebidoPeriodo = formatarValor(recebidoValor);
    this.qtdPagamentosPeriodo = pagosPeriodo.length;
    this.qtdPendentes = pendentes.length;

    const pendentesAtrasadas = pendentes.filter(
      (m) => calcularDias(m.vencimento) < 0
    ).length;
    const taxa = pendentes.length
      ? ((pendentesAtrasadas / pendentes.length) * 100).toFixed(1)
      : '0';
    this.taxaInadimplencia = `${taxa}%`;

    this.ticketMedio = pendentes.length
      ? formatarValor(pendenteValor / pendentes.length)
      : formatarValor(0);

    this.faturamentoMensal = this.calcularFaturamentoMensal();
    this.ultimosPagamentos = this.montarPagamentosPeriodo(pagosPeriodo);
    this.cobrancasAtrasadas = this.montarCobrancasAtrasadas(pendentes);
  }

  private estaNoPeriodo(dataIso?: string | null): boolean {
    if (!dataIso) return false;

    const [ano, mes] = this.periodo.split('-').map(Number);
    const data = new Date(dataIso);

    return data.getFullYear() === ano && data.getMonth() + 1 === mes;
  }

  private calcularFaturamentoMensal(): DadoFaturamento[] {
    const meses = [
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
    const resultado: DadoFaturamento[] = [];

    for (let i = 5; i >= 0; i--) {
      const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const rotulo = `${meses[referencia.getMonth()]}/${String(referencia.getFullYear()).slice(-2)}`;

      let total = 0;
      for (const mensalidade of this.mensalidades) {
        if (mensalidade.status !== 'PAGO' || !mensalidade.pagoEm) continue;

        const pago = new Date(mensalidade.pagoEm);
        if (
          pago.getMonth() === referencia.getMonth() &&
          pago.getFullYear() === referencia.getFullYear()
        ) {
          total += mensalidade.valor;
        }
      }

      resultado.push({ mes: rotulo, total });
    }

    return resultado;
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
      .sort((a, b) => b.diasAtraso - a.diasAtraso)
      .slice(0, 8);
  }
}
