import { Cliente, Mensalidade } from '../../core/models';
import { clienteEstaAtivo, dataIsoParaDateUtc } from './formatters';

export type ModoRelatorio = 'MENSAL' | 'ANUAL';

export interface FaturamentoMes {
  mes: string;
  mesNumero: number;
  total: number;
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
  ano: number
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

    return {
      mes: rotuloMes(ano, mesNumero),
      mesNumero,
      total,
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

export function calcularProjecaoProximoAno(clientes: Cliente[]): ProjecaoProximoAno {
  const ano = new Date().getFullYear() + 1;
  const mrr = calcularMrrClientes(clientes);
  const clientesPagantes = contarClientesPagantes(clientes);

  const faturamentoMensal = Array.from({ length: 12 }, (_, indice) => ({
    mes: rotuloMes(ano, indice + 1),
    mesNumero: indice + 1,
    total: mrr,
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
