import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RelatoriosPage } from './relatorios.page';
import { SharedModule } from '../../shared/shared.module';
import { FaturamentoChartComponent } from '../../components/dashboard/faturamento-chart.component';
import { CatalogoDistribuicaoChartComponent } from '../../components/dashboard/catalogo-distribuicao-chart.component';

const routes: Routes = [{ path: '', component: RelatoriosPage }];

@NgModule({
  imports: [
    SharedModule,
    FaturamentoChartComponent,
    CatalogoDistribuicaoChartComponent,
    RouterModule.forChild(routes),
  ],
  declarations: [RelatoriosPage],
})
export class RelatoriosPageModule {}
