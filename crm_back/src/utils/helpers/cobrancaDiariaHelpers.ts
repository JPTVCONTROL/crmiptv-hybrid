import { parseDataSomenteDia } from './dateHelpers.js';

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

export function clienteEhCortesia(
  cliente?: { cortesia?: boolean | null } | null
): boolean {
  return cliente?.cortesia === true;
}

export function clienteParticipaCobrancas(
  cliente?: { incluirCobrancas?: boolean | null; cortesia?: boolean | null } | null
): boolean {
  if (clienteEhCortesia(cliente)) {
    return false;
  }
  return cliente?.incluirCobrancas !== false;
}
