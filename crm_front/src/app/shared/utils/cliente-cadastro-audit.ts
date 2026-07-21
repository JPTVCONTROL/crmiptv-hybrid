import { Cliente } from '../../core/models';
import { statusCliente } from './formatters';
import { telefoneValidoParaWhatsApp } from './whatsapp';
import { parseDispositivos } from './dispositivos';

export interface AplicativoRequisitosCadastro {
  id: number;
  requerMac: boolean;
  requerDeviceKey: boolean;
  requerCodigo: boolean;
}

export type TipoPendenciaCadastro =
  | 'SEM_TELEFONE'
  | 'SEM_PLANO'
  | 'SEM_VALOR'
  | 'SEM_EXPIRACAO'
  | 'SEM_CREDENCIAIS'
  | 'SEM_APLICATIVO'
  | 'SEM_MAC';

export type FiltroCadastroQuery =
  | 'sem_telefone'
  | 'sem_plano'
  | 'sem_valor'
  | 'sem_expiracao'
  | 'sem_credenciais'
  | 'sem_aplicativo'
  | 'sem_mac';

const MAPA_FILTRO: Record<FiltroCadastroQuery, TipoPendenciaCadastro> = {
  sem_telefone: 'SEM_TELEFONE',
  sem_plano: 'SEM_PLANO',
  sem_valor: 'SEM_VALOR',
  sem_expiracao: 'SEM_EXPIRACAO',
  sem_credenciais: 'SEM_CREDENCIAIS',
  sem_aplicativo: 'SEM_APLICATIVO',
  sem_mac: 'SEM_MAC',
};

const ROTULOS_PENDENCIA: Record<TipoPendenciaCadastro, string> = {
  SEM_TELEFONE: 'Telefone inválido ou ausente',
  SEM_PLANO: 'Sem plano vinculado',
  SEM_VALOR: 'Sem valor mensal',
  SEM_EXPIRACAO: 'Sem data de expiração',
  SEM_CREDENCIAIS: 'Credenciais IPTV incompletas',
  SEM_APLICATIVO: 'Sem aplicativo IPTV',
  SEM_MAC: 'Sem MAC cadastrada',
};

const ROTULOS_CURTOS: Record<TipoPendenciaCadastro, string> = {
  SEM_TELEFONE: 'Telefone',
  SEM_PLANO: 'Plano',
  SEM_VALOR: 'Valor',
  SEM_EXPIRACAO: 'Expiração',
  SEM_CREDENCIAIS: 'Credenciais',
  SEM_APLICATIVO: 'App',
  SEM_MAC: 'MAC',
};

const ICONES_PENDENCIA: Record<TipoPendenciaCadastro, string> = {
  SEM_TELEFONE: 'call-outline',
  SEM_PLANO: 'layers-outline',
  SEM_VALOR: 'cash-outline',
  SEM_EXPIRACAO: 'calendar-outline',
  SEM_CREDENCIAIS: 'key-outline',
  SEM_APLICATIVO: 'apps-outline',
  SEM_MAC: 'hardware-chip-outline',
};

export type SeveridadePendencia = 'critica' | 'aviso';

export function severidadePendencia(
  tipo: TipoPendenciaCadastro
): SeveridadePendencia {
  if (
    tipo === 'SEM_TELEFONE' ||
    tipo === 'SEM_CREDENCIAIS' ||
    tipo === 'SEM_MAC'
  ) {
    return 'critica';
  }

  return 'aviso';
}

function textoPreenchido(valor?: string | null): boolean {
  return !!valor?.trim();
}

function resolverAppCadastro(
  aplicativoId: number,
  cliente: Cliente,
  aplicativos?: AplicativoRequisitosCadastro[]
): AplicativoRequisitosCadastro | undefined {
  if (cliente.aplicativo?.id === aplicativoId) {
    return {
      id: cliente.aplicativo.id,
      requerMac: cliente.aplicativo.requerMac,
      requerDeviceKey: cliente.aplicativo.requerDeviceKey,
      requerCodigo: cliente.aplicativo.requerCodigo,
    };
  }

  return aplicativos?.find((app) => app.id === aplicativoId);
}

