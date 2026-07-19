import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanosPage } from './planos.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: PlanosPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [PlanosPage],
})
export class PlanosPageModule {}
