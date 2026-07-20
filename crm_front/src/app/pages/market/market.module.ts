import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MarketPage } from './market.page';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../../components/components.module';

const routes: Routes = [{ path: '', component: MarketPage }];

@NgModule({
  imports: [SharedModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [MarketPage],
})
export class MarketPageModule {}
