import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { Cliente, CreateClienteDto } from '../models';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(): Observable<Cliente[]> {
    return this.api.get<Cliente[]>('/clientes');
  }

  buscarPorId(id: number): Observable<Cliente> {
    return this.api.get<Cliente>(`/clientes/${id}`);
  }

  criar(dados: Partial<CreateClienteDto>): Observable<Cliente> {
    return this.api
      .post<Cliente>('/clientes', dados)
      .pipe(tap(() => this.sync.notificarClientes()));
  }

  atualizar(id: number, dados: Partial<CreateClienteDto>): Observable<Cliente> {
    return this.api
      .put<Cliente>(`/clientes/${id}`, dados)
      .pipe(tap(() => this.sync.notificarClientes()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/clientes/${id}`)
      .pipe(tap(() => this.sync.notificarClientes()));
  }
}
