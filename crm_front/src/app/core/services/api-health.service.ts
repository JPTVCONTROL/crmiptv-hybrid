import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface HealthResponse {
  success?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiHealthService implements OnDestroy {
  private readonly onlineSubject = new BehaviorSubject(true);
  private timer?: ReturnType<typeof setInterval>;
  private iniciado = false;

  readonly online$: Observable<boolean> = this.onlineSubject.asObservable();

  constructor(private http: HttpClient) {}

  iniciar(): void {
    if (this.iniciado) {
      return;
    }

    this.iniciado = true;
    this.verificar();
    this.timer = setInterval(() => this.verificar(), 25_000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  estaOnline(): boolean {
    return this.onlineSubject.value;
  }

  verificar(): void {
    this.http
      .get<HealthResponse>(environment.healthUrl, {
        responseType: 'json',
      })
      .subscribe({
        next: (res) => this.onlineSubject.next(res?.success === true),
        error: () => this.onlineSubject.next(false),
      });
  }
}
