import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AlertaOperacional } from '../../core/models';
import {
  AlertasOperacionaisService,
  EstadoAlertasOperacionais,
} from '../../core/services/alertas-operacionais.service';

@Component({
  selector: 'app-alertas-sino',
  templateUrl: './alertas-sino.component.html',
  styleUrls: ['./alertas-sino.component.scss'],
})
export class AlertasSinoComponent implements OnInit, OnDestroy {
  private static nextId = 0;

  aberto = false;
  layoutCompacto = false;
  estaNoDashboard = false;
  readonly painelId = `alertas-sino-painel-${++AlertasSinoComponent.nextId}`;

  @ViewChild('painelAlertas') painelRef?: ElementRef<HTMLElement>;
  @ViewChild('overlayHost') overlayHost?: ElementRef<HTMLElement>;
  @ViewChild('botaoAlertas') botaoRef?: ElementRef<HTMLButtonElement>;
  estado: EstadoAlertasOperacionais = {
    alertas: [],
    totalPendencias: 0,
    rotinaFeita: false,
    progressoRotina: '',
    carregando: false,
  };

  private readonly destroy$ = new Subject<void>();
  private readonly compactQuery = window.matchMedia('(max-width: 1023px)');
  private ignorarCliqueDocumentoAte = 0;
  private overlayParentOriginal: HTMLElement | null = null;
  private readonly onCompactChange = (): void => {
    const eraCompacto = this.layoutCompacto;
    this.atualizarLayoutCompacto();

    if (this.aberto && eraCompacto !== this.layoutCompacto) {
      this.fecharPainel();
    }
  };

  constructor(
    private alertasService: AlertasOperacionaisService,
    private router: Router,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.atualizarLayoutCompacto();
    this.atualizarRotaDashboard();
    this.compactQuery.addEventListener('change', this.onCompactChange);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.atualizarRotaDashboard());

