import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

const EMAIL_LEMBRADO_KEY = 'crm-login-email';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
})
export class LoginPage implements OnInit {
  erro = '';
  carregando = false;
  mostrarSenha = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(4)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const emailSalvo = localStorage.getItem(EMAIL_LEMBRADO_KEY);
    if (emailSalvo) {
      this.form.patchValue({ email: emailSalvo });
    }
  }

  alternarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  entrar(): void {
    if (this.form.invalid || this.carregando) {
      this.form.markAllAsTouched();
      return;
    }

    this.erro = '';
    this.carregando = true;

    const { email, senha } = this.form.getRawValue();

    this.auth.login(email, senha).subscribe({
      next: () => {
        localStorage.setItem(EMAIL_LEMBRADO_KEY, email);
        this.carregando = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl || '/dashboard');
      },
      error: (err: Error) => {
        this.carregando = false;
        const msg = err.message || '';
        this.erro = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')
          ? 'Servidor indisponível. Verifique se a API está rodando.'
          : msg || 'Não foi possível entrar.';
      },
    });
  }
}
