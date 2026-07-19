import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPage } from './dashboard.page';
import { SharedModule } from '../../shared/shared.module';
import { FaturamentoChartComponent } from '../../components/dashboard/faturamento-chart.component';

const routes: Routes = [{ path: '', component: DashboardPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [DashboardPage, FaturamentoChartComponent],
})
export class DashboardPageModule {}
