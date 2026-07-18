import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfiguracoesPage } from './configuracoes.page';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: ConfiguracoesPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [ConfiguracoesPage],
})
export class ConfiguracoesPageModule {}
