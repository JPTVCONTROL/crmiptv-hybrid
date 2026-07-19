import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AutomacoesPage } from './automacoes.page';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: AutomacoesPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [AutomacoesPage],
})
export class AutomacoesPageModule {}
