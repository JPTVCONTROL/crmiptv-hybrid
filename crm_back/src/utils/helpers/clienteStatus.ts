export type StatusCliente = 'ATIVO' | 'ATRASADO' | 'INATIVO';

function calcularDiasAteExpiracao(expiraEm: Date | string): number {
  const hoje = new Date();
  const data = new Date(expiraEm);
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  const diferenca = data.getTime() - hoje.getTime();
  return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
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
