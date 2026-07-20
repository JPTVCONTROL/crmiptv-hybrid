import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';
import { Mensalidade } from '../models';

export interface ResultadoPagamento {
  novoVencimento: string;
  valorRenovacao?: number;
}

export interface ResultadoPagamentosLote {
  sucesso: number;
  erros: { id: number; mensagem: string }[];
  pagoEm: string;
}

@Injectable({ providedIn: 'root' })
export class MensalidadeService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  listar(): Observable<Mensalidade[]> {
    return this.api.get<Mensalidade[]>('/mensalidades');
  }

  registrarPagamento(id: number, pagoEm?: string): Observable<ResultadoPagamento> {
    return this.api
      .putActionResult<ResultadoPagamento>(
        `/mensalidades/${id}/pagar`,
        pagoEm ? { pagoEm } : {}
      )
      .pipe(tap(() => this.sync.notificarMensalidades()));
  }

  renovarCortesia(id: number): Observable<{ novoVencimento: string }> {
    return this.api
      .put<{ novoVencimento: string }>(`/mensalidades/${id}/renovar-cortesia`, {})
      .pipe(tap(() => this.sync.notificarMensalidades()));
  }

  registrarPagamentos(
    ids: number[],
    pagoEm?: string
  ): Observable<ResultadoPagamentosLote> {
    return this.api
      .put<ResultadoPagamentosLote>('/mensalidades/pagamentos', {
        ids,
        ...(pagoEm ? { pagoEm } : {}),
      })
      .pipe(tap(() => this.sync.notificarMensalidades()));
  }

  registrarContato(id: number): Observable<{ contatoEm: string }> {
    return this.api
      .put<{ contatoEm: string }>(`/mensalidades/${id}/contato`, {})
      .pipe(tap(() => this.sync.notificarContatos()));
  }

  registrarContatos(ids: number[]): Observable<{ atualizados: number; contatoEm: string }> {
    return this.api
      .put<{ atualizados: number; contatoEm: string }>(
        '/mensalidades/contatos',
        { ids }
      )
      .pipe(tap(() => this.sync.notificarContatos()));
  }
}
