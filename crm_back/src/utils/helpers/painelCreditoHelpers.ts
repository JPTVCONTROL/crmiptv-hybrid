export const PAINEIS_CREDITO_PADRAO = [
  { codigo: 'SEVEN', nome: 'Servidor SEVEN', custoUnitario: 6.5 },
  { codigo: 'ZEUS', nome: 'Painel ZEUS', custoUnitario: 5 },
] as const;

export function normalizarCodigoPainel(servidor?: string | null): string | null {
  const valor = servidor?.trim().toUpperCase() ?? '';
  if (!valor) {
    return null;
  }

  if (valor.includes('SEVEN')) {
    return 'SEVEN';
  }

  if (valor.includes('ZEUS')) {
    return 'ZEUS';
  }

  return valor;
}

export function resolverCustoCreditoPorServidor(
  servidor?: string | null,
  custoPorCodigo?: Record<string, number>
): number {
  const codigo = normalizarCodigoPainel(servidor);
  if (!codigo) {
    return 0;
  }

  if (custoPorCodigo?.[codigo] !== undefined) {
    return custoPorCodigo[codigo] ?? 0;
  }

  const padrao = PAINEIS_CREDITO_PADRAO.find((item) => item.codigo === codigo);
  return padrao?.custoUnitario ?? 0;
}

export function gerarCodigoServidor(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 32);

  return base || 'SERVIDOR';
}
