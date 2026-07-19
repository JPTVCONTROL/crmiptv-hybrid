import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Mensalidade } from '../models';

export interface ResultadoPagamento {
  novoVencimento: string;
}

@Injectable({ providedIn: 'root' })
export class MensalidadeService {
  constructor(private api: ApiService) {}

  listar(): Observable<Mensalidade[]> {
    return this.api.get<Mensalidade[]>('/mensalidades');
  }

  registrarPagamento(id: number, pagoEm?: string): Observable<ResultadoPagamento> {
    return this.api.putActionResult<ResultadoPagamento>(
      `/mensalidades/${id}/pagar`,
      pagoEm ? { pagoEm } : {}
    );
  }
}
