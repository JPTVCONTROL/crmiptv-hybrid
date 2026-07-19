import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VencimentosPage } from './vencimentos.page';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: VencimentosPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [VencimentosPage],
})
export class VencimentosPageModule {}
