import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import {
  CreateDespesaDto,
  DespesaMensal,
  ResumoCustos,
  UpdateDespesaDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class DespesaService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(): Observable<DespesaMensal[]> {
    return this.api.get<DespesaMensal[]>('/despesas');
  }

  obterResumo(): Observable<ResumoCustos> {
    return this.api.get<ResumoCustos>('/despesas/resumo');
  }

  criar(dados: CreateDespesaDto): Observable<DespesaMensal> {
    return this.api
      .post<DespesaMensal>('/despesas', dados)
      .pipe(tap(() => this.sync.notificarCustos()));
  }

  atualizar(id: number, dados: UpdateDespesaDto): Observable<DespesaMensal> {
    return this.api
      .put<DespesaMensal>(`/despesas/${id}`, dados)
      .pipe(tap(() => this.sync.notificarCustos()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/despesas/${id}`)
      .pipe(tap(() => this.sync.notificarCustos()));
  }
}
