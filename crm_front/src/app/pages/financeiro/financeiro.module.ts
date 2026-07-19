import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanceiroPage } from './financeiro.page';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: FinanceiroPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [FinanceiroPage],
})
export class FinanceiroPageModule {}
