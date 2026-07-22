import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';
import { AlertaOperacional, DashboardResumo } from '../models';
import { DashboardService } from './dashboard.service';
import { DadosSyncService } from './dados-sync.service';

export interface EstadoAlertasOperacionais {
  alertas: AlertaOperacional[];
  totalPendencias: number;
  rotinaFeita: boolean;
  progressoRotina: string;
  carregando: boolean;
}

const ESTADO_INICIAL: EstadoAlertasOperacionais = {
  alertas: [],
  totalPendencias: 0,
  rotinaFeita: false,
  progressoRotina: '',
  carregando: false,
};

@Injectable({ providedIn: 'root' })
export class AlertasOperacionaisService {
  private readonly estadoSubject = new BehaviorSubject<EstadoAlertasOperacionais>(
    ESTADO_INICIAL
  );

  readonly estado$ = this.estadoSubject.asObservable();

  constructor(
    private dashboardService: DashboardService,
    private sync: DadosSyncService
  ) {
    this.sync.mudancas$
      .pipe(
        filter((evento) =>
          evento.dominios.some((dominio) =>
            ['dashboard', 'clientes', 'mensalidades', 'tarefas'].includes(dominio)
          )
        )
      )
      .subscribe(() => {
        this.atualizar().subscribe();
      });
  }

  get snapshot(): EstadoAlertasOperacionais {
    return this.estadoSubject.value;
  }

  limpar(): void {
    this.estadoSubject.next(ESTADO_INICIAL);
  }

  atualizar(): Observable<EstadoAlertasOperacionais> {
    this.estadoSubject.next({
      ...this.estadoSubject.value,
      carregando: true,
    });

    return this.dashboardService.obterResumo().pipe(
      map((resumo) => this.mapearResumo(resumo)),
      tap((estado) => this.estadoSubject.next(estado)),
      catchError(() => {
        this.estadoSubject.next({
          ...this.estadoSubject.value,
          carregando: false,
        });
        return of(this.estadoSubject.value);
      })
    );
  }

  private mapearResumo(resumo: DashboardResumo): EstadoAlertasOperacionais {
    const alertasUrgentes = resumo.alertas.filter(
      (alerta) => alerta.tipo !== 'ROTINA_CONCLUIDA'
    );

    return {
      alertas: resumo.alertas,
      totalPendencias: alertasUrgentes.reduce(
        (total, alerta) => total + alerta.quantidade,
        0
      ),
      rotinaFeita: resumo.cobrancaDiaria.rotinaFeita,
      progressoRotina: `${resumo.cobrancaDiaria.contactadosHoje} de ${resumo.cobrancaDiaria.totalElegiveis} contactados hoje`,
      carregando: false,
    };
  }
}
