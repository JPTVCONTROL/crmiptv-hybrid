import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { CreateTarefaDto, Tarefa, UpdateTarefaDto } from '../models';

export interface ListarTarefasParams {
  concluida?: boolean;
  clienteId?: number;
}

@Injectable({ providedIn: 'root' })
export class TarefaService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(params: ListarTarefasParams = {}): Observable<Tarefa[]> {
    const query = new URLSearchParams();
    if (params.concluida !== undefined) {
      query.set('concluida', params.concluida ? '1' : '0');
    }
    if (params.clienteId !== undefined) {
      query.set('clienteId', String(params.clienteId));
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.api.get<Tarefa[]>(`/tarefas${suffix}`);
  }

  criar(dados: CreateTarefaDto): Observable<Tarefa> {
    return this.api
      .post<Tarefa>('/tarefas', dados)
      .pipe(tap(() => this.sync.notificarTarefas()));
  }

  atualizar(id: number, dados: UpdateTarefaDto): Observable<Tarefa> {
    return this.api
      .put<Tarefa>(`/tarefas/${id}`, dados)
      .pipe(tap(() => this.sync.notificarTarefas()));
  }

  concluir(id: number): Observable<Tarefa> {
    return this.api
      .putActionResult<Tarefa>(`/tarefas/${id}/concluir`, {})
      .pipe(tap(() => this.sync.notificarTarefas()));
  }

  reabrir(id: number): Observable<Tarefa> {
    return this.api
      .putActionResult<Tarefa>(`/tarefas/${id}/reabrir`, {})
      .pipe(tap(() => this.sync.notificarTarefas()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/tarefas/${id}`)
      .pipe(tap(() => this.sync.notificarTarefas()));
  }
}
