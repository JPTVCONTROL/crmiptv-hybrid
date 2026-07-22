export const SERVIDORES_PAINEL_FALLBACK = [
  { valor: 'SEVEN', rotulo: 'SEVEN (R$ 6,50/crédito)' },
  { valor: 'ZEUS', rotulo: 'ZEUS (R$ 5,00/crédito)' },
] as const;

const TARIFAS_PADRAO: Record<string, number> = {
  SEVEN: 6.5,
  ZEUS: 5,
};

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

export function mapaTarifasPaineis(
  paineis: Array<{ codigo: string; custoUnitario: number }>
): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (const painel of paineis) {
    mapa[painel.codigo] = painel.custoUnitario;
  }
  return mapa;
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

  return TARIFAS_PADRAO[codigo] ?? 0;
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
