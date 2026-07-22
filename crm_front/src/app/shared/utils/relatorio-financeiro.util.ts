import { Cliente, Mensalidade } from '../../core/models';
import { clienteEstaAtivo, dataIsoParaDateUtc, resolverStatusCliente } from './formatters';
import { resolverCustoCreditoPorServidor } from './custo-credito.util';

export type ModoRelatorio = 'MENSAL' | 'ANUAL';

export interface FaturamentoMes {
  mes: string;
  mesNumero: number;
  total: number;
  liquido?: number;
  custosCredito?: number;
  despesasFixas?: number;
  custosEstimados?: number;
}

export interface ResumoMensalRelatorio {
  recebido: number;
  qtdPagamentos: number;
  recebidoMesAnterior: number;
  variacaoPercentual: number;
}

export interface ResumoAnualRelatorio {
  recebido: number;
  qtdPagamentos: number;
  recebidoAnoAnterior: number;
  variacaoPercentual: number;
  mediaMensal: number;
  melhorMes: FaturamentoMes | null;
  faturamentoMensal: FaturamentoMes[];
}

export interface ProjecaoProximoAno {
  ano: number;
  mrr: number;
  totalEsperado: number;
  clientesPagantes: number;
  faturamentoMensal: FaturamentoMes[];
}

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

function rotuloMes(ano: number, mes: number): string {
  return `${MESES[mes - 1]}/${String(ano).slice(-2)}`;
}

export function mesComControleCustos(ano: number, mes: number): boolean {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  if (ano > anoAtual) return true;
  if (ano < anoAtual) return false;
  return mes >= mesAtual;
}

function pagamentoNoMes(
  pagoEm: string,
  ano: number,
  mes: number
): boolean {
  const data = dataIsoParaDateUtc(pagoEm);
  return data.getUTCFullYear() === ano && data.getUTCMonth() + 1 === mes;
}

export function calcularMrrClientes(clientes: Cliente[]): number {
  return clientes
    .filter(
      (cliente) =>
        cliente.cortesia !== true && clienteEstaAtivo(cliente.expiraEm)
    )
    .reduce(
      (total, cliente) =>
        total + (cliente.valorMensal > 0 ? cliente.valorMensal : 0),
      0
    );
}

export function contarClientesPagantes(clientes: Cliente[]): number {
  return clientes.filter(
    (cliente) =>
      cliente.cortesia !== true &&
      clienteEstaAtivo(cliente.expiraEm) &&
      cliente.valorMensal > 0
  ).length;
}

export function faturamentoPorMesNoAno(
  mensalidades: Mensalidade[],
  ano: number,
  custosMensaisEstimados = 0
): FaturamentoMes[] {
  return Array.from({ length: 12 }, (_, indice) => {
    const mesNumero = indice + 1;
    const total = mensalidades
      .filter(
        (m) =>
          m.status === 'PAGO' &&
          m.pagoEm &&
          pagamentoNoMes(m.pagoEm, ano, mesNumero)
      )
      .reduce((acc, m) => acc + m.valor, 0);
    const liquido =
      custosMensaisEstimados > 0 &&
      mesComControleCustos(ano, mesNumero)
        ? Math.round((total - custosMensaisEstimados) * 100) / 100
        : undefined;

    return {
      mes: rotuloMes(ano, mesNumero),
      mesNumero,
      total,
      ...(liquido !== undefined ? { liquido, custosEstimados: custosMensaisEstimados } : {}),
    };
  });
}

export function calcularResumoMensal(
  mensalidades: Mensalidade[],
  periodo: string
): ResumoMensalRelatorio {
  const [ano, mes] = periodo.split('-').map(Number);
  const pagos = mensalidades.filter(
    (m) => m.status === 'PAGO' && m.pagoEm && pagamentoNoMes(m.pagoEm, ano, mes)
  );

  const referenciaAnterior = new Date(Date.UTC(ano, mes - 2, 1, 12, 0, 0));
  const pagosAnterior = mensalidades.filter(
    (m) =>
      m.status === 'PAGO' &&
      m.pagoEm &&
      pagamentoNoMes(
        m.pagoEm,
        referenciaAnterior.getUTCFullYear(),
        referenciaAnterior.getUTCMonth() + 1
      )
  );

  const recebido = pagos.reduce((t, m) => t + m.valor, 0);
  const recebidoMesAnterior = pagosAnterior.reduce((t, m) => t + m.valor, 0);
  const variacaoPercentual =
    recebidoMesAnterior <= 0
      ? recebido > 0
        ? 100
        : 0
      : ((recebido - recebidoMesAnterior) / recebidoMesAnterior) * 100;

  return {
    recebido,
    qtdPagamentos: pagos.length,
    recebidoMesAnterior,
    variacaoPercentual,
  };
}

