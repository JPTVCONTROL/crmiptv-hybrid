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
        path: 'aplicativos',
        loadChildren: () =>
          import('./pages/aplicativos/aplicativos.module').then((m) => m.AplicativosPageModule),
      },
      {
        path: 'planos',
        loadChildren: () =>
          import('./pages/planos/planos.module').then((m) => m.PlanosPageModule),
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
