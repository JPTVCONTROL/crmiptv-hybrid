import { parseDataSomenteDia } from './dateHelpers.js';
import {
  elegivelRotinaProgressiva,
  resolverPontoDisparo,
} from './automacaoDisparoHelpers.js';

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
