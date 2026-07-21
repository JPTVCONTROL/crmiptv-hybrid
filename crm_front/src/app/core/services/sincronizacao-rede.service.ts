import { Injectable, OnDestroy } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { take } from 'rxjs';
import { AuthService } from './auth.service';
import { DadosSyncService } from './dados-sync.service';
import { SistemaService } from './sistema.service';

/** Mantém web e APK alinhados na mesma API (rede local). */
@Injectable({ providedIn: 'root' })
export class SincronizacaoRedeService implements OnDestroy {
  private readonly intervaloMs = 12_000;
  private timer?: ReturnType<typeof setInterval>;
  private ultimaRevisao?: number;
  private ativo = false;
  private consultando = false;
  private appStateHandle?: { remove: () => void };
  private readonly onVisibilidade = (): void => {
    if (document.visibilityState === 'visible') {
      this.verificar();
    }
  };

  constructor(
    private auth: AuthService,
    private sistema: SistemaService,
    private sync: DadosSyncService
  ) {}

  ngOnDestroy(): void {
    this.parar();
  }

  iniciar(): void {
    if (this.ativo || !this.auth.estaAutenticado()) {
      return;
    }

    this.ativo = true;
    this.registrarRetornoAoFoco();
    this.verificar();
    this.timer = setInterval(() => this.verificar(), this.intervaloMs);
  }

  parar(): void {
    this.ativo = false;
    this.ultimaRevisao = undefined;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    document.removeEventListener('visibilitychange', this.onVisibilidade);
    this.appStateHandle?.remove();
    this.appStateHandle = undefined;
  }

  private registrarRetornoAoFoco(): void {
    document.addEventListener('visibilitychange', this.onVisibilidade);

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          this.verificar();
        }
      }).then((handle) => {
        this.appStateHandle = handle;
      });
    }
  }

  private verificar(): void {
    if (!this.ativo || !this.auth.estaAutenticado() || this.consultando) {
      return;
    }

    this.consultando = true;
    this.sistema
      .obterRevisaoDados()
      .pipe(take(1))
      .subscribe({
        next: ({ revisao }) => {
          this.consultando = false;

          if (this.ultimaRevisao !== undefined && revisao !== this.ultimaRevisao) {
            this.sync.notificarTudo();
          }

          this.ultimaRevisao = revisao;
        },
        error: () => {
          this.consultando = false;
        },
      });
  }
}
