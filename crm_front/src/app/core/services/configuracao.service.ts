import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { Configuracao } from '../models';

@Injectable({ providedIn: 'root' })
export class ConfiguracaoService {
  private configuracaoSubject = new BehaviorSubject<Configuracao | null>(null);
  configuracao$ = this.configuracaoSubject.asObservable();

  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  carregar(): Observable<Configuracao> {
    return this.api.get<Configuracao>('/configuracoes').pipe(
      tap((config) => this.configuracaoSubject.next(config))
    );
  }

  salvar(dados: Partial<Configuracao>): Observable<Configuracao> {
    return this.api.put<Configuracao>('/configuracoes', dados).pipe(
      tap((config) => {
        this.configuracaoSubject.next(config);
        this.sync.notificarConfiguracao();
      })
    );
  }

  getSnapshot(): Configuracao | null {
    return this.configuracaoSubject.value;
  }
}
