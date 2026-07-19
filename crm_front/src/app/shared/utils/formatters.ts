export function aplicarMascaraTelefone(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 2) {
    return numeros.length ? `(${numeros}` : '';
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

export function formatarValor(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarData(data: string | Date): string {
  return new Date(data).toLocaleDateString('pt-BR');
}

export function calcularDias(vencimento: string): number {
  const hoje = new Date();
  const dataVencimento = new Date(vencimento);
  hoje.setHours(0, 0, 0, 0);
  dataVencimento.setHours(0, 0, 0, 0);
  const diferenca = dataVencimento.getTime() - hoje.getTime();
  return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
}

export type StatusCliente = 'ATIVO' | 'ATRASADO' | 'INATIVO';

/** Status do cliente com base na data de expiração do serviço. */
export function statusCliente(expiraEm?: string | null): StatusCliente {
  if (!expiraEm) return 'ATIVO';

  const dias = calcularDias(expiraEm);
  if (dias >= 0) return 'ATIVO';
  if (dias >= -7) return 'ATRASADO';
  return 'INATIVO';
}

export function clienteEstaAtivo(expiraEm?: string | null): boolean {
  return statusCliente(expiraEm) !== 'INATIVO';
}

export function statusFinanceiro(
  vencimento: string,
  diasAntecedencia = 5
): 'ATRASADO' | 'PENDENTE' | 'REGULAR' {
  const dias = calcularDias(vencimento);
  if (dias < 0) return 'ATRASADO';
  if (dias <= diasAntecedencia) return 'PENDENTE';
  return 'REGULAR';
}

export function criarMapaTelefones(
  clientes: { id: number; telefone?: string }[]
): Map<number, string> {
  const mapa = new Map<number, string>();
  for (const cliente of clientes) {
    if (cliente.telefone) {
      mapa.set(cliente.id, cliente.telefone);
    }
  }
  return mapa;
}

export function resolverTelefoneCliente(
  mensalidade: { clienteId: number; cliente?: { telefone?: string } },
  mapa: Map<number, string>
): string {
  return mensalidade.cliente?.telefone ?? mapa.get(mensalidade.clienteId) ?? '';
}
