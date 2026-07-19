import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginResponse, Usuario } from '../models';

const TOKEN_KEY = 'crm_jptv_token';
const USER_KEY = 'crm_jptv_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuarioSubject = new BehaviorSubject<Usuario | null>(
    this.carregarUsuarioLocal()
  );

  readonly usuario$ = this.usuarioSubject.asObservable();

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('/auth/login', { email, senha })
      .pipe(tap((resposta) => this.persistirSessao(resposta)));
  }

  restaurarSessao(): Observable<Usuario> {
    return this.api.get<Usuario>('/auth/me').pipe(
      tap((usuario) => {
        localStorage.setItem(USER_KEY, JSON.stringify(usuario));
        this.usuarioSubject.next(usuario);
      })
    );
  }

  alterarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
    return this.api.put<void>('/auth/senha', { senhaAtual, novaSenha });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.usuarioSubject.next(null);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUsuario(): Usuario | null {
    return this.usuarioSubject.value;
  }

  estaAutenticado(): boolean {
    return !!this.getToken();
  }

  private persistirSessao(resposta: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, resposta.token);
    localStorage.setItem(USER_KEY, JSON.stringify(resposta.usuario));
    this.usuarioSubject.next(resposta.usuario);
  }

  private carregarUsuarioLocal(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }
}
