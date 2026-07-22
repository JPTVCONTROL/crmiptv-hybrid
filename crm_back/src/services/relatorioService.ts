import prisma from '../config/database.js';
import { calcularStatusCliente } from '../utils/helpers/clienteStatus.js';
import { parseDataSomenteDia } from '../utils/helpers/dateHelpers.js';
import { montarResumoCustos } from '../utils/helpers/custoHelpers.js';
import { painelCreditoService } from './painelCreditoService.js';

function limitesMes(ano: number, mes: number) {
  return {
    inicio: new Date(ano, mes - 1, 1, 0, 0, 0, 0),
    fim: new Date(ano, mes, 0, 23, 59, 59, 999),
  };
}

function limitesAno(ano: number) {
  return {
    inicio: new Date(ano, 0, 1, 0, 0, 0, 0),
    fim: new Date(ano, 11, 31, 23, 59, 59, 999),
  };
}

function montarFaturamentoLiquido(
  bruto: number,
  custosCredito: number,
  despesasFixas: number
) {
  const totalCustos =
    Math.round((custosCredito + despesasFixas) * 100) / 100;
  const liquido = Math.round((bruto - totalCustos) * 100) / 100;
  const margemPercentual =
    bruto > 0 ? Math.round((liquido / bruto) * 1000) / 10 : 0;

  return {
    faturamentoBruto: Math.round(bruto * 100) / 100,
    custosCredito: Math.round(custosCredito * 100) / 100,
    despesasFixas: Math.round(despesasFixas * 100) / 100,
    totalCustos,
    faturamentoLiquido: liquido,
    margemLucroPercentual: margemPercentual,
  };
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

function pagamentoNoMes(pagoEm: Date, ano: number, mes: number): boolean {
  return pagoEm.getFullYear() === ano && pagoEm.getMonth() + 1 === mes;
}

function referenciaMesAtual(hoje: Date) {
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
}

/** Custos completos (fixos + créditos) só a partir do mês corrente. */
function mesComControleCustos(ano: number, mes: number, hoje: Date): boolean {
  const ref = referenciaMesAtual(hoje);
  if (ano > ref.ano) return true;
  if (ano < ref.ano) return false;
  return mes >= ref.mes;
}

function mesesRestantesNoAno(ano: number, hoje: Date): number {
  const ref = referenciaMesAtual(hoje);
  if (ano > ref.ano) return 12;
  if (ano < ref.ano) return 0;
  return Math.max(0, 12 - ref.mes);
}

function brutoNoMes(
  mensalidades: Array<{ valor: number; pagoEm: Date | null }>,
  ano: number,
  mesNumero: number
): number {
  return mensalidades
    .filter((m) => m.pagoEm && pagamentoNoMes(m.pagoEm, ano, mesNumero))
    .reduce((acc, m) => acc + m.valor, 0);
}

function montarSerieFaturamentoMensal(
  mensalidades: Array<{ valor: number; pagoEm: Date | null }>,
  ano: number,
  despesasFixas: number,
  consumoPorMes: number[],
  hoje: Date
) {
  return Array.from({ length: 12 }, (_, indice) => {
    const mesNumero = indice + 1;
    const total = brutoNoMes(mensalidades, ano, mesNumero);
    const comCustos = mesComControleCustos(ano, mesNumero, hoje);
    const custosCredito = comCustos ? (consumoPorMes[indice] ?? 0) : 0;
    const despesasMes = comCustos ? despesasFixas : 0;
    const liquido = comCustos
      ? Math.round((total - custosCredito - despesasMes) * 100) / 100
      : undefined;

    return {
      mes: rotuloMes(ano, mesNumero),
      mesNumero,
      total: Math.round(total * 100) / 100,
      custosCredito,
      despesasFixas: despesasMes,
      liquido,
      controleCustos: comCustos,
    };
  });
}

function montarFaturamentoRecente(
  mensalidades: Array<{ valor: number; pagoEm: Date | null }>,
  despesasFixas: number,
  consumoPorAno: Map<number, number[]>,
  hoje: Date
) {
  const serie: ReturnType<typeof montarSerieFaturamentoMensal> = [];

  for (let i = 5; i >= 0; i--) {
    const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const ano = referencia.getFullYear();
    const mesNumero = referencia.getMonth() + 1;
    const total = brutoNoMes(mensalidades, ano, mesNumero);
    const comCustos = mesComControleCustos(ano, mesNumero, hoje);
    const consumoMes = comCustos
      ? (consumoPorAno.get(ano)?.[mesNumero - 1] ?? 0)
      : 0;
    const despesasMes = comCustos ? despesasFixas : 0;
    const liquido = comCustos
      ? Math.round((total - consumoMes - despesasMes) * 100) / 100
      : undefined;

    serie.push({
      mes: rotuloMes(ano, mesNumero),
      mesNumero,
      total: Math.round(total * 100) / 100,
      custosCredito: consumoMes,
      despesasFixas: despesasMes,
      liquido,
      controleCustos: comCustos,
    });
  }

  return serie;
}

function montarExpectativa(
  mrr: number,
  custosMensal: number,
  despesasFixas: number,
  creditoEstimado: number,
  recebidoAno: number,
  anoReferencia: number,
  faturamentoMensal: ReturnType<typeof montarSerieFaturamentoMensal>,
  hoje: Date
) {
  const ref = referenciaMesAtual(hoje);
  let faturamentoMensalEsperado = mrr;
  if (faturamentoMensalEsperado <= 0 && recebidoAno > 0) {
    if (anoReferencia === ref.ano && ref.mes > 0) {
      faturamentoMensalEsperado =
        Math.round((recebidoAno / ref.mes) * 100) / 100;
    } else {
      faturamentoMensalEsperado =
        Math.round((recebidoAno / 12) * 100) / 100;
    }
  }

  const lucroMensal =
    Math.round((faturamentoMensalEsperado - custosMensal) * 100) / 100;
  const margemMensal =
    faturamentoMensalEsperado > 0
      ? Math.round((lucroMensal / faturamentoMensalEsperado) * 1000) / 10
      : 0;

  const mesesFaltantes = mesesRestantesNoAno(anoReferencia, hoje);
  const mesesElegiveis = faturamentoMensal.filter((item) => item.controleCustos);
  const custosReaisAno = mesesElegiveis.reduce(
    (total, item) => total + item.custosCredito + item.despesasFixas,
    0
  );
  const faturamentoAnualEsperado =
    Math.round((recebidoAno + faturamentoMensalEsperado * mesesFaltantes) * 100) /
    100;
  const custosAnualEsperado =
    Math.round((custosReaisAno + custosMensal * mesesFaltantes) * 100) / 100;
  const lucroAnualEsperado =
    Math.round((faturamentoAnualEsperado - custosAnualEsperado) * 100) / 100;
  const margemAnual =
    faturamentoAnualEsperado > 0
      ? Math.round((lucroAnualEsperado / faturamentoAnualEsperado) * 1000) / 10
      : 0;

  return {
    controleCustosDesde: `${ref.ano}-${String(ref.mes).padStart(2, '0')}`,
    mensal: {
      faturamento: Math.round(faturamentoMensalEsperado * 100) / 100,
      custos: Math.round(custosMensal * 100) / 100,
      custosFixos: Math.round(despesasFixas * 100) / 100,
      custosVariaveis: Math.round(creditoEstimado * 100) / 100,
      lucro: lucroMensal,
      margemPercentual: margemMensal,
    },
    anual: {
      faturamento: faturamentoAnualEsperado,
      custos: custosAnualEsperado,
      lucro: lucroAnualEsperado,
      margemPercentual: margemAnual,
      mesesRestantes: mesesFaltantes,
    },
    proximoAno: {
      faturamento: Math.round(faturamentoMensalEsperado * 12 * 100) / 100,
      custos: Math.round(custosMensal * 12 * 100) / 100,
      lucro: Math.round(lucroMensal * 12 * 100) / 100,
      margemPercentual: margemMensal,
    },
  };
}

export class RelatorioService {
  async obterResumo(periodo?: string, ano?: number) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [clientes, mensalidades, despesas] = await Promise.all([
      prisma.cliente.findMany({
        select: {
          id: true,
          nome: true,
          valorMensal: true,
          custoCredito: true,
          expiraEm: true,
          cortesia: true,
          somenteContato: true,
          ativo: true,
        },
      }),
      prisma.mensalidade.findMany({
        where: { status: 'PAGO', pagoEm: { not: null } },
        select: { valor: true, pagoEm: true },
      }),
      prisma.despesaMensal.findMany({
        select: { valor: true, ativo: true },
      }),
    ]);

    const anoReferencia = ano ?? hoje.getFullYear();
    const custos = montarResumoCustos(clientes, despesas);
    const anosConsumo = new Set([anoReferencia, anoReferencia - 1, hoje.getFullYear()]);
    const consumoPorAno = new Map<number, number[]>();

    await Promise.all(
      [...anosConsumo].map(async (anoConsumo) => {
        consumoPorAno.set(
          anoConsumo,
          await painelCreditoService.obterConsumoPorMesNoAno(anoConsumo)
        );
      })
    );

    const faturamentoMensal = montarSerieFaturamentoMensal(
      mensalidades,
      anoReferencia,
      custos.despesasFixas,
      consumoPorAno.get(anoReferencia) ?? Array(12).fill(0),
      hoje
    );
    const faturamentoRecente = montarFaturamentoRecente(
      mensalidades,
      custos.despesasFixas,
      consumoPorAno,
      hoje
    );

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
      const { inicio, fim } = limitesMes(anoMes, mesMes);
      const consumoMes = await painelCreditoService.obterCustoConsumidoNoPeriodo(
        inicio,
        fim
      );
      const comCustos = mesComControleCustos(anoMes, mesMes, hoje);

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
        controleCustosAtivo: comCustos,
        ...montarFaturamentoLiquido(
          recebido,
          comCustos ? consumoMes.valor : 0,
          comCustos ? custos.despesasFixas : 0
        ),
        qtdCreditosConsumidos: comCustos ? consumoMes.quantidade : 0,
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

    const { inicio: inicioAno, fim: fimAno } = limitesAno(anoReferencia);
    const refCustos = referenciaMesAtual(hoje);
    const inicioCustosAno =
      anoReferencia > refCustos.ano
        ? inicioAno
        : anoReferencia < refCustos.ano
          ? null
          : limitesMes(refCustos.ano, refCustos.mes).inicio;
    const consumoAnoParcial = inicioCustosAno
      ? await painelCreditoService.obterCustoConsumidoNoPeriodo(
          inicioCustosAno,
          fimAno
        )
      : { valor: 0, quantidade: 0 };
    const mesesComCustos = faturamentoMensal.filter((item) => item.controleCustos);
    const custosCreditoAno = mesesComCustos.reduce(
      (total, item) => total + item.custosCredito,
      0
    );
    const despesasAno = mesesComCustos.reduce(
      (total, item) => total + item.despesasFixas,
      0
    );
    const faturamentoAnualLiquido = montarFaturamentoLiquido(
      recebidoAno,
      custosCreditoAno,
      despesasAno
    );

    const lucroProjetadoMensal = Math.round((mrr - custos.totalMensal) * 100) / 100;
    const expectativa = montarExpectativa(
      mrr,
      custos.totalMensal,
      custos.despesasFixas,
      custos.creditoClientes,
      recebidoAno,
      anoReferencia,
      faturamentoMensal,
      hoje
    );

    return {
      ano: anoReferencia,
      faturamentoRecente,
      expectativa,
      resumoMensal,
      custos: {
        creditoClientes: custos.creditoClientes,
        despesasFixas: custos.despesasFixas,
        totalMensal: custos.totalMensal,
        mrr: custos.mrr,
        margemEstimada: custos.margemEstimada,
        margemPercentual: custos.margemPercentual,
        qtdClientesComCredito: custos.qtdClientesComCredito,
        qtdDespesasAtivas: custos.qtdDespesasAtivas,
      },
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
        ...faturamentoAnualLiquido,
        qtdCreditosConsumidos: consumoAnoParcial.quantidade,
      },
      projecaoProximoAno: {
        ano: anoProximo,
        mrr,
        totalEsperado: Math.round(mrr * 12 * 100) / 100,
        clientesPagantes: clientesPagantes.length,
        faturamentoMensal: Array.from({ length: 12 }, (_, indice) => ({
          mes: rotuloMes(anoProximo, indice + 1),
          mesNumero: indice + 1,
          total: Math.round(mrr * 100) / 100,
          custosEstimados: custos.totalMensal,
          liquido: lucroProjetadoMensal,
        })),
      },
    };
  }
}

export const relatorioService = new RelatorioService();
