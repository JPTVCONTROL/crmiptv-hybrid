import { Subject, filter, takeUntil } from 'rxjs';
import {
  DadosSyncService,
  DominioSync,
} from '../../core/services/dados-sync.service';

/** Páginas operacionais (dashboard, cobrança, financeiro, etc.). */
export const DOMINIOS_SYNC_OPERACAO: readonly DominioSync[] = [
  'clientes',
  'mensalidades',
  'dashboard',
  'configuracoes',
];

/** Relatórios e visões analíticas. */
export const DOMINIOS_SYNC_RELATORIOS: readonly DominioSync[] = [
  ...DOMINIOS_SYNC_OPERACAO,
  'catalogos',
];

/** Catálogos (planos, apps, dispositivos). */
export const DOMINIOS_SYNC_CATALOGO: readonly DominioSync[] = [
  'catalogos',
  'clientes',
  'mensalidades',
];

/** Campanhas / Market. */
export const DOMINIOS_SYNC_CAMPANHAS: readonly DominioSync[] = [
  'clientes',
  'campanhas',
  'catalogos',
  'configuracoes',
];

/** Ficha do cliente. */
export const DOMINIOS_SYNC_CLIENTE_DETALHE: readonly DominioSync[] = [
  ...DOMINIOS_SYNC_CATALOGO,
  'dashboard',
];

export function vincularSincronizacaoPagina(
  sync: DadosSyncService,
  destroy$: Subject<void>,
  dominios: readonly DominioSync[],
  recarregar: () => void
): void {
  sync.mudancas$
    .pipe(
      filter((evento) =>
        evento.dominios.some((dominio) => dominios.includes(dominio))
      ),
      takeUntil(destroy$)
    )
    .subscribe(() => recarregar());
}
