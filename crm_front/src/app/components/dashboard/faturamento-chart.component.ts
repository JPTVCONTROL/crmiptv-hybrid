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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface DadoFaturamento {
  mes: string;
  total: number;
}

@Component({
  selector: 'app-faturamento-chart',
  template: `<div #chartHost class="w-full" [style.height.px]="height"></div>`,
})
export class FaturamentoChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('chartHost', { static: true })
  chartHost!: ElementRef<HTMLDivElement>;

  @Input() data: DadoFaturamento[] = [];
  @Input() height = 280;

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

    const barChart = React.createElement(
      BarChart,
      { data: this.data, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
      React.createElement(CartesianGrid, {
        strokeDasharray: '3 3',
        stroke: '#334155',
        vertical: false,
      }),
      React.createElement(XAxis, {
        dataKey: 'mes',
        tick: { fill: '#94a3b8', fontSize: 12 },
        axisLine: { stroke: '#334155' },
        tickLine: false,
      }),
      React.createElement(YAxis, {
        tick: { fill: '#94a3b8', fontSize: 12 },
        axisLine: false,
        tickLine: false,
        tickFormatter: (valor: number) =>
          valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }),
      }),
      React.createElement(Tooltip, {
        cursor: { fill: 'rgba(124, 58, 237, 0.12)' },
        contentStyle: {
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          color: '#f8fafc',
        },
        formatter: (value) => {
          const valor = Number(value ?? 0);

          return [
            valor.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }),
            'Faturamento',
          ];
        },
      }),
      React.createElement(Bar, {
        dataKey: 'total',
        fill: '#7C3AED',
        radius: [6, 6, 0, 0],
        maxBarSize: 48,
      })
    );

    const chart = React.createElement(ResponsiveContainer, {
      width: '100%',
      height: this.height,
      children: barChart,
    });

    this.root.render(chart);
  }
}
