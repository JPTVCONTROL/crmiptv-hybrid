import { StatusFinanceiro } from '../../core/models';
import {
  lerSessionJson,
  removerSession,
  salvarSessionJson,
} from './session-persist.util';

const CHAVE_FILTROS_FINANCEIRO = 'crm.financeiro.filtros';

export interface FiltrosFinanceiroPersistidos {
  busca: string;
  filtro: StatusFinanceiro;
  pagina: number;
}

const FILTROS_VALIDOS = new Set<StatusFinanceiro>([
  'TODOS',
  'PENDENTE',
  'REGULAR',
  'ATRASADO',
]);

export function persistirFiltrosFinanceiro(
  filtros: FiltrosFinanceiroPersistidos
): void {
  salvarSessionJson(CHAVE_FILTROS_FINANCEIRO, filtros);
}

export function limparFiltrosFinanceiroPersistidos(): void {
  removerSession(CHAVE_FILTROS_FINANCEIRO);
}

export function restaurarFiltrosFinanceiro(): FiltrosFinanceiroPersistidos | null {
  const salvo = lerSessionJson<Partial<FiltrosFinanceiroPersistidos>>(
    CHAVE_FILTROS_FINANCEIRO
  );

  if (!salvo) {
    return null;
  }

  if (
    typeof salvo.busca !== 'string' ||
    !FILTROS_VALIDOS.has(salvo.filtro as StatusFinanceiro) ||
    typeof salvo.pagina !== 'number' ||
    salvo.pagina < 1
  ) {
    return null;
  }

  return {
    busca: salvo.busca,
    filtro: salvo.filtro as StatusFinanceiro,
    pagina: Math.floor(salvo.pagina),
  };
}
