import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.baseUrl}${path}`)
      .pipe(map((res) => this.extractData(res)), catchError(this.handleError));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}${path}`, body)
      .pipe(map((res) => this.extractData(res)), catchError(this.handleError));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(`${this.baseUrl}${path}`, body)
      .pipe(map((res) => this.extractData(res)), catchError(this.handleError));
  }

  putAction(path: string, body: unknown = {}): Observable<void> {
    return this.http
      .put<ApiResponse>(`${this.baseUrl}${path}`, body)
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.message ?? 'Erro na requisição');
          }
        }),
        catchError(this.handleError)
      );
  }

  putActionResult<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .put<ApiResponse & T>(`${this.baseUrl}${path}`, body)
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.message ?? 'Erro na requisição');
          }
          return res as unknown as T;
        }),
        catchError(this.handleError)
      );
  }

  delete(path: string): Observable<void> {
    return this.http
      .delete<ApiResponse>(`${this.baseUrl}${path}`)
      .pipe(
        map((res) => {
          if (!res.success) {
            throw new Error(res.message ?? 'Erro na requisição');
          }
        }),
        catchError(this.handleError)
      );
  }

  getBlob(path: string): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}${path}`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  private extractData<T>(response: ApiResponse<T>): T {
    if (!response.success) {
      throw new Error(response.message ?? 'Erro na requisição');
    }
    return response.data as T;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      error.error?.message ??
      error.message ??
      'Erro ao comunicar com o servidor';
    return throwError(() => new Error(message));
  }
}
