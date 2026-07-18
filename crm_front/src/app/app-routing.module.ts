import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./pages/dashboard/dashboard.module').then((m) => m.DashboardPageModule),
  },
  {
    path: 'clientes',
    loadChildren: () =>
      import('./pages/clientes/clientes.module').then((m) => m.ClientesPageModule),
  },
  {
    path: 'clientes/:id',
    loadChildren: () =>
      import('./pages/cliente-detalhes/cliente-detalhes.module').then(
        (m) => m.ClienteDetalhesPageModule
      ),
  },
  {
    path: 'financeiro',
    loadChildren: () =>
      import('./pages/financeiro/financeiro.module').then((m) => m.FinanceiroPageModule),
  },
  {
    path: 'vencimentos',
    loadChildren: () =>
      import('./pages/vencimentos/vencimentos.module').then((m) => m.VencimentosPageModule),
  },
  {
    path: 'aplicativos',
    loadChildren: () =>
      import('./pages/aplicativos/aplicativos.module').then((m) => m.AplicativosPageModule),
  },
  {
    path: 'dispositivos',
    loadChildren: () =>
      import('./pages/dispositivos/dispositivos.module').then((m) => m.DispositivosPageModule),
  },
  {
    path: 'relatorios',
    loadChildren: () =>
      import('./pages/relatorios/relatorios.module').then((m) => m.RelatoriosPageModule),
  },
  {
    path: 'configuracoes',
    loadChildren: () =>
      import('./pages/configuracoes/configuracoes.module').then(
        (m) => m.ConfiguracoesPageModule
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
