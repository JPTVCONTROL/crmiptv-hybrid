import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AplicativosPage } from './aplicativos.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: AplicativosPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [AplicativosPage],
})
export class AplicativosPageModule {}
