import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { ClienteAplicativoResumo, Plano } from '../models';

export type CreatePlanoDto = Pick<Plano, 'nome' | 'valor' | 'diasValidade' | 'ativo'>;

@Injectable({ providedIn: 'root' })
export class PlanoService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(): Observable<Plano[]> {
    return this.api.get<Plano[]>('/planos');
  }

  criar(dados: Partial<CreatePlanoDto>): Observable<Plano> {
    return this.api
      .post<Plano>('/planos', dados)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }

  atualizar(id: number, dados: Partial<CreatePlanoDto>): Observable<Plano> {
    return this.api
      .put<Plano>(`/planos/${id}`, dados)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }

  listarClientes(id: number): Observable<ClienteAplicativoResumo[]> {
    return this.api.get<ClienteAplicativoResumo[]>(`/planos/${id}/clientes`);
  }

  reajustarClientes(id: number): Observable<{
    clientes: number;
    mensalidades: number;
    valor: number;
  }> {
    return this.api
      .put<{ clientes: number; mensalidades: number; valor: number }>(
        `/planos/${id}/reajustar-clientes`,
        {}
      )
      .pipe(tap(() => this.sync.notificarClientes()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/planos/${id}`)
      .pipe(tap(() => this.sync.notificarCatalogos()));
  }
}
