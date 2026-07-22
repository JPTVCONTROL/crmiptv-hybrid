import { parseDataSomenteDia } from './dateHelpers.js';
import {
  elegivelRotinaProgressiva,
  resolverPontoDisparo,
  rotuloPontoDisparo,
  tipoRotinaProgressiva,
  type PontoDisparoAutomacao,
} from './automacaoDisparoHelpers.js';

export const ORDEM_PONTOS_FUNIL: PontoDisparoAutomacao[] = [
  'LEMBRETE_D5',
  'LEMBRETE_D3',
  'LEMBRETE_D1',
  'LEMBRETE_D0',
  'COBRANCA_D1',
  'COBRANCA_D2',
  'COBRANCA_D3',
  'COBRANCA_D7',
];

export interface ResumoEtapaFunil {
  ponto: PontoDisparoAutomacao;
  rotulo: string;
  tipo: 'LEMBRETE' | 'COBRANCA';
  total: number;
  contactadosHoje: number;
  pendentes: number;
}

export function agruparResumoEtapasFunil(
  mensalidades: Array<{ vencimento: Date | string; ultimoContatoEm?: Date | null }>,
  contatoHoje: (ultimoContatoEm?: Date | null) => boolean
): ResumoEtapaFunil[] {
  const porPonto = new Map<PontoDisparoAutomacao, ResumoEtapaFunil>();

  for (const mensalidade of mensalidades) {
    const dias = calcularDiasVencimento(mensalidade.vencimento);
    const ponto = resolverPontoDisparo(dias);
    if (!ponto) {
      continue;
    }

    const atual = porPonto.get(ponto) ?? {
      ponto,
      rotulo: rotuloPontoDisparo(ponto),
      tipo: tipoRotinaProgressiva(ponto),
      total: 0,
      contactadosHoje: 0,
      pendentes: 0,
    };

    atual.total += 1;
    if (contatoHoje(mensalidade.ultimoContatoEm)) {
      atual.contactadosHoje += 1;
    } else {
      atual.pendentes += 1;
    }

    porPonto.set(ponto, atual);
  }

  return ORDEM_PONTOS_FUNIL.filter((ponto) => porPonto.has(ponto)).map(
    (ponto) => porPonto.get(ponto)!
  );
}

export function calcularDiasVencimentoNaData(
  vencimento: Date | string,
  referencia: Date = new Date()
): number {
  const refUtc = Date.UTC(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate()
  );
  const data = parseDataSomenteDia(vencimento);
  const vencUtc = Date.UTC(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate()
  );
  return Math.ceil((vencUtc - refUtc) / (1000 * 60 * 60 * 24));
}

export const DIAS_ANTECEDENCIA_LEMBRETE_PADRAO = 5;

export function resolverDiasAntecedencia(valor?: number | null): number {
  if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 1 && valor <= 30) {
    return Math.trunc(valor);
  }
  return DIAS_ANTECEDENCIA_LEMBRETE_PADRAO;
}

export function calcularDiasVencimento(vencimento: Date | string): number {
  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const data = parseDataSomenteDia(vencimento);
  const vencUtc = Date.UTC(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate()
  );
  return Math.ceil((vencUtc - hojeUtc) / (1000 * 60 * 60 * 24));
}

export function elegivelCobrancaDiaria(
  vencimento: Date | string,
  diasAntecedencia = DIAS_ANTECEDENCIA_LEMBRETE_PADRAO
): boolean {
  const dias = calcularDiasVencimento(vencimento);
  return dias < 0 || (dias >= 0 && dias <= diasAntecedencia);
}

/** Rotina diária / automação: apenas dias fixos do funil progressivo. */
export function elegivelRotinaCobrancaDiaria(vencimento: Date | string): boolean {
  const dias = calcularDiasVencimento(vencimento);
  return resolverPontoDisparo(dias) !== null && elegivelRotinaProgressiva(dias);
}

export { elegivelRotinaProgressiva } from './automacaoDisparoHelpers.js';

/** Texto relativo ao vencimento para lembretes: "Vence hoje", "Vence em 3 dias", etc. */
export function rotuloPrazoVencimento(diasAteVencer: number): string {
  if (diasAteVencer < 0) {
    const atraso = Math.abs(diasAteVencer);
    return atraso === 1 ? '1 dia atrasado' : `${atraso} dias atrasados`;
  }
  if (diasAteVencer === 0) return 'Vence hoje';
  if (diasAteVencer === 1) return 'Vence amanhã';
  return `Vence em ${diasAteVencer} dias`;
}

export function clienteEhCortesia(
  cliente?: { cortesia?: boolean | null } | null
): boolean {
  return cliente?.cortesia === true;
}

export function clienteParticipaCobrancas(
  cliente?: {
    ativo?: boolean | null;
    incluirCobrancas?: boolean | null;
    cortesia?: boolean | null;
    somenteContato?: boolean | null;
  } | null
): boolean {
  if (cliente?.ativo === false) {
    return false;
  }
  if (cliente?.somenteContato === true) {
    return false;
  }
  if (clienteEhCortesia(cliente)) {
    return false;
  }
  return cliente?.incluirCobrancas !== false;
}
