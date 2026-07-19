import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RelatoriosPage } from './relatorios.page';
import { SharedModule } from '../../shared/shared.module';
import { ChartModule } from '../../components/chart.module';

const routes: Routes = [{ path: '', component: RelatoriosPage }];

@NgModule({
  imports: [SharedModule, ChartModule, RouterModule.forChild(routes)],
  declarations: [RelatoriosPage],
})
export class RelatoriosPageModule {}
