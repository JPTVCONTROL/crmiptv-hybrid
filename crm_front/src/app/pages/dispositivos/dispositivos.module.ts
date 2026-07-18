import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DispositivosPage } from './dispositivos.page';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: DispositivosPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [DispositivosPage],
})
export class DispositivosPageModule {}
