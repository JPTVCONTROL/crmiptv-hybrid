import { calcularStatusCliente } from './clienteStatus.js';
import { telefoneValidoParaWhatsApp } from './contatoHelpers.js';
import { parseDispositivosClienteJson } from './dispositivoHelpers.js';

export type TipoPendenciaCadastro =
  | 'SEM_TELEFONE'
  | 'SEM_PLANO'
  | 'SEM_VALOR'
  | 'SEM_EXPIRACAO'
  | 'SEM_CREDENCIAIS'
  | 'SEM_APLICATIVO'
  | 'SEM_MAC';

export interface ClienteParaAuditoriaCadastro {
  telefone: string;
  planoId: number | null;
  valorMensal: number;
  cortesia?: boolean;
  expiraEm: Date | null;
  servidor: string | null;
  usuario: string | null;
  senha: string | null;
  aplicativoId: number | null;
  dispositivos: string | null;
  macAddress: string | null;
}

export interface AplicativoRequisitosCadastro {
  id: number;
  requerMac: boolean;
  requerDeviceKey: boolean;
  requerCodigo: boolean;
}

export interface ResumoPendenciasCadastro {
  semTelefone: number;
  semPlano: number;
  semValor: number;
  semExpiracao: number;
  semCredenciais: number;
  semAplicativo: number;
  semMac: number;
}

function textoPreenchido(valor?: string | null): boolean {
  return !!valor?.trim();
}

function telasDoCliente(cliente: ClienteParaAuditoriaCadastro) {
  const telas = parseDispositivosClienteJson(cliente.dispositivos);

  if (telas.length === 0 && cliente.macAddress?.trim()) {
    return [{ dispositivoId: null, aplicativoId: null, macAddress: cliente.macAddress.trim() }];
  }

  return telas;
}

function idsAplicativosDoCliente(cliente: ClienteParaAuditoriaCadastro): number[] {
  const ids = new Set<number>();

  if (cliente.aplicativoId) {
    ids.add(cliente.aplicativoId);
  }

  for (const tela of telasDoCliente(cliente)) {
    if (tela.aplicativoId && tela.aplicativoId > 0) {
      ids.add(tela.aplicativoId);
    }
  }

  return [...ids];
}

function clienteExigeMac(
  cliente: ClienteParaAuditoriaCadastro,
  aplicativos: Map<number, AplicativoRequisitosCadastro>
): boolean {
  return idsAplicativosDoCliente(cliente).some(
    (id) => aplicativos.get(id)?.requerMac
  );
}

export function clienteGerenciado(expiraEm: Date | null): boolean {
  const status = calcularStatusCliente(expiraEm);
  return status === 'ATIVO' || status === 'ATRASADO';
}

export function pendenciasCadastroDoCliente(
  cliente: ClienteParaAuditoriaCadastro,
  aplicativos: Map<number, AplicativoRequisitosCadastro> = new Map()
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

  const telas = telasDoCliente(cliente);
  const temAplicativo =
    !!cliente.aplicativoId ||
    telas.some((tela) => !!tela.aplicativoId && tela.aplicativoId > 0);

  if (!temAplicativo) {
    pendencias.push('SEM_APLICATIVO');
  }

  const temMac =
    telas.some((tela) => textoPreenchido(tela.macAddress)) ||
    textoPreenchido(cliente.macAddress);

  if (clienteExigeMac(cliente, aplicativos) && !temMac) {
    pendencias.push('SEM_MAC');
  }

  return pendencias;
}

export function clienteTemPendenciaCadastro(
  cliente: ClienteParaAuditoriaCadastro,
  tipo: TipoPendenciaCadastro,
  aplicativos: Map<number, AplicativoRequisitosCadastro> = new Map()
): boolean {
  return pendenciasCadastroDoCliente(cliente, aplicativos).includes(tipo);
}

export function resumirPendenciasCadastro(
  clientes: Array<ClienteParaAuditoriaCadastro & { expiraEm: Date | null }>,
  aplicativos: Map<number, AplicativoRequisitosCadastro> = new Map()
): ResumoPendenciasCadastro {
  const resumo: ResumoPendenciasCadastro = {
    semTelefone: 0,
    semPlano: 0,
    semValor: 0,
    semExpiracao: 0,
    semCredenciais: 0,
    semAplicativo: 0,
    semMac: 0,
  };

  for (const cliente of clientes) {
    if (!clienteGerenciado(cliente.expiraEm)) {
      continue;
    }

    const pendencias = pendenciasCadastroDoCliente(cliente, aplicativos);
    if (pendencias.includes('SEM_TELEFONE')) resumo.semTelefone += 1;
    if (pendencias.includes('SEM_PLANO')) resumo.semPlano += 1;
    if (pendencias.includes('SEM_VALOR')) resumo.semValor += 1;
    if (pendencias.includes('SEM_EXPIRACAO')) resumo.semExpiracao += 1;
    if (pendencias.includes('SEM_CREDENCIAIS')) resumo.semCredenciais += 1;
    if (pendencias.includes('SEM_APLICATIVO')) resumo.semAplicativo += 1;
    if (pendencias.includes('SEM_MAC')) resumo.semMac += 1;
  }

  return resumo;
}

export function rotaPendenciaCadastro(tipo: TipoPendenciaCadastro): string {
  return `/clientes?cadastro=${tipo.toLowerCase()}`;
}

export function clienteCadastroIncompleto(
  cliente: ClienteParaAuditoriaCadastro & { expiraEm: Date | null },
  aplicativos: Map<number, AplicativoRequisitosCadastro> = new Map()
): boolean {
  if (
    !cliente.expiraEm ||
    (!cliente.cortesia && (!cliente.valorMensal || cliente.valorMensal <= 0))
  ) {
    return true;
  }

  if (!clienteGerenciado(cliente.expiraEm)) {
    return false;
  }

  return pendenciasCadastroDoCliente(cliente, aplicativos).length > 0;
}

export function contarCadastrosIncompletos(
  clientes: Array<ClienteParaAuditoriaCadastro & { expiraEm: Date | null }>,
  aplicativos: Map<number, AplicativoRequisitosCadastro> = new Map()
): number {
  return clientes.filter((cliente) =>
    clienteCadastroIncompleto(cliente, aplicativos)
  ).length;
}
