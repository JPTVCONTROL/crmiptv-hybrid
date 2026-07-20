import { Injectable } from '@angular/core';

export type PullRefreshCallback = (concluir: () => void) => void;

@Injectable({ providedIn: 'root' })
export class PullRefreshService {
  private callback: PullRefreshCallback | null = null;

  registrar(callback: PullRefreshCallback): void {
    this.callback = callback;
  }

  limpar(): void {
    this.callback = null;
  }

  executar(concluir: () => void): void {
    if (!this.callback) {
      concluir();
      return;
    }

    this.callback(concluir);
  }
}
