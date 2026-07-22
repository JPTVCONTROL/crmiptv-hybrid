import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustosPage } from './custos.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: CustosPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [CustosPage],
})
export class CustosPageModule {}
