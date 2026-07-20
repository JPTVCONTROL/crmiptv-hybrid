import prisma from '../config/database.js';
import { calcularStatusCliente } from '../utils/helpers/clienteStatus.js';
import { parseDataSomenteDia } from '../utils/helpers/dateHelpers.js';

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

function pagamentoNoMes(pagoEm: Date, ano: number, mes: number): boolean {
  return pagoEm.getFullYear() === ano && pagoEm.getMonth() + 1 === mes;
}

export class RelatorioService {
  async obterResumo(periodo?: string, ano?: number) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [clientes, mensalidades] = await Promise.all([
      prisma.cliente.findMany({
        select: {
          id: true,
          valorMensal: true,
          expiraEm: true,
          cortesia: true,
        },
      }),
      prisma.mensalidade.findMany({
        where: { status: 'PAGO', pagoEm: { not: null } },
        select: { valor: true, pagoEm: true },
      }),
    ]);

    const anoReferencia = ano ?? hoje.getFullYear();
    const faturamentoMensal = Array.from({ length: 12 }, (_, indice) => {
      const mesNumero = indice + 1;
      const total = mensalidades
        .filter(
          (m) => m.pagoEm && pagamentoNoMes(m.pagoEm, anoReferencia, mesNumero)
        )
        .reduce((acc, m) => acc + m.valor, 0);

      return {
        mes: rotuloMes(anoReferencia, mesNumero),
        mesNumero,
        total,
      };
    });

    const recebidoAno = faturamentoMensal.reduce((t, m) => t + m.total, 0);
    const faturamentoAnoAnterior = Array.from({ length: 12 }, (_, indice) => {
      const mesNumero = indice + 1;
      return mensalidades
        .filter(
          (m) =>
            m.pagoEm &&
            pagamentoNoMes(m.pagoEm, anoReferencia - 1, mesNumero)
        )
        .reduce((acc, m) => acc + m.valor, 0);
    });
    const recebidoAnoAnterior = faturamentoAnoAnterior.reduce(
      (t, v) => t + v,
      0
    );

    let resumoMensal = null;
    if (periodo) {
      const [anoMes, mesMes] = periodo.split('-').map(Number);
      const pagosMes = mensalidades.filter(
        (m) => m.pagoEm && pagamentoNoMes(m.pagoEm, anoMes, mesMes)
      );
      const referenciaAnterior = new Date(Date.UTC(anoMes, mesMes - 2, 1, 12, 0, 0));
      const pagosAnterior = mensalidades.filter(
        (m) =>
          m.pagoEm &&
          pagamentoNoMes(
            m.pagoEm,
            referenciaAnterior.getUTCFullYear(),
            referenciaAnterior.getUTCMonth() + 1
          )
      );

      const recebido = pagosMes.reduce((t, m) => t + m.valor, 0);
      const recebidoMesAnterior = pagosAnterior.reduce((t, m) => t + m.valor, 0);

      resumoMensal = {
        periodo,
        recebido,
        qtdPagamentos: pagosMes.length,
        recebidoMesAnterior,
        variacaoPercentual:
          recebidoMesAnterior <= 0
            ? recebido > 0
              ? 100
              : 0
            : ((recebido - recebidoMesAnterior) / recebidoMesAnterior) * 100,
      };
    }

    const clientesPagantes = clientes.filter(
      (cliente) =>
        !cliente.cortesia &&
        calcularStatusCliente(cliente.expiraEm) === 'ATIVO' &&
        cliente.valorMensal > 0
    );
    const mrr = clientesPagantes.reduce((t, c) => t + c.valorMensal, 0);
    const anoProximo = hoje.getFullYear() + 1;

    return {
      ano: anoReferencia,
      resumoMensal,
      resumoAnual: {
        recebido: recebidoAno,
        recebidoAnoAnterior,
        variacaoPercentual:
          recebidoAnoAnterior <= 0
            ? recebidoAno > 0
              ? 100
              : 0
            : ((recebidoAno - recebidoAnoAnterior) / recebidoAnoAnterior) * 100,
        mediaMensal: recebidoAno / 12,
        faturamentoMensal,
      },
      projecaoProximoAno: {
        ano: anoProximo,
        mrr,
        totalEsperado: Math.round(mrr * 12 * 100) / 100,
        clientesPagantes: clientesPagantes.length,
        faturamentoMensal: Array.from({ length: 12 }, (_, indice) => ({
          mes: rotuloMes(anoProximo, indice + 1),
          mesNumero: indice + 1,
          total: mrr,
        })),
      },
    };
  }
}

export const relatorioService = new RelatorioService();