export function calcularResumoAnual(
  mensalidades: Mensalidade[],
  ano: number
): ResumoAnualRelatorio {
  const faturamentoMensal = faturamentoPorMesNoAno(mensalidades, ano);
  const recebido = faturamentoMensal.reduce((t, m) => t + m.total, 0);
  const qtdPagamentos = mensalidades.filter(
    (m) =>
      m.status === 'PAGO' &&
      m.pagoEm &&
      dataIsoParaDateUtc(m.pagoEm).getUTCFullYear() === ano
  ).length;

  const faturamentoAnoAnterior = faturamentoPorMesNoAno(mensalidades, ano - 1);
  const recebidoAnoAnterior = faturamentoAnoAnterior.reduce(
    (t, m) => t + m.total,
    0
  );

  const variacaoPercentual =
    recebidoAnoAnterior <= 0
      ? recebido > 0
        ? 100
        : 0
      : ((recebido - recebidoAnoAnterior) / recebidoAnoAnterior) * 100;

  const mesesComReceita = faturamentoMensal.filter((m) => m.total > 0);
  const melhorMes =
    mesesComReceita.length === 0
      ? null
      : mesesComReceita.reduce((melhor, atual) =>
          atual.total > melhor.total ? atual : melhor
        );

  const mediaMensal = recebido / 12;

  return {
    recebido,
    qtdPagamentos,
    recebidoAnoAnterior,
    variacaoPercentual,
    mediaMensal,
    melhorMes,
    faturamentoMensal,
  };
}

export function calcularProjecaoProximoAno(
  clientes: Cliente[],
  custosMensaisEstimados = 0
): ProjecaoProximoAno {
  const ano = new Date().getFullYear() + 1;
  const mrr = calcularMrrClientes(clientes);
  const clientesPagantes = contarClientesPagantes(clientes);
  const liquido =
    custosMensaisEstimados > 0
      ? Math.round((mrr - custosMensaisEstimados) * 100) / 100
      : undefined;

  const faturamentoMensal = Array.from({ length: 12 }, (_, indice) => ({
    mes: rotuloMes(ano, indice + 1),
    mesNumero: indice + 1,
    total: mrr,
    ...(liquido !== undefined
      ? { liquido, custosEstimados: custosMensaisEstimados }
      : {}),
  }));

  return {
    ano,
    mrr,
    totalEsperado: Math.round(mrr * 12 * 100) / 100,
    clientesPagantes,
    faturamentoMensal,
  };
}

export function mensalidadeEhCobravel(m: Mensalidade): boolean {
  return m.cliente?.cortesia !== true;
}

export function formatarVariacaoPercentual(valor: number): string {
  const sinal = valor > 0 ? '+' : '';
  return `${sinal}${valor.toFixed(1)}%`;
}

export interface ExpectativaRelatorioCalculada {
  controleCustosDesde: string;
  mensal: {
    faturamento: number;
    custos: number;
    lucro: number;
    margemPercentual: number;
  };
  anual: {
    faturamento: number;
    custos: number;
    lucro: number;
    margemPercentual: number;
    mesesRestantes: number;
  };
}

export interface ProjecaoFinanceiraPeriodo {
  rotulo: string;
  faturamento: number;
  creditosEsperados: number;
  custoCreditos: number;
  despesasFixas: number;
  custos: number;
  lucro: number;
  margemPercentual: number;
  detalhe?: string;
}

export interface ProjecoesEsperadasRelatorio {
  controleCustosDesde: string;
  clientesAtivosPagantes: number;
  mesAtual: ProjecaoFinanceiraPeriodo;
  proximoMes: ProjecaoFinanceiraPeriodo;
  anoAtual: ProjecaoFinanceiraPeriodo;
  proximoAno: ProjecaoFinanceiraPeriodo;
}

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function calcularMargemLucro(faturamento: number, lucro: number): number {
  return faturamento > 0
    ? Math.round((lucro / faturamento) * 1000) / 10
    : 0;
}

