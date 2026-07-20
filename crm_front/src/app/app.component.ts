import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuController, RefresherCustomEvent } from '@ionic/angular';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import {
  AlertasOperacionaisService,
  EstadoAlertasOperacionais,
} from './core/services/alertas-operacionais.service';
import { SistemaService } from './core/services/sistema.service';
import { ConfiguracaoService } from './core/services/configuracao.service';
import { TemaService } from './core/services/tema.service';
import { PullRefreshService } from './core/services/pull-refresh.service';
import { ApiHealthService } from './core/services/api-health.service';
import { AlertaOperacional, Usuario } from './core/models';

interface MenuItem {
  nome: string;
  rota: string;
  icon: string;
}

interface MenuSecao {
  titulo: string;
  itens: MenuItem[];
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  readonly menuSecoes: MenuSecao[] = [
    {
      titulo: 'Visão geral',
      itens: [{ nome: 'Dashboard', rota: '/dashboard', icon: 'grid-outline' }],
    },
    {
      titulo: 'Clientes',
      itens: [
        { nome: 'Clientes', rota: '/clientes', icon: 'people-outline' },
        { nome: 'Catálogos', rota: '/catalogos', icon: 'library-outline' },
      ],
    },
    {
      titulo: 'Cobrança',
      itens: [
        { nome: 'Financeiro', rota: '/financeiro', icon: 'cash-outline' },
        { nome: 'Vencimentos', rota: '/vencimentos', icon: 'calendar-outline' },
        { nome: 'Cobrança Diária', rota: '/cobranca-diaria', icon: 'send-outline' },
        { nome: 'Automações', rota: '/automacoes', icon: 'timer-outline' },
      ],
    },
    {
      titulo: 'Análise',
      itens: [{ nome: 'Relatórios', rota: '/relatorios', icon: 'bar-chart-outline' }],
    },
    {
      titulo: 'Sistema',
      itens: [{ nome: 'Configurações', rota: '/configuracoes', icon: 'settings-outline' }],
    },
  ];

  isLoginRoute = false;
  usuario: Usuario | null = null;
  alertas: AlertaOperacional[] = [];
  totalPendencias = 0;
  apiOnline = true;

  private readonly destroy$ = new Subject<void>();
  private sincronizacaoInicialFeita = false;

  constructor(
    private menuCtrl: MenuController,
    private router: Router,
    private auth: AuthService,
    private alertasOperacionais: AlertasOperacionaisService,
    private sistemaService: SistemaService,
    private configuracao: ConfiguracaoService,
    private tema: TemaService,
    private pullRefresh: PullRefreshService,
    private apiHealth: ApiHealthService
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
    this.apiHealth.iniciar();
    this.apiHealth.online$
      .pipe(takeUntil(this.destroy$))
      .subscribe((online) => {
        this.apiOnline = online;
      });

    this.isLoginRoute = this.router.url.startsWith('/login');
    this.usuario = this.auth.getUsuario();

    this.alertasOperacionais.estado$
      .pipe(takeUntil(this.destroy$))
      .subscribe((estado) => this.aplicarEstadoAlertas(estado));

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

  get iniciaisUsuario(): string {
    if (!this.usuario?.nome) {
      return '?';
    }

    const partes = this.usuario.nome.trim().split(/\s+/).filter(Boolean);

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }

  badgeMenu(rota: string): number {
    return this.alertas
      .filter(
        (alerta) =>
          alerta.tipo !== 'ROTINA_CONCLUIDA' &&
          alerta.quantidade > 0 &&
          this.rotaAlertaCombina(alerta.rota, rota)
      )
      .reduce((total, alerta) => total + alerta.quantidade, 0);
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

  private aplicarEstadoAlertas(estado: EstadoAlertasOperacionais): void {
    this.alertas = estado.alertas;
    this.totalPendencias = estado.totalPendencias;
  }

  private rotaAlertaCombina(
    rotaAlerta: string | undefined,
    rotaMenu: string
  ): boolean {
    if (!rotaAlerta) {
      return false;
    }

    const baseAlerta = rotaAlerta.split('?')[0];
    return baseAlerta === rotaMenu;
  }

  fecharMenu(): void {
    void this.menuCtrl.close();
  }

  onPullRefresh(event: RefresherCustomEvent): void {
    this.apiHealth.verificar();
    this.pullRefresh.executar(() => event.target.complete());
  }

  verificarApi(): void {
    this.apiHealth.verificar();
  }

  sair(): void {
    this.fecharMenu();
    this.auth.logout();
  }
}
