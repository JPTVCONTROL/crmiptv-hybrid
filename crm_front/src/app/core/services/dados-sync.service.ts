import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type DominioSync =
  | 'clientes'
  | 'mensalidades'
  | 'dashboard'
  | 'catalogos'
  | 'configuracoes'
  | 'campanhas'
  | 'tarefas'
  | 'custos'
  | 'relatorios';

export interface MudancaSync {
  dominios: DominioSync[];
  em: number;
}

@Injectable({ providedIn: 'root' })
export class DadosSyncService {
  private readonly mudancasSubject = new Subject<MudancaSync>();

  readonly mudancas$ = this.mudancasSubject.asObservable();

  notificarClientes(): void {
    this.emit([
      'clientes',
      'mensalidades',
      'dashboard',
      'catalogos',
      'custos',
      'relatorios',
    ]);
  }

  notificarMensalidades(): void {
    this.emit(['mensalidades', 'clientes', 'dashboard', 'custos', 'relatorios']);
  }

  notificarContatos(): void {
    this.emit(['mensalidades', 'clientes', 'dashboard', 'relatorios']);
  }

  notificarConfiguracao(): void {
    this.emit(['dashboard', 'configuracoes', 'custos', 'relatorios']);
  }

  notificarCatalogos(): void {
    this.emit(['catalogos', 'custos', 'relatorios']);
  }

  notificarCampanhas(): void {
    this.emit(['campanhas']);
  }

  notificarTarefas(): void {
    this.emit(['tarefas', 'dashboard']);
  }

  notificarCustos(): void {
    this.notificarPaineisCredito();
  }

  /** Painéis (saldo/tarifa): propaga para custos, relatórios, clientes e demais telas. */
  notificarPaineisCredito(): void {
    this.emit([
      'custos',
      'dashboard',
      'configuracoes',
      'clientes',
      'mensalidades',
      'relatorios',
      'catalogos',
    ]);
  }

  notificarTudo(): void {
    this.emit([
      'clientes',
      'mensalidades',
      'dashboard',
      'catalogos',
      'configuracoes',
      'campanhas',
      'tarefas',
      'custos',
      'relatorios',
    ]);
  }

  private emit(dominios: DominioSync[]): void {
    this.mudancasSubject.next({
      dominios: [...new Set(dominios)],
      em: Date.now(),
    });
  }
}
