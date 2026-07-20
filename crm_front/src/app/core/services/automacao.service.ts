import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AutomacaoConfig,
  AutomacaoPainel,
  ResultadoExecucaoAutomacao,
} from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AutomacaoService {
  constructor(private api: ApiService) {}

  obterPainel(): Observable<AutomacaoPainel> {
    return this.api.get<AutomacaoPainel>('/automacoes');
  }

  salvar(config: Partial<AutomacaoConfig>): Observable<AutomacaoConfig> {
    return this.api.put<AutomacaoConfig>('/automacoes', config);
  }

  executar(): Observable<ResultadoExecucaoAutomacao> {
    return this.api.post<ResultadoExecucaoAutomacao>('/automacoes/executar', {});
  }
}
