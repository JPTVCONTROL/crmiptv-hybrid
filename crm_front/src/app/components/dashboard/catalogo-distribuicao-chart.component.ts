import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

export interface DadoCatalogoDistribuicao {
  nome: string;
  quantidade: number;
}

const CORES = [
  '#7C3AED',
  '#22C55E',
  '#38BDF8',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#A855F7',
];

@Component({
  selector: 'app-catalogo-distribuicao-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalogo-distribuicao-chart.component.html',
  styleUrls: ['./catalogo-distribuicao-chart.component.scss'],
})
export class CatalogoDistribuicaoChartComponent implements OnChanges {
  @Input() data: DadoCatalogoDistribuicao[] = [];
  @Input() height = 280;
  @Input() unidade = 'cliente(s)';

  itens: Array<{
    nome: string;
    quantidade: number;
    percentual: number;
    cor: string;
  }> = [];
  total = 0;

  ngOnChanges(): void {
    const dados = this.data.filter((item) => item.quantidade > 0);
    this.total = dados.reduce((soma, item) => soma + item.quantidade, 0);
    this.itens = dados.map((item, index) => ({
      nome: item.nome,
      quantidade: item.quantidade,
      percentual: this.total > 0 ? Math.round((item.quantidade / this.total) * 100) : 0,
      cor: CORES[index % CORES.length],
    }));
  }
}
