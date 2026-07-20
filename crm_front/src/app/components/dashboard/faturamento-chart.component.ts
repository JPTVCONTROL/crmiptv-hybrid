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

  barras: Array<DadoFaturamento & { altura: number }> = [];
  valorMaximo = 0;

  ngOnChanges(): void {
    this.valorMaximo = Math.max(...this.data.map((item) => item.total), 0);
    this.barras = this.data.map((item) => ({
      ...item,
      altura: this.valorMaximo > 0 ? (item.total / this.valorMaximo) * 100 : 0,
    }));
  }

  formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  }
}
