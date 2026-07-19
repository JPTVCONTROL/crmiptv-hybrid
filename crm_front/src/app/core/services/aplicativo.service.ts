import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { Aplicativo, CreateAplicativoDto, ClienteAplicativoResumo } from '../models';

@Injectable({ providedIn: 'root' })
export class AplicativoService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(): Observable<Aplicativo[]> {
    return this.api.get<Aplicativo[]>('/aplicativos');
  }

  criar(dados: Partial<CreateAplicativoDto>): Observable<Aplicativo> {
    return this.api
      .post<Aplicativo>('/aplicativos', dados)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }

  atualizar(id: number, dados: Partial<CreateAplicativoDto>): Observable<Aplicativo> {
    return this.api
      .put<Aplicativo>(`/aplicativos/${id}`, dados)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/aplicativos/${id}`)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }

  listarClientes(id: number): Observable<ClienteAplicativoResumo[]> {
    return this.api.get<ClienteAplicativoResumo[]>(`/aplicativos/${id}/clientes`);
  }
}
