import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TarefasPage } from './tarefas.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: TarefasPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [TarefasPage],
})
export class TarefasPageModule {}
