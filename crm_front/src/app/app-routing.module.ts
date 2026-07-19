import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard, GuestGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.module').then((m) => m.LoginPageModule),
    canActivate: [GuestGuard],
  },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
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
        path: 'cobranca-diaria',
        loadChildren: () =>
          import('./pages/cobranca-diaria/cobranca-diaria.module').then(
            (m) => m.CobrancaDiariaPageModule
          ),
      },
      {
        path: 'automacoes',
        loadChildren: () =>
          import('./pages/automacoes/automacoes.module').then(
            (m) => m.AutomacoesPageModule
          ),
      },
      {
        path: 'catalogos',
        loadChildren: () =>
          import('./pages/catalogos/catalogos.module').then(
            (m) => m.CatalogosPageModule
          ),
      },
      {
        path: 'aplicativos',
        redirectTo: 'catalogos/aplicativos',
        pathMatch: 'full',
      },
      {
        path: 'planos',
        redirectTo: 'catalogos/planos',
        pathMatch: 'full',
      },
      {
        path: 'dispositivos',
        redirectTo: 'catalogos/dispositivos',
        pathMatch: 'full',
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
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
