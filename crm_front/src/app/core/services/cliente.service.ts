import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Cliente, CreateClienteDto } from '../models';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  constructor(private api: ApiService) {}

  listar(): Observable<Cliente[]> {
    return this.api.get<Cliente[]>('/clientes');
  }

  buscarPorId(id: number): Observable<Cliente> {
    return this.api.get<Cliente>(`/clientes/${id}`);
  }

  criar(dados: Partial<CreateClienteDto>): Observable<Cliente> {
    return this.api.post<Cliente>('/clientes', dados);
  }

  atualizar(id: number, dados: Partial<CreateClienteDto>): Observable<Cliente> {
    return this.api.put<Cliente>(`/clientes/${id}`, dados);
  }

  excluir(id: number): Observable<void> {
    return this.api.delete(`/clientes/${id}`);
  }
}
