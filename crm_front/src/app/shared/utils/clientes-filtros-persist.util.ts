import { TipoPendenciaCadastro } from './cliente-cadastro-audit';
import {
  lerSessionJson,
  removerSession,
  salvarSessionJson,
} from './session-persist.util';

const CHAVE_FILTROS_CLIENTES = 'crm.clientes.filtros';

export type FiltroStatusClientePersist =
  | 'TODOS'
  | 'ATIVO'
  | 'ATRASADO'
  | 'INATIVO';

export type FiltroCobrancaClientePersist =
  | 'TODOS'
  | 'COM_COBRANCA'
  | 'SEM_COBRANCA';

export type ColunaOrdenacaoClientePersist =
  | 'nome'
  | 'aplicativo'
  | 'vencimento'
  | 'status';

export type DirecaoOrdenacaoPersist = 'asc' | 'desc';

export type ModoOrdenacaoAplicativoPersist =
  | 'az'
  | 'za'
  | 'sem_primeiro'
  | 'sem_ultimo';

export type ModoOrdenacaoStatusPersist =
  | 'atrasado_primeiro'
  | 'ativo_primeiro'
  | 'inativo_primeiro';

export interface FiltrosClientesPersistidos {
  busca: string;
  filtroStatus: FiltroStatusClientePersist;
  filtroAplicativoId: number | null;
  filtroPlanoId: number | null;
  filtroCadastro: TipoPendenciaCadastro | null;
  filtroCobranca: FiltroCobrancaClientePersist;
  filtroCadastroIncompleto: boolean;
  pagina: number;
  ordenacaoColuna: ColunaOrdenacaoClientePersist;
  ordenacaoDirecao: DirecaoOrdenacaoPersist;
  modoOrdenacaoAplicativo: ModoOrdenacaoAplicativoPersist;
  modoOrdenacaoStatus: ModoOrdenacaoStatusPersist;
}

const STATUS_VALIDOS = new Set<FiltroStatusClientePersist>([
  'TODOS',
  'ATIVO',
  'ATRASADO',
  'INATIVO',
]);

const COBRANCA_VALIDOS = new Set<FiltroCobrancaClientePersist>([
  'TODOS',
  'COM_COBRANCA',
  'SEM_COBRANCA',
]);

const COLUNAS_VALIDAS = new Set<ColunaOrdenacaoClientePersist>([
  'nome',
  'aplicativo',
  'vencimento',
  'status',
]);

const MODOS_APLICATIVO = new Set<ModoOrdenacaoAplicativoPersist>([
  'az',
  'za',
  'sem_primeiro',
  'sem_ultimo',
]);

const MODOS_STATUS = new Set<ModoOrdenacaoStatusPersist>([
  'atrasado_primeiro',
  'ativo_primeiro',
  'inativo_primeiro',
]);

export function persistirFiltrosClientes(
  filtros: FiltrosClientesPersistidos
): void {
  salvarSessionJson(CHAVE_FILTROS_CLIENTES, filtros);
}

export function limparFiltrosClientesPersistidos(): void {
  removerSession(CHAVE_FILTROS_CLIENTES);
}

export function restaurarFiltrosClientes(): FiltrosClientesPersistidos | null {
  const salvo = lerSessionJson<Partial<FiltrosClientesPersistidos>>(
    CHAVE_FILTROS_CLIENTES
  );

  if (!salvo) {
    return null;
  }

  if (
    typeof salvo.busca !== 'string' ||
    !STATUS_VALIDOS.has(salvo.filtroStatus as FiltroStatusClientePersist) ||
    !COBRANCA_VALIDOS.has(
      salvo.filtroCobranca as FiltroCobrancaClientePersist
    ) ||
    !COLUNAS_VALIDAS.has(
      salvo.ordenacaoColuna as ColunaOrdenacaoClientePersist
    ) ||
    (salvo.ordenacaoDirecao !== 'asc' && salvo.ordenacaoDirecao !== 'desc') ||
    !MODOS_APLICATIVO.has(
      salvo.modoOrdenacaoAplicativo as ModoOrdenacaoAplicativoPersist
    ) ||
    !MODOS_STATUS.has(salvo.modoOrdenacaoStatus as ModoOrdenacaoStatusPersist) ||
    typeof salvo.filtroCadastroIncompleto !== 'boolean' ||
    typeof salvo.pagina !== 'number' ||
    salvo.pagina < 1
  ) {
    return null;
  }

  return {
    busca: salvo.busca,
    filtroStatus: salvo.filtroStatus as FiltroStatusClientePersist,
    filtroAplicativoId:
      typeof salvo.filtroAplicativoId === 'number'
        ? salvo.filtroAplicativoId
        : null,
    filtroPlanoId:
      typeof salvo.filtroPlanoId === 'number' ? salvo.filtroPlanoId : null,
    filtroCadastro:
      typeof salvo.filtroCadastro === 'string' ? salvo.filtroCadastro : null,
    filtroCobranca: salvo.filtroCobranca as FiltroCobrancaClientePersist,
    filtroCadastroIncompleto: salvo.filtroCadastroIncompleto,
    pagina: Math.floor(salvo.pagina),
    ordenacaoColuna: salvo.ordenacaoColuna as ColunaOrdenacaoClientePersist,
    ordenacaoDirecao: salvo.ordenacaoDirecao,
    modoOrdenacaoAplicativo:
      salvo.modoOrdenacaoAplicativo as ModoOrdenacaoAplicativoPersist,
    modoOrdenacaoStatus: salvo.modoOrdenacaoStatus as ModoOrdenacaoStatusPersist,
  };
}
