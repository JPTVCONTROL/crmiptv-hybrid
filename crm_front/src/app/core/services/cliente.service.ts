import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { Cliente, CreateClienteDto, ImportacaoClientesResultado } from '../models';

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

  definirInclusaoCobrancas(
    id: number,
    incluirCobrancas: boolean
  ): Observable<Cliente> {
    return this.api
      .put<Cliente>(`/clientes/${id}/incluir-cobrancas`, { incluirCobrancas })
      .pipe(tap(() => this.sync.notificarClientes()));
  }

  definirCortesia(id: number, cortesia: boolean): Observable<Cliente> {
    return this.api
      .put<Cliente>(`/clientes/${id}/cortesia`, { cortesia })
      .pipe(tap(() => this.sync.notificarClientes()));
  }

  definirAtividade(
    id: number,
    dados: {
      ativo: boolean;
      incluirCampanhas: boolean;
      incluirCobrancas: boolean;
    }
  ): Observable<Cliente> {
    return this.api
      .put<Cliente>(`/clientes/${id}/atividade`, dados)
      .pipe(tap(() => this.sync.notificarClientes()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/clientes/${id}`)
      .pipe(tap(() => this.sync.notificarClientes()));
  }

  importarCsv(
    csv: string,
    somenteContato = false
  ): Observable<ImportacaoClientesResultado> {
    return this.api
      .post<ImportacaoClientesResultado>('/clientes/importar', {
        csv,
        somenteContato,
      })
      .pipe(tap(() => this.sync.notificarClientes()));
  }
}