function montarProjecaoPeriodo(
  rotulo: string,
  faturamento: number,
  creditosEsperados: number,
  custoCreditos: number,
  despesasFixas: number,
  detalhe?: string
): ProjecaoFinanceiraPeriodo {
  const custos = arredondarMoeda(custoCreditos + despesasFixas);
  const lucro = arredondarMoeda(faturamento - custos);
  return {
    rotulo,
    faturamento: arredondarMoeda(faturamento),
    creditosEsperados: Math.max(0, Math.round(creditosEsperados)),
    custoCreditos: arredondarMoeda(custoCreditos),
    despesasFixas: arredondarMoeda(despesasFixas),
    custos,
    lucro,
    margemPercentual: calcularMargemLucro(faturamento, lucro),
    detalhe,
  };
}

export function formatarQtdCreditos(quantidade: number): string {
  const qtd = Math.max(0, Math.round(quantidade));
  return qtd === 1 ? '1 crédito' : `${qtd} créditos`;
}

function custoCreditoCliente(
  cliente: Cliente,
  tarifasPaineis?: Record<string, number>
): number {
  const informado = cliente.custoCredito ?? 0;
  if (informado > 0) {
    return informado;
  }
  return resolverCustoCreditoPorServidor(cliente.servidor, tarifasPaineis);
}

function clienteConsomeCreditoMensal(
  cliente: Cliente,
  tarifasPaineis?: Record<string, number>
): boolean {
  return custoCreditoCliente(cliente, tarifasPaineis) > 0;
}

/** Base mensal: pagantes para faturamento; créditos incluem cortesia (consome painel). */
export function calcularBaseProjecaoClientesAtivos(
  clientes: Cliente[],
  tarifasPaineis?: Record<string, number>
) {
  const ativosServico = clientes.filter(
    (cliente) =>
      cliente.somenteContato !== true &&
      resolverStatusCliente(cliente) === 'ATIVO'
  );
  const pagantes = ativosServico.filter(
    (cliente) => cliente.cortesia !== true && cliente.valorMensal > 0
  );
  const comCredito = ativosServico.filter((cliente) =>
    clienteConsomeCreditoMensal(cliente, tarifasPaineis)
  );
  const faturamentoMensal = pagantes.reduce(
    (total, cliente) => total + cliente.valorMensal,
    0
  );
  const custosCreditos = comCredito.reduce(
    (total, cliente) =>
      total + custoCreditoCliente(cliente, tarifasPaineis),
    0
  );

  return {
    faturamentoMensal: arredondarMoeda(faturamentoMensal),
    custosCreditos: arredondarMoeda(custosCreditos),
    creditosMensais: comCredito.length,
    clientesAtivosPagantes: pagantes.length,
    clientesAtivos: ativosServico.length,
  };
}

