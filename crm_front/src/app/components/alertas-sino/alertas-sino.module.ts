import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AlertasSinoComponent } from './alertas-sino.component';

@NgModule({
  declarations: [AlertasSinoComponent],
  imports: [CommonModule, RouterModule, IonicModule],
  exports: [AlertasSinoComponent],
})
export class AlertasSinoModule {}
