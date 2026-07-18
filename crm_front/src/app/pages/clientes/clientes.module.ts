import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientesPage } from './clientes.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: ClientesPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [ClientesPage],
})
export class ClientesPageModule {}
