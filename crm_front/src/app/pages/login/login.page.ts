import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
})
export class LoginPage {
  erro = '';
  carregando = false;

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
        this.carregando = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl || '/dashboard');
      },
      error: (err: Error) => {
        this.carregando = false;
        this.erro = err.message || 'Não foi possível entrar.';
      },
    });
  }
}
