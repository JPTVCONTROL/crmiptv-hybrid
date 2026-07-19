import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ClienteAplicativoResumo, Plano } from '../models';

export type CreatePlanoDto = Pick<Plano, 'nome' | 'valor' | 'diasValidade' | 'ativo'>;

@Injectable({ providedIn: 'root' })
export class PlanoService {
  constructor(private api: ApiService) {}

  listar(): Observable<Plano[]> {
    return this.api.get<Plano[]>('/planos');
  }

  criar(dados: Partial<CreatePlanoDto>): Observable<Plano> {
    return this.api.post<Plano>('/planos', dados);
  }

  atualizar(id: number, dados: Partial<CreatePlanoDto>): Observable<Plano> {
    return this.api.put<Plano>(`/planos/${id}`, dados);
  }

  listarClientes(id: number): Observable<ClienteAplicativoResumo[]> {
    return this.api.get<ClienteAplicativoResumo[]>(`/planos/${id}/clientes`);
  }

  excluir(id: number): Observable<void> {
    return this.api.delete(`/planos/${id}`);
  }
}
