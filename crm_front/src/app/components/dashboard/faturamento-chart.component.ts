import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

export interface DadoFaturamento {
  mes: string;
  total: number;
}

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

  barras: Array<
    DadoFaturamento & { altura: number; indice: number; destaque: boolean }
  > = [];
  valorMaximo = 0;
  indiceAtivo: number | null = null;

  ngOnChanges(): void {
    this.valorMaximo = Math.max(...this.data.map((item) => item.total), 0);
    const ultimoIndice = this.data.length - 1;
    this.barras = this.data.map((item, indice) => ({
      ...item,
      indice,
      destaque: indice === ultimoIndice,
      altura: this.valorMaximo > 0 ? (item.total / this.valorMaximo) * 100 : 0,
    }));
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
