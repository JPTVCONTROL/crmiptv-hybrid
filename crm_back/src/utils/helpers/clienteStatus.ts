import { parseDataSomenteDia } from './dateHelpers.js';

export type StatusCliente = 'ATIVO' | 'ATRASADO' | 'INATIVO';

function inicioDiaUtc(data: Date): number {
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

function calcularDiasAteExpiracao(expiraEm: Date | string): number {
  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const data = parseDataSomenteDia(expiraEm);
  const diff = inicioDiaUtc(data) - hojeUtc;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function calcularStatusCliente(
  expiraEm: Date | string | null | undefined
): StatusCliente {
  if (!expiraEm) return 'ATIVO';

  const dias = calcularDiasAteExpiracao(expiraEm);
  if (dias >= 0) return 'ATIVO';
  if (dias >= -7) return 'ATRASADO';
  return 'INATIVO';
}

export function aplicarStatusCliente<T extends { expiraEm: Date | null }>(
  cliente: T
): T & { status: StatusCliente } {
  return {
    ...cliente,
    status: calcularStatusCliente(cliente.expiraEm),
  };
}
