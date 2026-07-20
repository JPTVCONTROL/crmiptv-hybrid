import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { Campanha, CreateCampanhaDto } from '../models';

@Injectable({ providedIn: 'root' })
export class CampanhaService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(): Observable<Campanha[]> {
    return this.api.get<Campanha[]>('/campanhas');
  }

  buscarPorId(id: number): Observable<Campanha> {
    return this.api.get<Campanha>(`/campanhas/${id}`);
  }

  criar(dados: CreateCampanhaDto): Observable<Campanha> {
    return this.api
      .post<Campanha>('/campanhas', dados)
      .pipe(tap(() => this.sync.notificarCampanhas()));
  }

  atualizar(id: number, dados: Partial<CreateCampanhaDto>): Observable<Campanha> {
    return this.api
      .put<Campanha>(`/campanhas/${id}`, dados)
      .pipe(tap(() => this.sync.notificarCampanhas()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/campanhas/${id}`)
      .pipe(tap(() => this.sync.notificarCampanhas()));
  }

  registrarEnvios(
    id: number,
    clienteIds: number[]
  ): Observable<{ registrados: number; reenviados: number }> {
    return this.api
      .post<{ registrados: number; reenviados: number }>(
        `/campanhas/${id}/envios`,
        { clienteIds }
      )
      .pipe(tap(() => this.sync.notificarCampanhas()));
  }
}
