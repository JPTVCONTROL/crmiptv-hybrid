import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavegacaoService {
  private navegacoesInternas = 0;
  private inicializado = false;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        if (!this.inicializado) {
          this.inicializado = true;
          return;
        }

        this.navegacoesInternas++;
      });
  }

  podeVoltar(url: string): boolean {
    const path = url.split('?')[0];
    return path !== '/login' && path !== '/dashboard';
  }

  temHistoricoNavegacao(): boolean {
    return this.navegacoesInternas > 0 || window.history.length > 1;
  }
}
