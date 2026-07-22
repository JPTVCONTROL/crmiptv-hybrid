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
  requerMac: boolean;
  requerDeviceKey: boolean;
  requerCodigo: boolean;
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
  bloqueioEnviadoEm?: string | null;
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
  incluirCobrancas?: boolean;
  incluirCampanhas?: boolean;
  ativo?: boolean;
  cortesia?: boolean;
  somenteContato?: boolean;
  status: string;
  observacao?: string | null;
  mensalidades?: Mensalidade[];
}

export interface ImportacaoClientesResultado {
  importados: number;
  ignorados: number;
  erros: Array<{ linha: number; motivo: string }>;
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
  metaNovosClientesQtd?: number;
  metaNovosClientesDias?: number;
  metaNovosClientesInicioEm?: string | null;
  metaNovosClientesFimEm?: string | null;
  mensagemBoasVindas?: string | null;
  mensagemCobranca?: string | null;
  mensagemLembrete?: string | null;
  mensagemRenovacao?: string | null;
  mensagemBloqueio?: string | null;
  mensagemRecibo?: string | null;
  /** JSON serializado — overrides do funil progressivo por etapa. */
  mensagensProgressivas?: string | null;
}

export type CreateClienteDto = Omit<Cliente, 'id' | 'aplicativo' | 'mensalidades' | 'status'>;
export type CreateAplicativoDto = Omit<Aplicativo, 'id' | '_count'>;
export type CreateDispositivoDto = Omit<Dispositivo, 'id' | '_count'>;

export type StatusFinanceiro = 'TODOS' | 'PENDENTE' | 'REGULAR' | 'ATRASADO';

export interface AlertaOperacional {
  tipo:
    | 'CADASTRO_SEM_TELEFONE'
    | 'CADASTRO_SEM_PLANO'
    | 'CADASTRO_SEM_VALOR'
    | 'CADASTRO_SEM_EXPIRACAO'
    | 'CADASTRO_SEM_CREDENCIAIS'
    | 'CADASTRO_SEM_APLICATIVO'
    | 'CADASTRO_SEM_MAC'
    | 'CADASTRO_INCOMPLETO'
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
    cortesia: number;
    somenteContato: number;
    cadastrosIncompletos: number;
  };
  financeiro: {
    recebidoHoje: number;
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
    bloqueioEnviadoEm?: string | null;
  }>;
  cobrancaDiaria: {
    totalElegiveis: number;
    contactadosHoje: number;
    contactaveis: number;
    semTelefone: number;
    naoContactados: number;
    rotinaFeita: boolean;
    etapasFunil: Array<{
      ponto: string;
      rotulo: string;
      tipo: 'LEMBRETE' | 'COBRANCA';
      total: number;
      contactadosHoje: number;
      pendentes: number;
    }>;
  };
  alertas: AlertaOperacional[];
  metricas: {
    mrr: number;
    arr: number;
    arrMesesRestantes: number;
    arrAno: number;
    ticketMedio: number;
    conexoes: number;
    novosClientesPeriodo: number;
    metaClientesAtual: number;
    metaNovosClientesQtd: number;
    metaNovosClientesInicioEm: string;
    metaNovosClientesFimEm: string;
    metaNovosClientesDias: number;
    metaNovosClientesDiasRestantes: number;
    metaNovosClientesEncerrada: boolean;
    metaNovosClientesPercentual: number;
    metaNovosClientesAtingida: boolean;
    variacaoNovosClientes: number;
    vencendoQtd: number;
    vencendoValor: number;
    cobrancaAtrasadaQtd: number;
    cobrancaAtrasadaValor: number;
    retencaoPercentual: number;
    churnPercentual: number;
    inadimplenciaPercentual: number;
    ganhosProximoAno: number;
    ganhosProximoAnoAno: number;
  };
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

export type TipoCampanha = 'AVISO' | 'PROMOCAO' | 'DATA_COMEMORATIVA';

export interface CampanhaEnvioResumo {
  clienteId: number;
  enviadoEm: string;
}

export interface Campanha {
  id: number;
  titulo: string;
  tipo: TipoCampanha;
  mensagem: string;
  createdAt: string;
  updatedAt: string;
  _count?: { envios: number };
  envios?: CampanhaEnvioResumo[];
}

export interface CreateCampanhaDto {
  titulo: string;
  tipo: TipoCampanha;
  mensagem: string;
}
