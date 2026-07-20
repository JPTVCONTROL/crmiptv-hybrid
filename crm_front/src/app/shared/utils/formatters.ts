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

export function dataIsoParaDateUtc(valor: string | Date): Date {
  if (valor instanceof Date) {
    return new Date(
      Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate(), 12, 0, 0)
    );
  }

  const trimmed = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [ano, mes, dia] = trimmed.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  }

  const parsed = new Date(valor);
  return new Date(
    Date.UTC(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      12,
      0,
      0
    )
  );
}

export function dataIsoParaInput(valor?: string | null): string {
  if (!valor?.trim()) {
    return '';
  }

  const trimmed = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(valor);
  const ano = parsed.getFullYear();
  const mes = String(parsed.getMonth() + 1).padStart(2, '0');
  const dia = String(parsed.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function inicioDiaUtc(valor: string | Date): number {
  const data = dataIsoParaDateUtc(valor);
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

export function formatarData(data: string | Date): string {
  const parsed = dataIsoParaDateUtc(data);
  const dia = String(parsed.getUTCDate()).padStart(2, '0');
  const mes = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const ano = parsed.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

export function calcularDias(vencimento: string): number {
  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const vencUtc = inicioDiaUtc(vencimento);
  return Math.ceil((vencUtc - hojeUtc) / (1000 * 60 * 60 * 24));
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

/** Rótulo amigável do status de cobrança no Financeiro (não confundir com pagamento quitado). */
export function rotuloStatusFinanceiro(
  status: 'ATRASADO' | 'PENDENTE' | 'REGULAR' | 'TODOS'
): string {
  switch (status) {
    case 'ATRASADO':
      return 'Atrasado';
    case 'PENDENTE':
      return 'Vencendo';
    case 'REGULAR':
      return 'Longe do vencimento';
    case 'TODOS':
      return 'Todos';
    default:
      return status;
  }
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
