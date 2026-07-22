import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DadosSyncService } from './dados-sync.service';

@Injectable({ providedIn: 'root' })
export class SistemaService {
  constructor(
    private api: ApiService,
    private sync: DadosSyncService
  ) {}

  baixarBackup(): Observable<Blob> {
    return this.api.getBlob('/sistema/backup');
  }

  sincronizarCobrancas(): Observable<{
    clientes: number;
    mensalidades: number;
    removidas?: number;
  }> {
    return this.api
      .post<{ clientes: number; mensalidades: number; removidas?: number }>(
        '/sistema/sincronizar-cobrancas',
        {}
      )
      .pipe(tap(() => this.sync.notificarTudo()));
  }

  obterRevisaoDados(): Observable<{ revisao: number }> {
    return this.api.get<{ revisao: number }>('/sistema/revisao-dados');
  }
}
