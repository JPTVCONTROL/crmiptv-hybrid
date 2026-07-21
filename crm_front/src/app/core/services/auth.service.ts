import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginResponse, Usuario } from '../models';
import {
  sessaoPersistenteHabilitada,
} from '../../shared/utils/login-persist.util';

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

  login(
    email: string,
    senha: string,
    manterConectado = true
  ): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('/auth/login', { email, senha })
      .pipe(tap((resposta) => this.persistirSessao(resposta, manterConectado)));
  }

  restaurarSessao(): Observable<Usuario> {
    return this.api.get<Usuario>('/auth/me').pipe(
      tap((usuario) => {
        const storage = this.storageSessaoAtual();
        storage.setItem(USER_KEY, JSON.stringify(usuario));
        this.usuarioSubject.next(usuario);
      })
    );
  }

  alterarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
    return this.api.put<void>('/auth/senha', { senhaAtual, novaSenha });
  }

  logout(): void {
    this.limparSessao();
    this.usuarioSubject.next(null);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return (
      sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY)
    );
  }

  getUsuario(): Usuario | null {
    return this.usuarioSubject.value;
  }

  estaAutenticado(): boolean {
    return !!this.getToken();
  }

  private persistirSessao(
    resposta: LoginResponse,
    manterConectado = sessaoPersistenteHabilitada()
  ): void {
    this.limparSessao();

    const storage = manterConectado ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, resposta.token);
    storage.setItem(USER_KEY, JSON.stringify(resposta.usuario));
    this.usuarioSubject.next(resposta.usuario);
  }

  private carregarUsuarioLocal(): Usuario | null {
    const raw =
      sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }

  private storageSessaoAtual(): Storage {
    if (sessionStorage.getItem(TOKEN_KEY)) {
      return sessionStorage;
    }

    return localStorage;
  }

  private limparSessao(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}
