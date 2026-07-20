import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CalendarioPage } from './calendario.page';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [{ path: '', component: CalendarioPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [CalendarioPage],
})
export class CalendarioPageModule {}
