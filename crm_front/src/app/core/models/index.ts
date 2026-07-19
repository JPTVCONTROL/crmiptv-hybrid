export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
}

export interface Aplicativo {
  id: number;
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
  ativo: boolean;
  _count?: { clientes: number };
}

export interface Dispositivo {
  id: number;
  nome: string;
  modelo?: string | null;
  descricao?: string | null;
  ativo: boolean;
  _count?: { clientes: number };
}

export interface ClienteDispositivoResumo {
  id: number;
  nome: string;
  telefone: string;
  macs: string[];
}

export interface ClienteAplicativoResumo {
  id: number;
  nome: string;
  telefone: string;
}

export interface Plano {
  id: number;
  nome: string;
  valor: number;
  diasValidade: number;
  ativo: boolean;
  _count?: { clientes: number };
}

export interface Mensalidade {
  id: number;
  clienteId: number;
  referencia: string;
  valor: number;
  vencimento: string;
  status: string;
  pagoEm?: string | null;
  ultimoContatoEm?: string | null;
  cliente?: Cliente;
}

export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  planoId?: number | null;
  plano?: Plano | null;
  servidor?: string | null;
  usuario?: string | null;
  senha?: string | null;
  aplicativoId?: number | null;
  aplicativo?: Aplicativo | null;
  aparelho?: string | null;
  modelo?: string | null;
  macAddress?: string | null;
  qtdTelas?: number;
  dispositivos?: string | null;
  ativadoEm?: string | null;
  expiraEm?: string | null;
  vencimento: number;
  valorMensal: number;
  status: string;
  observacao?: string | null;
  mensalidades?: Mensalidade[];
}

export interface Configuracao {
  id?: number;
  nomeEmpresa: string;
  whatsapp?: string | null;
  email?: string | null;
  site?: string | null;
  instagram?: string | null;
  chavePix?: string | null;
  tipoPix?: string | null;
  favorecidoPix?: string | null;
  corPrincipal?: string;
  diasAntecedenciaLembrete?: number;
  mensagemBoasVindas?: string | null;
  mensagemCobranca?: string | null;
  mensagemLembrete?: string | null;
  mensagemRenovacao?: string | null;
  mensagemBloqueio?: string | null;
  mensagemRecibo?: string | null;
}

export type CreateClienteDto = Omit<Cliente, 'id' | 'aplicativo' | 'mensalidades' | 'status'>;
export type CreateAplicativoDto = Omit<Aplicativo, 'id' | '_count'>;
export type CreateDispositivoDto = Omit<Dispositivo, 'id' | '_count'>;

export type StatusFinanceiro = 'TODOS' | 'PENDENTE' | 'REGULAR' | 'ATRASADO';

export interface AlertaOperacional {
  tipo:
    | 'ROTINA_PENDENTE'
    | 'VENCE_HOJE'
    | 'SEM_TELEFONE'
    | 'EXPIRADO_SEM_MENSALIDADE'
    | 'NAO_CONTACTADO'
    | 'ROTINA_CONCLUIDA';
  titulo: string;
  descricao: string;
  quantidade: number;
  rota?: string;
}

export interface DashboardResumo {
  clientes: {
    total: number;
    ativos: number;
    atrasados: number;
    inativos: number;
  };
  financeiro: {
    recebidoMes: number;
    aReceberEsteMes: number;
    qtdEsteMes: number;
    vencemHoje: number;
    aReceberProximosMeses: number;
    qtdProximosMeses: number;
  };
  faturamentoMensal: Array<{ mes: string; total: number }>;
  proximosVencimentos: Array<{
    id: number;
    clienteId: number;
    referencia: string;
    valor: number;
    vencimento: string;
    ultimoContatoEm: string | null;
    clienteNome: string;
    telefone: string;
  }>;
  clientesAtencao: Array<{
    id: number;
    nome: string;
    telefone: string;
    expiraEm: string | null;
    status: 'ATRASADO' | 'INATIVO';
    mensalidadePendenteId: number | null;
    mensalidadeReferencia: string | null;
    mensalidadeValor: number | null;
    mensalidadeVencimento: string | null;
  }>;
  cobrancaDiaria: {
    totalElegiveis: number;
    contactadosHoje: number;
    contactaveis: number;
    semTelefone: number;
    naoContactados: number;
    rotinaFeita: boolean;
  };
  alertas: AlertaOperacional[];
}

export interface Usuario {
  id: number;
  email: string;
  nome: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}
