import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { origemApi } from '../../shared/utils/api-endereco';

export interface VersaoAppRemota {
  buildId: string;
  version: string;
  builtAt?: string;
}

export interface ResultadoVerificacaoApp {
  remoto?: VersaoAppRemota;
  localBuildId: string | null;
  novaVersao: boolean;
  erro?: string;
}

const STORAGE_BUILD_ID = 'crm-app-build-id';
const INTERVALO_MINIMO_MS = 5_000;

export interface OpcoesVerificacaoApp {
  forcarReload?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppAtualizacaoService {
  private verificando = false;
  private autoUpdateIniciado = false;
  private ultimaChecagemMs = 0;
  private appStateHandle?: { remove: () => void };

  constructor(private http: HttpClient) {}

  get ehAppNativo(): boolean {
    return Capacitor.isNativePlatform();
  }

  urlVersao(): string {
    return `${origemApi()}/app/version.json`;
  }

  urlApp(): string {
    return `${origemApi()}/app/`;
  }

  buildIdLocal(): string | null {
    return localStorage.getItem(STORAGE_BUILD_ID);
  }

  iniciarVerificacaoAutomatica(): void {
    if (!this.ehAppNativo || this.autoUpdateIniciado) {
      return;
    }

    this.autoUpdateIniciado = true;
    this.checarEAtualizar().subscribe();

    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.checarEAtualizar().subscribe();
      }
    }).then((handle) => {
      this.appStateHandle = handle;
    });
  }

  checarEAtualizar(
    opcoes: OpcoesVerificacaoApp = {}
  ): Observable<ResultadoVerificacaoApp> {
    const forcarReload = opcoes.forcarReload ?? false;
    const localBuildId = this.buildIdLocal();

    if (!this.ehAppNativo) {
      return of({ localBuildId, novaVersao: false });
    }

    const agora = Date.now();
    if (
      !forcarReload &&
      (this.verificando || agora - this.ultimaChecagemMs < INTERVALO_MINIMO_MS)
    ) {
      return of({ localBuildId, novaVersao: false });
    }

    this.verificando = true;
    this.ultimaChecagemMs = agora;

    return this.verificar().pipe(
      tap((resultado) => {
        if (resultado.erro) {
          return;
        }

        if (forcarReload || resultado.novaVersao) {
          this.aplicarAtualizacao(resultado.remoto);
        }
      }),
      finalize(() => {
        this.verificando = false;
      })
    );
  }

  verificar(): Observable<ResultadoVerificacaoApp> {
    const localBuildId = this.buildIdLocal();

    if (!this.ehAppNativo) {
      return of({ localBuildId, novaVersao: false });
    }

    return this.http
      .get(`${this.urlVersao()}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' },
        responseType: 'text',
      })
      .pipe(
        map((corpo) => this.interpretarRespostaVersao(corpo, localBuildId)),
        catchError((err: { status?: number; message?: string }) =>
          of({
            localBuildId,
            novaVersao: false,
            erro: this.mensagemErroVerificacao(err),
          })
        )
      );
  }

  private interpretarRespostaVersao(
    corpo: string,
    localBuildId: string | null
  ): ResultadoVerificacaoApp {
    let remoto: VersaoAppRemota;

    try {
      remoto = JSON.parse(corpo) as VersaoAppRemota;
    } catch {
      return {
        localBuildId,
        novaVersao: false,
        erro: 'App nao publicado no PC. Execute npm run app:publish e tente de novo.',
      };
    }

    if (!remoto?.buildId) {
      const payload = remoto as VersaoAppRemota & { message?: string };
      const msg =
        typeof payload.message === 'string'
          ? payload.message
          : 'Versao remota invalida. No PC execute npm run app:publish.';

      return {
        localBuildId,
        novaVersao: false,
        erro: msg,
      };
    }

    return {
      remoto,
      localBuildId,
      novaVersao: remoto.buildId !== localBuildId,
    };
  }

  private mensagemErroVerificacao(err: {
    status?: number;
    message?: string;
  }): string {
    if (err.status === 503 || err.status === 404) {
      return 'App nao publicado no PC. Execute npm run app:publish e tente de novo.';
    }

    const msg = (err.message || '').toLowerCase();
    if (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('unknown error') ||
      msg.includes('http failure') ||
      msg.includes('0')
    ) {
      return 'Sem conexao com o PC. Confirme Tailscale e API ligada.';
    }

    return err.message || 'Nao foi possivel verificar a versao.';
  }

  aplicarAtualizacao(remoto?: VersaoAppRemota): void {
    if (remoto?.buildId) {
      localStorage.setItem(STORAGE_BUILD_ID, remoto.buildId);
    }

    const destino = remoto?.buildId
      ? `${this.urlApp()}?v=${encodeURIComponent(remoto.buildId)}`
      : `${this.urlApp()}?v=${Date.now()}`;

    window.location.replace(destino);
  }

  pararVerificacaoAutomatica(): void {
    this.appStateHandle?.remove();
    this.appStateHandle = undefined;
    this.autoUpdateIniciado = false;
  }
}
