import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { AlertasOperacionaisService } from './core/services/alertas-operacionais.service';
import { SistemaService } from './core/services/sistema.service';
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
export class AppComponent implements OnInit, OnDestroy {
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

  private readonly destroy$ = new Subject<void>();
  private sincronizacaoInicialFeita = false;

  constructor(
    private menuCtrl: MenuController,
    private router: Router,
    private auth: AuthService,
    private alertasOperacionais: AlertasOperacionaisService,
    private sistemaService: SistemaService,
    private configuracao: ConfiguracaoService,
    private confirmacao: ConfirmacaoService,
    private tema: TemaService,
    private toast: ToastService
  ) {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.isLoginRoute = event.urlAfterRedirects.startsWith('/login');
        this.atualizarAlertasSeAutenticado();
      });
  }

  ngOnInit(): void {
    this.isLoginRoute = this.router.url.startsWith('/login');
    this.usuario = this.auth.getUsuario();

    this.auth.usuario$
      .pipe(takeUntil(this.destroy$))
      .subscribe((usuario) => {
        this.usuario = usuario;
        if (usuario) {
          this.sincronizarDadosIniciais();
        } else {
          this.alertasOperacionais.limpar();
          this.sincronizacaoInicialFeita = false;
        }
      });

    if (this.auth.estaAutenticado()) {
      this.auth.restaurarSessao().subscribe({
        next: () => {
          this.configuracao.carregar().subscribe({
            error: () => this.tema.restaurarPadrao(),
          });
          this.sincronizarDadosIniciais();
        },
        error: () => this.auth.logout(),
      });
    } else {
      this.tema.restaurarPadrao();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private sincronizarDadosIniciais(): void {
    if (this.sincronizacaoInicialFeita || this.isLoginRoute) {
      return;
    }

    this.sincronizacaoInicialFeita = true;
    this.sistemaService.sincronizarCobrancas().subscribe({
      next: () => this.atualizarAlertasSeAutenticado(),
      error: () => {
        this.sincronizacaoInicialFeita = false;
        this.atualizarAlertasSeAutenticado();
      },
    });
  }

  private atualizarAlertasSeAutenticado(): void {
    if (this.isLoginRoute || !this.auth.estaAutenticado()) {
      return;
    }

    this.alertasOperacionais.atualizar().subscribe();
  }

  fecharMenu(): void {
    void this.menuCtrl.close();
  }

  sair(): void {
    this.fecharMenu();
    this.auth.logout();
  }
}