function idsAplicativosDoCliente(cliente: Cliente): number[] {
  const ids = new Set<number>();

  if (cliente.aplicativoId) {
    ids.add(cliente.aplicativoId);
  }

  for (const tela of parseDispositivos(cliente)) {
    if (tela.aplicativoId) {
      ids.add(tela.aplicativoId);
    }
  }

  return [...ids];
}

function clienteExigeMac(
  cliente: Cliente,
  aplicativos?: AplicativoRequisitosCadastro[]
): boolean {
  return idsAplicativosDoCliente(cliente).some(
    (id) => resolverAppCadastro(id, cliente, aplicativos)?.requerMac
  );
}

export function clienteGerenciado(cliente: Cliente): boolean {
  const status = statusCliente(cliente.expiraEm);
  return status === 'ATIVO' || status === 'ATRASADO';
}

export function pendenciasCadastroDoCliente(
  cliente: Cliente,
  aplicativos?: AplicativoRequisitosCadastro[]
): TipoPendenciaCadastro[] {
  const pendencias: TipoPendenciaCadastro[] = [];

  if (!telefoneValidoParaWhatsApp(cliente.telefone)) {
    pendencias.push('SEM_TELEFONE');
  }

  if (!cliente.cortesia && !cliente.planoId) {
    pendencias.push('SEM_PLANO');
  }

  if (!cliente.cortesia && (!cliente.valorMensal || cliente.valorMensal <= 0)) {
    pendencias.push('SEM_VALOR');
  }

  if (!cliente.expiraEm) {
    pendencias.push('SEM_EXPIRACAO');
  }

  if (
    !textoPreenchido(cliente.servidor) ||
    !textoPreenchido(cliente.usuario) ||
    !textoPreenchido(cliente.senha)
  ) {
    pendencias.push('SEM_CREDENCIAIS');
  }

  const telas = parseDispositivos(cliente);
  const temAplicativo =
    !!cliente.aplicativoId || telas.some((tela) => !!tela.aplicativoId);

  if (!temAplicativo) {
    pendencias.push('SEM_APLICATIVO');
  }

  const temMac = telas.some((tela) => textoPreenchido(tela.macAddress));

  if (clienteExigeMac(cliente, aplicativos) && !temMac) {
    pendencias.push('SEM_MAC');
  }

  return pendencias;
}

export function clienteTemPendenciaCadastro(
  cliente: Cliente,
  tipo: TipoPendenciaCadastro,
  aplicativos?: AplicativoRequisitosCadastro[]
): boolean {
  if (!clienteGerenciado(cliente)) {
    return false;
  }

  return pendenciasCadastroDoCliente(cliente, aplicativos).includes(tipo);
}

export function resolverFiltroCadastro(
  valor: string | null
): TipoPendenciaCadastro | null {
  if (!valor) return null;

  return MAPA_FILTRO[valor as FiltroCadastroQuery] ?? null;
}

export function rotuloFiltroCadastro(tipo: TipoPendenciaCadastro): string {
  return ROTULOS_PENDENCIA[tipo];
}

export function rotuloCurtoPendencia(tipo: TipoPendenciaCadastro): string {
  return ROTULOS_CURTOS[tipo];
}

export function iconePendenciaCadastro(tipo: TipoPendenciaCadastro): string {
  return ICONES_PENDENCIA[tipo];
}

export function pendenciasGerenciadasDoCliente(
  cliente: Cliente,
  aplicativos?: AplicativoRequisitosCadastro[]
): TipoPendenciaCadastro[] {
  if (!clienteGerenciado(cliente)) {
    return [];
  }

  return pendenciasCadastroDoCliente(cliente, aplicativos);
}

export function filtroCadastroParaQuery(
  tipo: TipoPendenciaCadastro
): FiltroCadastroQuery {
  return tipo.toLowerCase() as FiltroCadastroQuery;
}

export function clienteCadastroIncompleto(
  cliente: Cliente,
  aplicativos?: AplicativoRequisitosCadastro[]
): boolean {
  if (!cliente.expiraEm || (!cliente.cortesia && cliente.valorMensal <= 0)) {
    return true;
  }

  return pendenciasGerenciadasDoCliente(cliente, aplicativos).length > 0;
}