    this.alertasService.estado$
      .pipe(takeUntil(this.destroy$))
      .subscribe((estado) => {
        this.estado = estado;
      });
  }

  ngOnDestroy(): void {
    this.compactQuery.removeEventListener('change', this.onCompactChange);
    this.removerOverlayDoBody();
    document.body.classList.remove('alertas-sino-scroll-lock');
    this.destroy$.next();
    this.destroy$.complete();
  }

  get badge(): number {
    return this.estado.totalPendencias;
  }

  get temUrgencias(): boolean {
    return this.estado.alertas.some(
      (alerta) => alerta.tipo !== 'ROTINA_CONCLUIDA'
    );
  }

  get alertasCadastro(): AlertaOperacional[] {
    return this.estado.alertas.filter((alerta) => this.alertaEhCadastro(alerta));
  }

  get alertasOperacionais(): AlertaOperacional[] {
    return this.estado.alertas.filter(
      (alerta) => !this.alertaEhCadastro(alerta)
    );
  }

  get rotuloBadge(): string {
    if (this.badge <= 0) {
      return '';
    }

    return `${this.badge} pendência${this.badge === 1 ? '' : 's'}`;
  }

  get mostrarLinkDashboard(): boolean {
    return !this.estaNoDashboard;
  }

  alternarPainel(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    if (this.aberto) {
      this.fecharPainel();
      return;
    }

    this.aberto = true;
    this.ignorarCliqueDocumentoAte = Date.now() + 350;
    setTimeout(() => {
      this.teleportarOverlaySeNecessario();
      this.focarPrimeiroItem();
    }, 0);
  }

  fecharPainel(): void {
    this.removerOverlayDoBody();
    document.body.classList.remove('alertas-sino-scroll-lock');
    this.aberto = false;
    this.botaoRef?.nativeElement.focus();
  }

  private atualizarLayoutCompacto(): void {
    this.layoutCompacto = this.compactQuery.matches;
  }

  private atualizarRotaDashboard(): void {
    const rota = this.router.url.split('?')[0].split('#')[0];
    this.estaNoDashboard = rota === '/dashboard';
  }

  private teleportarOverlaySeNecessario(): void {
    if (!this.aberto || !this.layoutCompacto) {
      return;
    }

    const host = this.overlayHost?.nativeElement;
    if (!host || host.parentElement === document.body) {
      return;
    }

    this.overlayParentOriginal = host.parentElement;
    document.body.appendChild(host);
    document.body.classList.add('alertas-sino-scroll-lock');
  }

  private removerOverlayDoBody(): void {
    const host = this.overlayHost?.nativeElement;
    if (!host || !this.overlayParentOriginal) {
      return;
    }

    if (host.parentElement === document.body) {
      this.overlayParentOriginal.appendChild(host);
    }

    this.overlayParentOriginal = null;
  }

  private focarPrimeiroItem(): void {
    const painel = this.painelRef?.nativeElement;
    if (!painel) return;

    const focavel = painel.querySelector<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    focavel?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.aberto) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.fecharPainel();
      return;
    }

    if (event.key !== 'Tab') return;

    const painel = this.painelRef?.nativeElement;
    if (!painel) return;

    const focaveis = Array.from(
      painel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);

    if (focaveis.length === 0) return;

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = document.activeElement as HTMLElement | null;

    if (event.shiftKey && ativo === primeiro) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && ativo === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  abrirAlerta(alerta: AlertaOperacional): void {
    this.fecharPainel();
    if (alerta.rota) {
      void this.router.navigateByUrl(alerta.rota);
    }
  }

  irParaDashboard(): void {
    this.fecharPainel();
    void this.router.navigateByUrl('/dashboard');
  }

  iconeAlerta(alerta: AlertaOperacional): string {
    switch (alerta.tipo) {
      case 'CADASTRO_SEM_TELEFONE':
        return 'call-outline';
      case 'CADASTRO_SEM_PLANO':
        return 'layers-outline';
      case 'CADASTRO_SEM_VALOR':
        return 'cash-outline';
      case 'CADASTRO_SEM_EXPIRACAO':
        return 'calendar-outline';
      case 'CADASTRO_SEM_CREDENCIAIS':
        return 'key-outline';
      case 'CADASTRO_SEM_APLICATIVO':
        return 'apps-outline';
      case 'CADASTRO_SEM_MAC':
        return 'hardware-chip-outline';
      case 'CADASTRO_INCOMPLETO':
        return 'document-text-outline';
      case 'ROTINA_PENDENTE':
        return 'send-outline';
      case 'VENCE_HOJE':
        return 'calendar-outline';
      case 'SEM_TELEFONE':
        return 'call-outline';
      case 'NAO_CONTACTADO':
        return 'chatbubble-ellipses-outline';
      case 'EXPIRADO_SEM_MENSALIDADE':
        return 'alert-circle-outline';
      case 'ROTINA_CONCLUIDA':
        return 'checkmark-circle-outline';
      default:
        return 'notifications-outline';
    }
  }

  classeAlerta(alerta: AlertaOperacional): string {
    switch (alerta.tipo) {
      case 'CADASTRO_SEM_TELEFONE':
      case 'CADASTRO_SEM_CREDENCIAIS':
      case 'CADASTRO_SEM_MAC':
        return 'alerta-red';
      case 'CADASTRO_SEM_PLANO':
      case 'CADASTRO_SEM_VALOR':
      case 'CADASTRO_SEM_EXPIRACAO':
      case 'CADASTRO_SEM_APLICATIVO':
      case 'CADASTRO_INCOMPLETO':
        return 'alerta-amber';
      case 'ROTINA_PENDENTE':
        return 'alerta-violeta';
      case 'VENCE_HOJE':
        return 'alerta-amber';
      case 'NAO_CONTACTADO':
        return 'alerta-red';
      case 'SEM_TELEFONE':
        return 'alerta-amber';
      case 'EXPIRADO_SEM_MENSALIDADE':
        return 'alerta-red';
      case 'ROTINA_CONCLUIDA':
        return 'alerta-green';
      default:
        return 'alerta-neutral';
    }
  }

  alertaEhCadastro(alerta: AlertaOperacional): boolean {
    return alerta.tipo.startsWith('CADASTRO_');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.aberto) {
      return;
    }

    if (Date.now() < this.ignorarCliqueDocumentoAte) {
      return;
    }

    const alvo = event.target as Node | null;
    const dentroDoGatilho =
      alvo != null && this.elementRef.nativeElement.contains(alvo);
    const dentroDoOverlay =
      alvo != null && this.overlayHost?.nativeElement.contains(alvo);

    if (dentroDoGatilho || dentroDoOverlay) {
      return;
    }

    this.fecharPainel();
  }
}
