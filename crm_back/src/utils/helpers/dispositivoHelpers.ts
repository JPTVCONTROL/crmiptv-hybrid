export interface DispositivoClienteJson {
  dispositivoId?: number | null;
  macAddress?: string;
  aparelho?: string;
  modelo?: string;
}

export function parseDispositivosClienteJson(
  raw: string | null | undefined
): DispositivoClienteJson[] {
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizarDispositivoClienteJson);
  } catch {
    return [];
  }
}

export function contarClientesPorDispositivo(
  clientes: Array<{ dispositivos: string | null }>,
  dispositivoId: number
): number {
  let total = 0;

  for (const cliente of clientes) {
    const lista = parseDispositivosClienteJson(cliente.dispositivos);
    if (lista.some((item) => Number(item.dispositivoId) === dispositivoId)) {
      total++;
    }
  }

  return total;
}

function normalizarDispositivoClienteJson(valor: unknown): DispositivoClienteJson {
  if (!valor || typeof valor !== 'object') {
    return { dispositivoId: null, macAddress: '' };
  }

  const item = valor as Record<string, unknown>;
  const dispositivoId = item['dispositivoId'];

  return {
    dispositivoId:
      dispositivoId === null || dispositivoId === undefined
        ? null
        : Number(dispositivoId),
    macAddress: String(item['macAddress'] ?? '').trim(),
    aparelho: item['aparelho'] ? String(item['aparelho']).trim() : undefined,
    modelo: item['modelo'] ? String(item['modelo']).trim() : undefined,
  };
}
