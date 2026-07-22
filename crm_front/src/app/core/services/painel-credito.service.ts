import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { PainelCredito, ConsumosCreditoResposta } from '../models';

@Injectable({ providedIn: 'root' })
export class PainelCreditoService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(): Observable<PainelCredito[]> {
    return this.api.get<PainelCredito[]>('/paineis-credito');
  }

  listarConsumos(periodo?: string): Observable<ConsumosCreditoResposta> {
    const params: Record<string, string> = {};
    if (periodo) {
      params['periodo'] = periodo;
    }
    return this.api.get<ConsumosCreditoResposta>(
      '/paineis-credito/consumos',
      params
    );
  }

  definirSaldo(
    id: number,
    saldo: number,
    observacao?: string | null
  ): Observable<PainelCredito> {
    return this.api
      .put<PainelCredito>(`/paineis-credito/${id}/saldo`, { saldo, observacao })
      .pipe(tap(() => this.sync.notificarPaineisCredito()));
  }

  adicionarCreditos(
    id: number,
    quantidade: number,
    observacao?: string | null
  ): Observable<PainelCredito> {
    return this.api
      .post<PainelCredito>(`/paineis-credito/${id}/creditos`, {
        quantidade,
        observacao,
      })
      .pipe(tap(() => this.sync.notificarPaineisCredito()));
  }

  atualizar(
    id: number,
    dados: {
      nome?: string;
      custoUnitario?: number;
      saldo?: number;
      urlPainel?: string | null;
      loginPainel?: string | null;
      senhaPainel?: string | null;
      ativo?: boolean;
    }
  ): Observable<PainelCredito> {
    return this.api
      .put<PainelCredito>(`/paineis-credito/${id}`, dados)
      .pipe(tap(() => this.sync.notificarPaineisCredito()));
  }

  criar(dados: {
    nome: string;
    codigo?: string;
    custoUnitario?: number;
    urlPainel?: string | null;
    loginPainel?: string | null;
    senhaPainel?: string | null;
    ativo?: boolean;
  }): Observable<PainelCredito> {
    return this.api
      .post<PainelCredito>('/paineis-credito', dados)
      .pipe(tap(() => this.sync.notificarPaineisCredito()));
  }

  excluir(id: number): Observable<void> {
    return this.api
      .delete(`/paineis-credito/${id}`)
      .pipe(tap(() => this.sync.notificarPaineisCredito()));
  }
}
