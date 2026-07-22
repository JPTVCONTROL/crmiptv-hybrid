import { Mensalidade } from '../../core/models';
import {
  PontoDisparoAutomacao,
  resolverPontoDisparo,
  rotuloPontoDisparo,
  tipoRotinaProgressiva,
} from './automacao-disparo';
import { ORDEM_PONTOS_FUNIL } from './cobranca-diaria';
import { dataIsoParaDateUtc } from './formatters';

export interface ResumoEtapaFunil {
  ponto: PontoDisparoAutomacao;
  rotulo: string;
  tipo: 'LEMBRETE' | 'COBRANCA';
  total: number;
  contactadosHoje: number;
  pendentes: number;
}

export interface EtapaFunilEfetividade {
  ponto: PontoDisparoAutomacao;
  rotulo: string;
  tipo: 'LEMBRETE' | 'COBRANCA';
  contatos: number;
  pagosAposContato: number;
  taxaConversao: number;
}

export function calcularDiasVencimentoNaData(
  vencimento: string,
  referencia: Date = new Date()
): number {
  const refUtc = Date.UTC(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate()
  );
  const data = dataIsoParaDateUtc(vencimento);
  const vencUtc = Date.UTC(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate()
  );
  return Math.ceil((vencUtc - refUtc) / (1000 * 60 * 60 * 24));
}

export function inicioPeriodoRelatorio(
  modo: 'MENSAL' | 'ANUAL',
  periodo: string,
  ano: number
): Date {
  if (modo === 'ANUAL') {
    return new Date(ano, 0, 1, 0, 0, 0, 0);
  }

  const [anoStr, mesStr] = periodo.split('-');
  return new Date(Number(anoStr), Number(mesStr) - 1, 1, 0, 0, 0, 0);
}

export function fimPeriodoRelatorio(
  modo: 'MENSAL' | 'ANUAL',
  periodo: string,
  ano: number
): Date {
  if (modo === 'ANUAL') {
    return new Date(ano, 11, 31, 23, 59, 59, 999);
  }

  const [anoStr, mesStr] = periodo.split('-');
  const mes = Number(mesStr);
  const anoNum = Number(anoStr);
  return new Date(anoNum, mes, 0, 23, 59, 59, 999);
}

export function calcularEfetividadeFunilPeriodo(
  mensalidades: Mensalidade[],
  inicio: Date,
  fim: Date
): EtapaFunilEfetividade[] {
  const mapa = new Map<
    PontoDisparoAutomacao,
    { contatos: number; pagos: number }
  >();

  for (const mensalidade of mensalidades) {
    if (!mensalidade.ultimoContatoEm) {
      continue;
    }

    const contatoEm = new Date(mensalidade.ultimoContatoEm);
    if (contatoEm < inicio || contatoEm > fim) {
      continue;
    }

    const dias = calcularDiasVencimentoNaData(
      mensalidade.vencimento,
      contatoEm
    );
    const ponto = resolverPontoDisparo(dias);
    if (!ponto) {
      continue;
    }

    const atual = mapa.get(ponto) ?? { contatos: 0, pagos: 0 };
    atual.contatos += 1;

    if (mensalidade.status === 'PAGO' && mensalidade.pagoEm) {
      const pagoEm = new Date(mensalidade.pagoEm);
      if (pagoEm >= contatoEm) {
        atual.pagos += 1;
      }
    }

    mapa.set(ponto, atual);
  }

  return ORDEM_PONTOS_FUNIL.filter((ponto) => mapa.has(ponto)).map((ponto) => {
    const { contatos, pagos } = mapa.get(ponto)!;
    return {
      ponto,
      rotulo: rotuloPontoDisparo(ponto),
      tipo: tipoRotinaProgressiva(ponto),
      contatos,
      pagosAposContato: pagos,
      taxaConversao:
        contatos > 0 ? Math.round((pagos / contatos) * 100) : 0,
    };
  });
}

export function classeBadgeTipoFunil(tipo: 'LEMBRETE' | 'COBRANCA'): string {
  return tipo === 'COBRANCA'
    ? 'bg-red-600/20 text-red-300'
    : 'bg-amber-600/20 text-amber-200';
}
