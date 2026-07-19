import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type DominioSync = 'clientes' | 'mensalidades' | 'dashboard' | 'catalogos';

export interface MudancaSync {
  dominios: DominioSync[];
  em: number;
}

@Injectable({ providedIn: 'root' })
export class DadosSyncService {
  private readonly mudancasSubject = new Subject<MudancaSync>();

  readonly mudancas$ = this.mudancasSubject.asObservable();

  notificarClientes(): void {
    this.emit(['clientes', 'mensalidades', 'dashboard', 'catalogos']);
  }

  notificarMensalidades(): void {
    this.emit(['mensalidades', 'clientes', 'dashboard']);
  }

  notificarContatos(): void {
    this.emit(['mensalidades', 'dashboard']);
  }

  notificarConfiguracao(): void {
    this.emit(['dashboard']);
  }

  notificarCatalogos(): void {
    this.emit(['catalogos']);
  }

  notificarTudo(): void {
    this.emit(['clientes', 'mensalidades', 'dashboard', 'catalogos']);
  }

  private emit(dominios: DominioSync[]): void {
    this.mudancasSubject.next({
      dominios: [...new Set(dominios)],
      em: Date.now(),
    });
  }
}
