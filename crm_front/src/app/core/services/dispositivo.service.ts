import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Dispositivo, CreateDispositivoDto } from '../models';

@Injectable({ providedIn: 'root' })
export class DispositivoService {
  constructor(private api: ApiService) {}

  listar(): Observable<Dispositivo[]> {
    return this.api.get<Dispositivo[]>('/dispositivos');
  }

  criar(dados: Partial<CreateDispositivoDto>): Observable<Dispositivo> {
    return this.api.post<Dispositivo>('/dispositivos', dados);
  }

  atualizar(id: number, dados: Partial<CreateDispositivoDto>): Observable<Dispositivo> {
    return this.api.put<Dispositivo>(`/dispositivos/${id}`, dados);
  }

  excluir(id: number): Observable<void> {
    return this.api.delete(`/dispositivos/${id}`);
  }
}
