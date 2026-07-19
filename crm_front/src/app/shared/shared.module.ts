import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { StatCardComponent } from '../components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { LoadingComponent } from '../components/loading/loading.component';
import { EmptyStateComponent } from '../components/empty-state/empty-state.component';
import { AlertasSinoModule } from '../components/alertas-sino/alertas-sino.module';

@NgModule({
  declarations: [
    StatCardComponent,
    PageHeaderComponent,
    LoadingComponent,
    EmptyStateComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    IonicModule,
    AlertasSinoModule,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    IonicModule,
    StatCardComponent,
    PageHeaderComponent,
    LoadingComponent,
    EmptyStateComponent,
    AlertasSinoModule,
  ],
})
export class SharedModule {}
