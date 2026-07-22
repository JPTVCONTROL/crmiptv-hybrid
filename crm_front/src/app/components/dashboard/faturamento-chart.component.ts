import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

export interface DadoFaturamento {
  mes: string;
  /** Faturamento bruto (receita recebida). */
  total: number;
  /** Lucro líquido após custos, quando disponível. */
  liquido?: number;
  custosCredito?: number;
  despesasFixas?: number;
  custosEstimados?: number;
}

type BarraFaturamento = DadoFaturamento & {
  alturaBruto: number;
  alturaLucro: number;
  indice: number;
  destaque: boolean;
  lucroNegativo: boolean;
};

@Component({
  selector: 'app-faturamento-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faturamento-chart.component.html',
  styleUrls: ['./faturamento-chart.component.scss'],
})
export class FaturamentoChartComponent implements OnChanges {
  @Input() data: DadoFaturamento[] = [];
  @Input() height = 280;

  barras: BarraFaturamento[] = [];
  valorMaximo = 0;
  indiceAtivo: number | null = null;
  exibirLucro = false;

  ngOnChanges(): void {
    this.exibirLucro = this.data.some((item) => item.liquido !== undefined);

    const valoresEscala: number[] = [];
    for (const item of this.data) {
      valoresEscala.push(item.total);
      if (item.liquido !== undefined) {
        valoresEscala.push(Math.abs(item.liquido));
      }
    }
    this.valorMaximo = Math.max(...valoresEscala, 0);

    const ultimoIndice = this.data.length - 1;
    this.barras = this.data.map((item, indice) => {
      const liquido = item.liquido ?? 0;
      return {
        ...item,
        indice,
        destaque: indice === ultimoIndice,
        lucroNegativo: liquido < 0,
        alturaBruto:
          this.valorMaximo > 0 ? (item.total / this.valorMaximo) * 100 : 0,
        alturaLucro:
          this.valorMaximo > 0 && item.liquido !== undefined
            ? (Math.abs(liquido) / this.valorMaximo) * 100
            : 0,
      };
    });
    this.indiceAtivo = null;
  }

  destacar(indice: number | null): void {
    this.indiceAtivo = indice;
  }

  formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  }
}
