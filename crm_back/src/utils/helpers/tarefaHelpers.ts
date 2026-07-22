import { parseDataSomenteDia } from './dateHelpers.js';

export function inicioDiaUtc(referencia = new Date()): Date {
  return parseDataSomenteDia(referencia);
}

export function compararDiasTarefa(
  vencimentoEm: Date,
  referencia = inicioDiaUtc()
): number {
  const vencimento = parseDataSomenteDia(vencimentoEm);
  const diffMs = vencimento.getTime() - referencia.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function tarefaEstaAtrasada(
  vencimentoEm: Date,
  referencia = inicioDiaUtc()
): boolean {
  return compararDiasTarefa(vencimentoEm, referencia) < 0;
}

export function tarefaEhHoje(
  vencimentoEm: Date,
  referencia = inicioDiaUtc()
): boolean {
  return compararDiasTarefa(vencimentoEm, referencia) === 0;
}

export function formatarDataIsoUtc(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
