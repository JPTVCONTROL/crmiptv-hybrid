import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DashboardResumo } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  obterResumo(): Observable<DashboardResumo> {
    return this.api.get<DashboardResumo>('/dashboard/resumo');
  }
}
