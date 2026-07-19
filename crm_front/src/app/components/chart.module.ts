import { NgModule } from '@angular/core';
import { FaturamentoChartComponent } from './dashboard/faturamento-chart.component';
import { CatalogoDistribuicaoChartComponent } from './dashboard/catalogo-distribuicao-chart.component';

@NgModule({
  declarations: [FaturamentoChartComponent, CatalogoDistribuicaoChartComponent],
  exports: [FaturamentoChartComponent, CatalogoDistribuicaoChartComponent],
})
export class ChartModule {}
