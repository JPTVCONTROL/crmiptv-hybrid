import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import {
  DadosSyncService,
  DominioSync,
} from '../../core/services/dados-sync.service';

/** Mantém modais de catálogo sincronizados enquanto abertos. */
export function vincularSyncModal(
  sync: DadosSyncService,
  destroy$: Subject<void>,
  dominios: DominioSync[],
  recarregar: () => void
): void {
  sync.mudancas$
    .pipe(
      takeUntil(destroy$),
      filter((evento) =>
        evento.dominios.some((dominio) => dominios.includes(dominio))
      )
    )
    .subscribe(() => recarregar());
}
