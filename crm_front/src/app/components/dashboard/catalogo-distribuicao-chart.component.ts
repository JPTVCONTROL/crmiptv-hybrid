import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface DadoCatalogoDistribuicao {
  nome: string;
  quantidade: number;
}

const CORES_PADRAO = [
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
  template: `<div #chartHost class="w-full" [style.height.px]="height"></div>`,
})
export class CatalogoDistribuicaoChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('chartHost', { static: true })
  chartHost!: ElementRef<HTMLDivElement>;

  @Input() data: DadoCatalogoDistribuicao[] = [];
  @Input() height = 280;
  @Input() unidade = 'cliente(s)';

  private root?: Root;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(): void {
    if (this.root) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.root?.unmount();
    this.root = undefined;
  }

  private renderChart(): void {
    if (!this.chartHost?.nativeElement) {
      return;
    }

    if (!this.root) {
      this.root = createRoot(this.chartHost.nativeElement);
    }

    const dados = this.data.filter((item) => item.quantidade > 0);
    const total = dados.reduce((soma, item) => soma + item.quantidade, 0);
    const unidade = this.unidade;

    if (dados.length === 0) {
      this.root.render(
        React.createElement(
          'div',
          {
            className: 'flex items-center justify-center h-full text-slate-500 text-sm',
          },
          'Nenhum dado para exibir.'
        )
      );
      return;
    }

    const tooltipStyle = {
      contentStyle: {
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '8px',
        color: '#f8fafc',
      },
      formatter: (
        value: number | string | undefined,
        _name: string | undefined,
        item: { payload?: DadoCatalogoDistribuicao }
      ) => {
        const rotulo = item.payload?.nome ?? 'Item';
        const quantidade = Number(value ?? 0);
        const percentual = total
          ? Math.round((quantidade / total) * 100)
          : 0;

        return [`${quantidade} ${unidade} (${percentual}%)`, rotulo];
      },
    };

    const chart = React.createElement(
      PieChart,
      { margin: { top: 4, right: 8, left: 8, bottom: 4 } },
      React.createElement(Tooltip, tooltipStyle as never),
      React.createElement(Legend, {
        verticalAlign: 'bottom',
        align: 'center',
        iconType: 'circle',
        iconSize: 8,
        wrapperStyle: {
          fontSize: '11px',
          lineHeight: '1.45',
          color: '#cbd5e1',
          paddingTop: '6px',
        },
        formatter: (
          value: string,
          entry: { payload?: { quantidade?: number } }
        ) => {
          const quantidade = entry.payload?.quantidade ?? 0;
          const percentual = total
            ? Math.round((quantidade / total) * 100)
            : 0;

          return `${value} · ${quantidade} ${unidade} (${percentual}%)`;
        },
      } as never),
      React.createElement(Pie, {
        data: dados,
        dataKey: 'quantidade',
        nameKey: 'nome',
        cx: '50%',
        cy: '42%',
        innerRadius: 46,
        outerRadius: 74,
        paddingAngle: 2,
        children: dados.map((_, index) =>
          React.createElement(Cell, {
            key: `slice-${index}`,
            fill: CORES_PADRAO[index % CORES_PADRAO.length],
          })
        ),
      })
    );

    this.root.render(
      React.createElement(ResponsiveContainer, {
        width: '100%',
        height: this.height,
        children: chart,
      })
    );
  }
}
