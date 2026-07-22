import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServidoresPage } from './servidores.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: ServidoresPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [ServidoresPage],
})
export class ServidoresPageModule {}
