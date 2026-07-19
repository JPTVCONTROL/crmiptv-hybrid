import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { Dispositivo, CreateDispositivoDto, ClienteDispositivoResumo } from '../models';

@Injectable({ providedIn: 'root' })
export class DispositivoService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(): Observable<Dispositivo[]> {
    return this.api.get<Dispositivo[]>('/dispositivos');
  }

  criar(dados: Partial<CreateDispositivoDto>): Observable<Dispositivo> {
    return this.api
      .post<Dispositivo>('/dispositivos', dados)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }

  atualizar(id: number, dados: Partial<CreateDispositivoDto>): Observable<Dispositivo> {
    return this.api
      .put<Dispositivo>(`/dispositivos/${id}`, dados)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/dispositivos/${id}`)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }

  listarClientes(id: number): Observable<ClienteDispositivoResumo[]> {
    return this.api.get<ClienteDispositivoResumo[]>(`/dispositivos/${id}/clientes`);
  }
}
