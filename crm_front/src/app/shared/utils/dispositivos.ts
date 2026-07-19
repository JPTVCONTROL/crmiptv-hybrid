export interface DispositivoCatalogo {
  id: number;
  nome: string;
  modelo?: string | null;
  descricao?: string | null;
  ativo: boolean;
  _count?: { clientes: number };
}

export interface AplicativoResumo {
  id: number;
  nome: string;
  android?: string | null;
  androidTv?: string | null;
  ios?: string | null;
  windows?: string | null;
  mac?: string | null;
  ativo: boolean;
}

type PlataformaApp = 'android' | 'androidTv' | 'ios' | 'windows' | 'mac';

const PLATAFORMAS_APP: PlataformaApp[] = [
  'android',
  'androidTv',
  'ios',
  'windows',
  'mac',
];


export interface DispositivoCliente {
  dispositivoId: number | null;
  aplicativoId: number | null;
  macAddress: string;
}

export interface DispositivoClienteLegado {
  aparelho?: string | null;
  modelo?: string | null;
  macAddress?: string | null;
  dispositivos?: string | null;
  qtdTelas?: number | null;
  aplicativoId?: number | null;
}

function plataformasDoDispositivo(
  dispositivo: DispositivoCatalogo
): PlataformaApp[] {
  const texto = `${dispositivo.nome} ${dispositivo.modelo ?? ''} ${
    dispositivo.descricao ?? ''
  }`.toUpperCase();

  if (/IPHONE|IPAD|IOS|APPLE/.test(texto)) {
    return ['ios'];
  }

  if (/TV BOX|TVBOX|ANDROID TV|FIRE|STICK|CHROMECAST|GOOGLE TV/.test(texto)) {
    return ['androidTv', 'android'];
  }

  if (/ANDROID|CELULAR|SMARTPHONE|MOBILE/.test(texto)) {
    return ['android'];
  }

  if (/WINDOWS|PC|NOTEBOOK|COMPUTADOR/.test(texto)) {
    return ['windows'];
  }

  if (/MAC|MACBOOK|IMAC/.test(texto)) {
    return ['mac'];
  }

  if (/\bTV\b|SMART TV/.test(texto)) {
    return ['androidTv', 'android', 'ios'];
  }

  return [...PLATAFORMAS_APP];
}

function appSuportaPlataforma(
  app: AplicativoResumo,
  plataforma: PlataformaApp
): boolean {
  return !!app[plataforma]?.trim();
}

export function aplicativosCompativeisComDispositivo(
  dispositivo: DispositivoCatalogo | undefined,
  aplicativos: AplicativoResumo[]
): AplicativoResumo[] {
  const ativos = aplicativos.filter((app) => app.ativo);

  if (!dispositivo) {
    return [];
  }

  const plataformas = plataformasDoDispositivo(dispositivo);
  const compativeis = ativos.filter((app) =>
    plataformas.some((plataforma) => appSuportaPlataforma(app, plataforma))
  );

  return compativeis.length > 0 ? compativeis : ativos;
}

export function resolverAplicativoIdPrincipal(
  dispositivos: DispositivoCliente[]
): number | null {
  return dispositivos.find((item) => item.aplicativoId)?.aplicativoId ?? null;
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
    return [
      {
        dispositivoId: null,
        aplicativoId: cliente.aplicativoId ?? null,
        macAddress: cliente.macAddress.trim(),
      },
    ];
  }

  if (cliente.aparelho?.trim() || cliente.modelo?.trim()) {
    return [
      {
        dispositivoId: null,
        aplicativoId: cliente.aplicativoId ?? null,
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
    .filter(
      (item) =>
        item.dispositivoId ||
        item.aplicativoId ||
        item.macAddress.trim()
    );

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
  return { dispositivoId: null, aplicativoId: null, macAddress: '' };
}

function normalizarDispositivoCliente(valor: unknown): DispositivoCliente {
  if (!valor || typeof valor !== 'object') {
    return dispositivoVazio();
  }

  const item = valor as Record<string, unknown>;
  const dispositivoId = item['dispositivoId'];
  const aplicativoId = item['aplicativoId'];

  return {
    dispositivoId:
      dispositivoId === null || dispositivoId === undefined || dispositivoId === ''
        ? null
        : Number(dispositivoId),
    aplicativoId:
      aplicativoId === null || aplicativoId === undefined || aplicativoId === ''
        ? null
        : Number(aplicativoId),
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

export function resolverAplicativoCliente(
  item: DispositivoCliente,
  aplicativos: AplicativoResumo[]
): AplicativoResumo | undefined {
  if (!item.aplicativoId) return undefined;
  return aplicativos.find((app) => app.id === item.aplicativoId);
}
