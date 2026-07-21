import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type DominioSync =
  | 'clientes'
  | 'mensalidades'
  | 'dashboard'
  | 'catalogos'
  | 'configuracoes'
  | 'campanhas';

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
    this.emit(['mensalidades', 'clientes', 'dashboard']);
  }

  notificarConfiguracao(): void {
    this.emit(['dashboard', 'configuracoes']);
  }

  notificarCatalogos(): void {
    this.emit(['catalogos']);
  }

  notificarCampanhas(): void {
    this.emit(['campanhas']);
  }

  notificarTudo(): void {
    this.emit([
      'clientes',
      'mensalidades',
      'dashboard',
      'catalogos',
      'configuracoes',
      'campanhas',
    ]);
  }

  private emit(dominios: DominioSync[]): void {
    this.mudancasSubject.next({
      dominios: [...new Set(dominios)],
      em: Date.now(),
    });
  }
}
