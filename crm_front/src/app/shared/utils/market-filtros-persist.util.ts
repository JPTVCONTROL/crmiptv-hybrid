import { FiltroEnvioCampanha, TipoCampanha } from './campanha';
import { SegmentoPublicoCampanha } from './campanha-publico';
import { lerSessionJson, removerSession, salvarSessionJson } from './session-persist.util';

const CHAVE = 'crm.market.filtrosCampanha';

export type FiltroStatusListaCampanha = 'TODAS' | 'SEM_ENVIOS' | 'COM_ENVIOS';
export type FiltroTipoListaCampanha = 'TODOS' | TipoCampanha;

export interface FiltrosMarketCampanhaPersistidos {
  segmentoPublico: SegmentoPublicoCampanha;
  filtroPlanoId: number | null;
  incluirCortesia: boolean;
  filtroEnvio: FiltroEnvioCampanha;
  busca: string;
}

export interface FiltrosMarketListaPersistidos {
  buscaCampanhas: string;
  filtroStatusLista: FiltroStatusListaCampanha;
  filtroTipoLista: FiltroTipoListaCampanha;
}

export interface FiltrosMarketPersistidos {
  campanha?: FiltrosMarketCampanhaPersistidos;
  lista?: FiltrosMarketListaPersistidos;
}

export function restaurarFiltrosMarket(): FiltrosMarketPersistidos | null {
  return lerSessionJson<FiltrosMarketPersistidos>(CHAVE);
}

export function persistirFiltrosMarketCampanha(
  filtros: FiltrosMarketCampanhaPersistidos
): void {
  const atual = restaurarFiltrosMarket() ?? {};
  salvarSessionJson(CHAVE, { ...atual, campanha: filtros });
}

export function persistirFiltrosMarketLista(
  filtros: FiltrosMarketListaPersistidos
): void {
  const atual = restaurarFiltrosMarket() ?? {};
  salvarSessionJson(CHAVE, { ...atual, lista: filtros });
}

export function limparFiltrosMarketPersistidos(): void {
  removerSession(CHAVE);
}
