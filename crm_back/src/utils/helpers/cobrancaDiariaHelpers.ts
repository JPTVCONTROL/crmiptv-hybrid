import { inicioDoDia } from './contatoHelpers.js';

export const DIAS_ANTECEDENCIA_LEMBRETE_PADRAO = 5;

export function resolverDiasAntecedencia(valor?: number | null): number {
  if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 1 && valor <= 30) {
    return Math.trunc(valor);
  }
  return DIAS_ANTECEDENCIA_LEMBRETE_PADRAO;
}

export function calcularDiasVencimento(vencimento: Date | string): number {
  const hoje = inicioDoDia(new Date());
  const data = inicioDoDia(new Date(vencimento));
  return Math.round((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function elegivelCobrancaDiaria(
  vencimento: Date | string,
  diasAntecedencia = DIAS_ANTECEDENCIA_LEMBRETE_PADRAO
): boolean {
  const dias = calcularDiasVencimento(vencimento);
  return dias < 0 || (dias >= 0 && dias <= diasAntecedencia);
}
