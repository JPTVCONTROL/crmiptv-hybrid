import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogosPage } from './catalogos.page';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: CatalogosPage,
    children: [
      { path: '', redirectTo: 'aplicativos', pathMatch: 'full' },
      {
        path: 'aplicativos',
        loadChildren: () =>
          import('../aplicativos/aplicativos.module').then(
            (m) => m.AplicativosPageModule
          ),
      },
      {
        path: 'planos',
        loadChildren: () =>
          import('../planos/planos.module').then((m) => m.PlanosPageModule),
      },
      {
        path: 'dispositivos',
        loadChildren: () =>
          import('../dispositivos/dispositivos.module').then(
            (m) => m.DispositivosPageModule
          ),
      },
    ],
  },
];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [CatalogosPage],
})
export class CatalogosPageModule {}
