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

export function statusFinanceiro(vencimento: string): 'ATRASADO' | 'PENDENTE' | 'REGULAR' {
  const dias = calcularDias(vencimento);
  if (dias < 0) return 'ATRASADO';
  if (dias <= 3) return 'PENDENTE';
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