export function calcularProjecoesEsperadas(params: {
  clientes: Cliente[];
  despesasFixas: number;
  recebidoAno: number;
  custosAcumuladosAno?: number;
  creditosConsumidosAno?: number;
  custosCreditoAcumuladosAno?: number;
  tarifasPaineis?: Record<string, number>;
  referencia?: Date;
}): ProjecoesEsperadasRelatorio | null {
  const referencia = params.referencia ?? new Date();
  const anoAtual = referencia.getFullYear();
  const mesAtual = referencia.getMonth() + 1;
  const controleCustosDesde = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
  const despesasFixas = arredondarMoeda(params.despesasFixas);

  const base = calcularBaseProjecaoClientesAtivos(
    params.clientes,
    params.tarifasPaineis
  );
  const custosMensal = arredondarMoeda(base.custosCreditos + despesasFixas);

  if (
    base.faturamentoMensal <= 0 &&
    custosMensal <= 0 &&
    params.recebidoAno <= 0
  ) {
    return null;
  }

  const mesProximo = mesAtual === 12 ? 1 : mesAtual + 1;
  const anoProximoMes = mesAtual === 12 ? anoAtual + 1 : anoAtual;
  const anoProximo = anoAtual + 1;
  const mesesRestantesAno = Math.max(0, 12 - mesAtual);
  const custosAcumulados = params.custosAcumuladosAno ?? 0;
  const creditosConsumidosAno = params.creditosConsumidosAno ?? 0;
  const custosCreditoAcumuladosAno = params.custosCreditoAcumuladosAno ?? 0;
  const despesasFixasAnoRestante = arredondarMoeda(
    despesasFixas * mesesRestantesAno
  );
  const detalheClientes = `${base.clientesAtivosPagantes} cliente(s) ativo(s) pagante(s)`;

  const faturamentoAnoAtual = arredondarMoeda(
    params.recebidoAno + base.faturamentoMensal * mesesRestantesAno
  );
  const creditosAnoAtual =
    creditosConsumidosAno + base.creditosMensais * mesesRestantesAno;
  const custoCreditosAnoAtual = arredondarMoeda(
    custosCreditoAcumuladosAno + base.custosCreditos * mesesRestantesAno
  );
  const despesasFixasAnoAtual = arredondarMoeda(
    Math.max(0, custosAcumulados - custosCreditoAcumuladosAno) +
      despesasFixasAnoRestante
  );
  const custosAnoAtual = arredondarMoeda(
    custosAcumulados + custosMensal * mesesRestantesAno
  );

  return {
    controleCustosDesde,
    clientesAtivosPagantes: base.clientesAtivosPagantes,
    mesAtual: montarProjecaoPeriodo(
      rotuloMes(anoAtual, mesAtual),
      base.faturamentoMensal,
      base.creditosMensais,
      base.custosCreditos,
      despesasFixas,
      detalheClientes
    ),
    proximoMes: montarProjecaoPeriodo(
      rotuloMes(anoProximoMes, mesProximo),
      base.faturamentoMensal,
      base.creditosMensais,
      base.custosCreditos,
      despesasFixas,
      'Mesma base de clientes ativos'
    ),
    anoAtual: montarProjecaoPeriodo(
      String(anoAtual),
      faturamentoAnoAtual,
      creditosAnoAtual,
      custoCreditosAnoAtual,
      despesasFixasAnoAtual,
      mesesRestantesAno > 0
        ? `Recebido + projeção × ${mesesRestantesAno} mês(es) restante(s)`
        : 'Recebido no ano'
    ),
    proximoAno: montarProjecaoPeriodo(
      String(anoProximo),
      base.faturamentoMensal * 12,
      base.creditosMensais * 12,
      base.custosCreditos * 12,
      despesasFixas * 12,
      `MRR × 12 · ${detalheClientes}`
    ),
  };
}

export function calcularExpectativaRelatorio(params: {
  mrr: number;
  custosMensal: number;
  recebidoAno: number;
  anoReferencia: number;
  custosAcumuladosAno?: number;
}): ExpectativaRelatorioCalculada {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const controleCustosDesde = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;

  let faturamentoMensal = params.mrr;
  if (faturamentoMensal <= 0 && params.recebidoAno > 0) {
    if (params.anoReferencia === anoAtual && mesAtual > 0) {
      faturamentoMensal =
        Math.round((params.recebidoAno / mesAtual) * 100) / 100;
    } else {
      faturamentoMensal = Math.round((params.recebidoAno / 12) * 100) / 100;
    }
  }

  const custosMensal = params.custosMensal;
  const lucroMensal =
    Math.round((faturamentoMensal - custosMensal) * 100) / 100;
  const margemMensal =
    faturamentoMensal > 0
      ? Math.round((lucroMensal / faturamentoMensal) * 1000) / 10
      : 0;

  let mesesRestantes = 0;
  if (params.anoReferencia > anoAtual) {
    mesesRestantes = 12;
  } else if (params.anoReferencia === anoAtual) {
    mesesRestantes = Math.max(0, 12 - mesAtual);
  }

  const custosAcumulados = params.custosAcumuladosAno ?? 0;
  const faturamentoAnual =
    Math.round((params.recebidoAno + faturamentoMensal * mesesRestantes) * 100) /
    100;
  const custosAnual =
    Math.round((custosAcumulados + custosMensal * mesesRestantes) * 100) / 100;
  const lucroAnual = Math.round((faturamentoAnual - custosAnual) * 100) / 100;
  const margemAnual =
    faturamentoAnual > 0
      ? Math.round((lucroAnual / faturamentoAnual) * 1000) / 10
      : 0;

  return {
    controleCustosDesde,
    mensal: {
      faturamento: Math.round(faturamentoMensal * 100) / 100,
      custos: Math.round(custosMensal * 100) / 100,
      lucro: lucroMensal,
      margemPercentual: margemMensal,
    },
    anual: {
      faturamento: faturamentoAnual,
      custos: custosAnual,
      lucro: lucroAnual,
      margemPercentual: margemAnual,
      mesesRestantes,
    },
  };
}
