import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClienteDetalhesPage } from './cliente-detalhes.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: ClienteDetalhesPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [ClienteDetalhesPage],
})
export class ClienteDetalhesPageModule {}
