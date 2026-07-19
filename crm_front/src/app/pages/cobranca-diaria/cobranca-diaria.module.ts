import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CobrancaDiariaPage } from './cobranca-diaria.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: CobrancaDiariaPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [CobrancaDiariaPage],
})
export class CobrancaDiariaPageModule {}
