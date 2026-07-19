import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ConfirmacaoService } from './core/services/confirmacao.service';
import { ConfiguracaoService } from './core/services/configuracao.service';
import { TemaService } from './core/services/tema.service';
import { ToastService } from './core/services/toast.service';
import { Usuario } from './core/models';

interface MenuItem {
  nome: string;
  rota: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  readonly menus: MenuItem[] = [
    { nome: 'Dashboard', rota: '/dashboard', icon: 'grid-outline' },
    { nome: 'Clientes', rota: '/clientes', icon: 'people-outline' },
    { nome: 'Financeiro', rota: '/financeiro', icon: 'cash-outline' },
    { nome: 'Cobrança Diária', rota: '/cobranca-diaria', icon: 'send-outline' },
    { nome: 'Vencimentos', rota: '/vencimentos', icon: 'calendar-outline' },
    { nome: 'Aplicativos', rota: '/aplicativos', icon: 'apps-outline' },
    { nome: 'Planos', rota: '/planos', icon: 'layers-outline' },
    { nome: 'Dispositivos', rota: '/dispositivos', icon: 'hardware-chip-outline' },
    { nome: 'Relatórios', rota: '/relatorios', icon: 'bar-chart-outline' },
    { nome: 'Configurações', rota: '/configuracoes', icon: 'settings-outline' },
  ];

  isLoginRoute = false;
  usuario: Usuario | null = null;

  constructor(
    private menuCtrl: MenuController,
    private router: Router,
    private auth: AuthService,
    private configuracao: ConfiguracaoService,
    private confirmacao: ConfirmacaoService,
    private tema: TemaService,
    private toast: ToastService
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isLoginRoute = this.router.url.startsWith('/login');
      });
  }

  ngOnInit(): void {
    this.isLoginRoute = this.router.url.startsWith('/login');
    this.usuario = this.auth.getUsuario();

    this.auth.usuario$.subscribe((usuario) => {
      this.usuario = usuario;
    });

    if (this.auth.estaAutenticado()) {
      this.auth.restaurarSessao().subscribe({
        next: () => {
          this.configuracao.carregar().subscribe({
            error: () => this.tema.restaurarPadrao(),
          });
        },
        error: () => this.auth.logout(),
      });
    } else {
      this.tema.restaurarPadrao();
    }
  }

  fecharMenu(): void {
    void this.menuCtrl.close();
  }

  sair(): void {
    this.fecharMenu();
    this.auth.logout();
  }
}
