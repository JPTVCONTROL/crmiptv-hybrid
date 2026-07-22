import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  AppAtualizacaoService,
  ResultadoVerificacaoApp,
} from '../../core/services/app-atualizacao.service';
import { textoErroLoginIndisponivel } from '../../shared/utils/api-endereco';
import {
  carregarCredenciaisLogin,
  lerManterConectadoLogin,
  lerSalvarDadosLogin,
  persistirCredenciaisLogin,
  salvarPreferenciasLogin,
} from '../../shared/utils/login-persist.util';
import { DESTAQUES_LOGIN } from '../../shared/utils/login-destaques.util';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  host: {
    class: 'block h-full min-h-0 overflow-hidden',
  },
})
export class LoginPage implements OnInit, OnDestroy {
  erro = '';
  carregando = false;
  mostrarSenha = false;
  atualizandoApp = false;
  statusApp = '';
  novaVersaoApp = false;
  versaoAppLabel = '';
  salvarDados = true;
  manterConectado = true;

  readonly destaques = DESTAQUES_LOGIN;

  /** Arco inferior: cards abaixo do login; coroa permanece no topo. */
  anguloOrbita(index: number): string {
    const total = this.destaques.length;
    const inicio = 4;
    const fim = 176;
    if (total <= 1) {
      return `${(inicio + fim) / 2}deg`;
    }
    const passo = (fim - inicio) / (total - 1);
    return `${inicio + index * passo}deg`;
  }

  private readonly destroy$ = new Subject<void>();
  private ultimaVerificacao?: ResultadoVerificacaoApp;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(4)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private appAtualizacao: AppAtualizacaoService
  ) {}

  get mostrarAtualizacaoApp(): boolean {
    return this.appAtualizacao.ehAppNativo;
  }

  ngOnInit(): void {
    this.salvarDados = lerSalvarDadosLogin();
    this.manterConectado = lerManterConectadoLogin();

    const credenciais = carregarCredenciaisLogin();
    if (credenciais.email || credenciais.senha) {
      this.form.patchValue(credenciais);
    }

    if (this.mostrarAtualizacaoApp) {
      this.carregarStatusAtualizacao();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  alternarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  carregarStatusAtualizacao(): void {
    if (!this.mostrarAtualizacaoApp || this.atualizandoApp) {
      return;
    }

    this.appAtualizacao
      .verificar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          this.ultimaVerificacao = resultado;
          this.novaVersaoApp = resultado.novaVersao;
          this.versaoAppLabel = resultado.remoto?.version ?? '';

          if (resultado.erro) {
            this.statusApp = resultado.erro;
            return;
          }

          this.statusApp = resultado.novaVersao
            ? `Versao ${this.versaoAppLabel || ''} disponivel no PC.`
            : 'App atualizado com o PC (atualiza ao abrir).';
        },
        error: () => {
          this.statusApp = 'Falha ao verificar atualizacao.';
        },
      });
  }

  verificarAtualizacaoApp(forcarReload: boolean): void {
    if (!this.mostrarAtualizacaoApp || this.atualizandoApp) {
      return;
    }

    this.atualizandoApp = true;
    this.statusApp = forcarReload
      ? 'Recarregando app...'
      : 'Verificando atualizacao...';

    this.appAtualizacao
      .checarEAtualizar({ forcarReload })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          this.ultimaVerificacao = resultado;
          this.atualizandoApp = false;
          this.novaVersaoApp = resultado.novaVersao;
          this.versaoAppLabel = resultado.remoto?.version ?? '';

          if (resultado.erro) {
            this.statusApp = resultado.erro;
            return;
          }

          if (forcarReload || resultado.novaVersao) {
            this.statusApp = resultado.novaVersao
              ? 'Nova versao encontrada. Atualizando...'
              : 'Recarregando app...';
            return;
          }

          this.statusApp = 'App atualizado com o PC.';
        },
        error: () => {
          this.atualizandoApp = false;
          this.statusApp = 'Falha ao verificar atualizacao.';
        },
      });
  }

  atualizarApp(): void {
    this.verificarAtualizacaoApp(true);
  }

  entrar(): void {
    if (this.form.invalid || this.carregando) {
      this.form.markAllAsTouched();
      return;
    }

    this.erro = '';
    this.carregando = true;

    const { email, senha } = this.form.getRawValue();

    salvarPreferenciasLogin(this.salvarDados, this.manterConectado);

    this.auth.login(email, senha, this.manterConectado).subscribe({
      next: () => {
        persistirCredenciaisLogin(this.salvarDados, email, senha);
        this.carregando = false;
        const returnUrl = this.resolverReturnUrl(
          this.route.snapshot.queryParamMap.get('returnUrl')
        );
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err: Error) => {
        this.carregando = false;
        const msg = err.message || '';
        const indisponivel =
          msg.toLowerCase().includes('failed to fetch') ||
          msg.toLowerCase().includes('network') ||
          msg.toLowerCase().includes('unknown error') ||
          msg.toLowerCase().includes('http failure');
        this.erro = indisponivel
          ? textoErroLoginIndisponivel()
          : msg || 'Não foi possível entrar.';
      },
    });
  }

  private resolverReturnUrl(raw: string | null): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
      return '/dashboard';
    }

    return raw;
  }
}
