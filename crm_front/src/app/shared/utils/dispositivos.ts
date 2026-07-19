export interface DispositivoCatalogo {
  id: number;
  nome: string;
  modelo?: string | null;
  descricao?: string | null;
  ativo: boolean;
  _count?: { clientes: number };
}

export interface DispositivoCliente {
  dispositivoId: number | null;
  macAddress: string;
}

export interface DispositivoClienteLegado {
  aparelho?: string | null;
  modelo?: string | null;
  macAddress?: string | null;
  dispositivos?: string | null;
  qtdTelas?: number | null;
}

export function rotuloDispositivo(
  dispositivo: Pick<DispositivoCatalogo, 'nome' | 'modelo'>
): string {
  return dispositivo.modelo?.trim()
    ? `${dispositivo.nome} — ${dispositivo.modelo}`
    : dispositivo.nome;
}

export function parseDispositivos(
  cliente: DispositivoClienteLegado
): DispositivoCliente[] {
  if (cliente.dispositivos?.trim()) {
    try {
      const parsed = JSON.parse(cliente.dispositivos) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(normalizarDispositivoCliente);
      }
    } catch {
      /* usa legado abaixo */
    }
  }

  if (cliente.macAddress?.trim()) {
    return [{ dispositivoId: null, macAddress: cliente.macAddress.trim() }];
  }

  if (cliente.aparelho?.trim() || cliente.modelo?.trim()) {
    return [
      {
        dispositivoId: null,
        macAddress: cliente.macAddress?.trim() ?? '',
      },
    ];
  }

  return [dispositivoVazio()];
}

export function criarListaDispositivos(
  qtd: number,
  existentes: DispositivoCliente[] = []
): DispositivoCliente[] {
  const quantidade = Math.max(1, Math.min(5, qtd));
  const lista: DispositivoCliente[] = [];

  for (let i = 0; i < quantidade; i++) {
    lista.push(existentes[i] ? { ...existentes[i] } : dispositivoVazio());
  }

  return lista;
}

export function serializarDispositivos(
  dispositivos: DispositivoCliente[]
): string | null {
  const validos = dispositivos
    .map(normalizarDispositivoCliente)
    .filter((item) => item.dispositivoId || item.macAddress.trim());

  if (validos.length === 0) {
    return null;
  }

  return JSON.stringify(validos);
}

export function sincronizarCamposLegadoDispositivo(
  dispositivos: DispositivoCliente[],
  catalogo: DispositivoCatalogo[] = []
): {
  aparelho: string | null;
  modelo: string | null;
  macAddress: string | null;
} {
  const primeiro = dispositivos[0] ?? dispositivoVazio();
  const itemCatalogo = catalogo.find((item) => item.id === primeiro.dispositivoId);

  return {
    aparelho: itemCatalogo?.nome ?? null,
    modelo: itemCatalogo?.modelo ?? null,
    macAddress: primeiro.macAddress.trim() || null,
  };
}

export function montarAtualizacaoDispositivos(
  cliente: DispositivoClienteLegado,
  indiceTela: number,
  dispositivo: DispositivoCliente,
  qtdTelasInformada?: number,
  catalogo: DispositivoCatalogo[] = []
): {
  qtdTelas: number;
  dispositivos: string | null;
  aparelho: string | null;
  modelo: string | null;
  macAddress: string | null;
} {
  const qtdBase = qtdTelasInformada ?? cliente.qtdTelas ?? 1;
  const qtd = Math.max(qtdBase, indiceTela, 1);
  const lista = criarListaDispositivos(qtd, parseDispositivos(cliente));
  const idx = Math.max(0, Math.min(lista.length - 1, indiceTela - 1));

  lista[idx] = normalizarDispositivoCliente(dispositivo);

  return {
    qtdTelas: qtd,
    dispositivos: serializarDispositivos(lista),
    ...sincronizarCamposLegadoDispositivo(lista, catalogo),
  };
}

function dispositivoVazio(): DispositivoCliente {
  return { dispositivoId: null, macAddress: '' };
}

function normalizarDispositivoCliente(valor: unknown): DispositivoCliente {
  if (!valor || typeof valor !== 'object') {
    return dispositivoVazio();
  }

  const item = valor as Record<string, unknown>;
  const dispositivoId = item['dispositivoId'];

  return {
    dispositivoId:
      dispositivoId === null || dispositivoId === undefined || dispositivoId === ''
        ? null
        : Number(dispositivoId),
    macAddress: String(item['macAddress'] ?? '').trim(),
  };
}

export function resolverDispositivoCliente(
  item: DispositivoCliente,
  catalogo: DispositivoCatalogo[]
): DispositivoCatalogo | undefined {
  if (!item.dispositivoId) return undefined;
  return catalogo.find((dispositivo) => dispositivo.id === item.dispositivoId);
}
