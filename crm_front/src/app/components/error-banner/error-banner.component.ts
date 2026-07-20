import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  template: `
    <div
      *ngIf="message"
      class="crm-card border border-red-500/30 bg-red-500/10 mb-4"
      role="alert"
      aria-live="assertive"
    >
      <p class="text-red-300 text-sm">{{ message }}</p>
      <p *ngIf="hint" class="text-slate-400 text-xs mt-2">{{ hint }}</p>
      <button
        *ngIf="showRetry"
        type="button"
        class="crm-btn-primary mt-3"
        (click)="retry.emit()"
      >
        {{ retryLabel }}
      </button>
    </div>
  `,
})
export class ErrorBannerComponent {
  @Input() message = '';
  @Input() hint = '';
  @Input() showRetry = true;
  @Input() retryLabel = 'Tentar novamente';
  @Output() retry = new EventEmitter<void>();
}
