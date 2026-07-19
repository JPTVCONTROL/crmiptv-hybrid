import type { Cliente, Mensalidade, Aplicativo, Configuracao } from '@prisma/client';

export type ClienteWithRelations = Cliente & {
  aplicativo?: Aplicativo | null;
  plano?: { id: number; nome: string; valor: number; diasValidade: number; ativo: boolean } | null;
  mensalidades?: Mensalidade[];
};

export type MensalidadeWithCliente = Mensalidade & {
  cliente: Cliente;
};

export type AplicativoWithCount = Aplicativo & {
  _count: { clientes: number };
};

export interface CreatePlanoDto {
  nome: string;
  valor: number;
  diasValidade: number;
  ativo?: boolean;
}

export type UpdatePlanoDto = Partial<CreatePlanoDto>;

export type PlanoWithCount = {
  id: number;
  nome: string;
  valor: number;
  diasValidade: number;
  ativo: boolean;
  createdAt: Date;
  _count: { clientes: number };
};

export interface CreateClienteDto {
  nome: string;
  telefone: string;
  planoId?: number | null;
  aplicativoId?: number | null;
  servidor?: string | null;
  usuario?: string | null;
  senha?: string | null;
  aparelho?: string | null;
  modelo?: string | null;
  macAddress?: string | null;
  qtdTelas?: number;
  dispositivos?: string | null;
  ativadoEm?: string | null;
  expiraEm?: string | null;
  vencimento: number;
  valorMensal: number;
  observacao?: string | null;
}

export interface UpdateClienteDto extends Partial<CreateClienteDto> {}

export interface CreateDispositivoDto {
  nome: string;
  modelo?: string | null;
  descricao?: string | null;
  ativo?: boolean;
}

export type UpdateDispositivoDto = Partial<CreateDispositivoDto>;

export type DispositivoWithCount = {
  id: number;
  nome: string;
  modelo?: string | null;
  descricao?: string | null;
  ativo: boolean;
  createdAt: Date;
  _count: { clientes: number };
};

export interface CreateAplicativoDto {
  nome: string;
  descricao?: string | null;
  logo?: string | null;
  android?: string | null;
  androidTv?: string | null;
  ios?: string | null;
  windows?: string | null;
  mac?: string | null;
  tutorial?: string | null;
  mensagem?: string | null;
  ativo?: boolean;
}

export type UpdateAplicativoDto = Partial<CreateAplicativoDto>;

export type UpdateConfiguracaoDto = Partial<
  Omit<Configuracao, 'id' | 'createdAt' | 'updatedAt'>
>;

export const CONFIGURACAO_CAMPOS_PERMITIDOS = [
  'nomeEmpresa',
  'whatsapp',
  'email',
  'site',
  'instagram',
  'chavePix',
  'tipoPix',
  'favorecidoPix',
  'corPrincipal',
  'mensagemBoasVindas',
  'mensagemCobranca',
  'mensagemRenovacao',
  'mensagemBloqueio',
  'mensagemRecibo',
] as const;
