import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPage } from './dashboard.page';
import { SharedModule } from '../../shared/shared.module';
import { ChartModule } from '../../components/chart.module';

const routes: Routes = [{ path: '', component: DashboardPage }];

@NgModule({
  imports: [SharedModule, ChartModule, RouterModule.forChild(routes)],
  declarations: [DashboardPage],
})
export class DashboardPageModule {}
