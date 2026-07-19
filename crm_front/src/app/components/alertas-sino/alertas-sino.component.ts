import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
  aberto = false;
  estado: EstadoAlertasOperacionais = {
    alertas: [],
    totalPendencias: 0,
    rotinaFeita: false,
    progressoRotina: '',
    carregando: false,
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private alertasService: AlertasOperacionaisService,
    private router: Router,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.alertasService.estado$
      .pipe(takeUntil(this.destroy$))
      .subscribe((estado) => {
        this.estado = estado;
      });
  }

  ngOnDestroy(): void {
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

  alternarPainel(): void {
    this.aberto = !this.aberto;
  }

  fecharPainel(): void {
    this.aberto = false;
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
    if (!this.aberto) return;

    const alvo = event.target as Node | null;
    if (alvo && !this.elementRef.nativeElement.contains(alvo)) {
      this.fecharPainel();
    }
  }
}
