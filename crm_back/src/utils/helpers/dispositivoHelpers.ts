export interface DispositivoClienteJson {
  dispositivoId?: number | null;
  aplicativoId?: number | null;
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
    if (clienteUsaDispositivo(cliente.dispositivos, dispositivoId).usa) {
      total++;
    }
  }

  return total;
}

export function clienteUsaDispositivo(
  dispositivosJson: string | null | undefined,
  dispositivoId: number
): { usa: boolean; macs: string[] } {
  const lista = parseDispositivosClienteJson(dispositivosJson);
  const itens = lista.filter((item) => Number(item.dispositivoId) === dispositivoId);
  const macs = itens
    .map((item) => item.macAddress?.trim())
    .filter((mac): mac is string => !!mac);

  return { usa: itens.length > 0, macs };
}

function normalizarDispositivoClienteJson(valor: unknown): DispositivoClienteJson {
  if (!valor || typeof valor !== 'object') {
    return { dispositivoId: null, macAddress: '' };
  }

  const item = valor as Record<string, unknown>;
  const dispositivoId = item['dispositivoId'];
  const aplicativoId = item['aplicativoId'];

  return {
    dispositivoId:
      dispositivoId === null || dispositivoId === undefined
        ? null
        : Number(dispositivoId),
    aplicativoId:
      aplicativoId === null || aplicativoId === undefined
        ? null
        : Number(aplicativoId),
    macAddress: String(item['macAddress'] ?? '').trim(),
    aparelho: item['aparelho'] ? String(item['aparelho']).trim() : undefined,
    modelo: item['modelo'] ? String(item['modelo']).trim() : undefined,
  };
}
