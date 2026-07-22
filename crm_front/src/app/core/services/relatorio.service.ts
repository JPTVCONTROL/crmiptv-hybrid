import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DadoFaturamento } from '../../components/dashboard/faturamento-chart.component';
import { ResumoCustosRelatorio, FaturamentoLiquidoResumo } from '../models';

export interface ExpectativaFinanceira {
  faturamento: number;
  custos: number;
  lucro: number;
  margemPercentual: number;
  custosFixos?: number;
  custosVariaveis?: number;
  mesesRestantes?: number;
}

export interface RelatorioResumoApi {
  ano: number;
  faturamentoRecente?: DadoFaturamento[];
  expectativa?: {
    controleCustosDesde: string;
    mensal: ExpectativaFinanceira;
    anual: ExpectativaFinanceira;
    proximoAno: ExpectativaFinanceira;
  };
  resumoMensal: ({
    periodo: string;
    recebido: number;
    qtdPagamentos: number;
    recebidoMesAnterior: number;
    variacaoPercentual: number;
    controleCustosAtivo?: boolean;
  } & FaturamentoLiquidoResumo) | null;
  resumoAnual: {
    recebido: number;
    recebidoAnoAnterior: number;
    variacaoPercentual: number;
    mediaMensal: number;
    faturamentoMensal: DadoFaturamento[];
  } & FaturamentoLiquidoResumo;
  projecaoProximoAno: {
    ano: number;
    mrr: number;
    totalEsperado: number;
    clientesPagantes: number;
    faturamentoMensal: DadoFaturamento[];
  };
  custos?: ResumoCustosRelatorio;
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
