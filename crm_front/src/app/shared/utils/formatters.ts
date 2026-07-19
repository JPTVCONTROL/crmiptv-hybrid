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

function extrairParteDataIso(valor: string): string | null {
  const match = valor.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function dataIsoParaDateUtc(valor: string | Date): Date {
  if (valor instanceof Date) {
    return new Date(
      Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate(), 12, 0, 0)
    );
  }

  const parte = extrairParteDataIso(valor);
  if (parte) {
    const [ano, mes, dia] = parte.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  }

  const parsed = new Date(valor);
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
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

  const parte = extrairParteDataIso(valor);
  if (parte) {
    return parte;
  }

  const parsed = new Date(valor);
  const ano = parsed.getUTCFullYear();
  const mes = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(parsed.getUTCDate()).padStart(2, '0');
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
