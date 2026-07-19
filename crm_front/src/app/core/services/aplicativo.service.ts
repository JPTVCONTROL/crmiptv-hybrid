import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Aplicativo, CreateAplicativoDto, ClienteAplicativoResumo } from '../models';

@Injectable({ providedIn: 'root' })
export class AplicativoService {
  constructor(private api: ApiService) {}

  listar(): Observable<Aplicativo[]> {
    return this.api.get<Aplicativo[]>('/aplicativos');
  }

  criar(dados: Partial<CreateAplicativoDto>): Observable<Aplicativo> {
    return this.api.post<Aplicativo>('/aplicativos', dados);
  }

  atualizar(id: number, dados: Partial<CreateAplicativoDto>): Observable<Aplicativo> {
    return this.api.put<Aplicativo>(`/aplicativos/${id}`, dados);
  }

  excluir(id: number): Observable<void> {
    return this.api.delete(`/aplicativos/${id}`);
  }

  listarClientes(id: number): Observable<ClienteAplicativoResumo[]> {
    return this.api.get<ClienteAplicativoResumo[]>(`/aplicativos/${id}/clientes`);
  }
}
