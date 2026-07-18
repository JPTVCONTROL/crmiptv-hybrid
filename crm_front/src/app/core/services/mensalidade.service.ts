import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Mensalidade } from '../models';

@Injectable({ providedIn: 'root' })
export class MensalidadeService {
  constructor(private api: ApiService) {}

  listar(): Observable<Mensalidade[]> {
    return this.api.get<Mensalidade[]>('/mensalidades');
  }

  registrarPagamento(id: number): Observable<void> {
    return this.api.putAction(`/mensalidades/${id}/pagar`, {});
  }
}
