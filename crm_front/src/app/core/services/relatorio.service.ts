import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DadoFaturamento } from '../../components/dashboard/faturamento-chart.component';

export interface RelatorioResumoApi {
  ano: number;
  resumoMensal: {
    periodo: string;
    recebido: number;
    qtdPagamentos: number;
    recebidoMesAnterior: number;
    variacaoPercentual: number;
  } | null;
  resumoAnual: {
    recebido: number;
    recebidoAnoAnterior: number;
    variacaoPercentual: number;
    mediaMensal: number;
    faturamentoMensal: DadoFaturamento[];
  };
  projecaoProximoAno: {
    ano: number;
    mrr: number;
    totalEsperado: number;
    clientesPagantes: number;
    faturamentoMensal: DadoFaturamento[];
  };
}

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  constructor(private api: ApiService) {}

  obterResumo(periodo?: string, ano?: number): Observable<RelatorioResumoApi> {
    const params: Record<string, string> = {};
    if (periodo) params['periodo'] = periodo;
    if (ano) params['ano'] = String(ano);
    return this.api.get<RelatorioResumoApi>('/relatorios/resumo', params);
  }
}
