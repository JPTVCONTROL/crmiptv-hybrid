import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SistemaService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  baixarBackup(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/sistema/backup`, {
      responseType: 'blob',
    });
  }
}
