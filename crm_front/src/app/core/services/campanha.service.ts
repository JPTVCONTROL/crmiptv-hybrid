import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Campanha, CreateCampanhaDto } from '../models';

@Injectable({ providedIn: 'root' })
export class CampanhaService {
  constructor(private api: ApiService) {}

  listar(): Observable<Campanha[]> {
    return this.api.get<Campanha[]>('/campanhas');
  }

  buscarPorId(id: number): Observable<Campanha> {
    return this.api.get<Campanha>(`/campanhas/${id}`);
  }

  criar(dados: CreateCampanhaDto): Observable<Campanha> {
    return this.api.post<Campanha>('/campanhas', dados);
  }

  atualizar(id: number, dados: Partial<CreateCampanhaDto>): Observable<Campanha> {
    return this.api.put<Campanha>(`/campanhas/${id}`, dados);
  }

  excluir(id: number): Observable<void> {
    return this.api.delete(`/campanhas/${id}`);
  }

  registrarEnvios(
    id: number,
    clienteIds: number[]
  ): Observable<{ registrados: number; reenviados: number }> {
    return this.api.post<{ registrados: number; reenviados: number }>(
      `/campanhas/${id}/envios`,
      { clienteIds }
    );
  }
}
