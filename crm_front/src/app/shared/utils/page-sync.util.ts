import { Subject, filter, takeUntil } from 'rxjs';
import {
  DadosSyncService,
  DominioSync,
} from '../../core/services/dados-sync.service';

export function vincularSincronizacaoPagina(
  sync: DadosSyncService,
  destroy$: Subject<void>,
  dominios: DominioSync[],
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
