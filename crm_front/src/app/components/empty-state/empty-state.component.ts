import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="crm-empty-state">
      <div class="crm-empty-state-icon" aria-hidden="true">
        <ion-icon *ngIf="iconName" [name]="iconName"></ion-icon>
        <svg
          *ngIf="!iconName"
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
          <path
            d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
          />
        </svg>
      </div>
      <p class="crm-empty-state-title">{{ displayTitle }}</p>
      <p *ngIf="displayHint" class="crm-empty-state-message">{{ displayHint }}</p>
      <button
        *ngIf="actionLabel"
        type="button"
        class="crm-btn-primary mt-2"
        (click)="action.emit()"
      >
        {{ actionLabel }}
      </button>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() iconName?: string;
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();

  get displayTitle(): string {
    return this.title || this.message || 'Nenhum registro encontrado';
  }

  get displayHint(): string {
    return this.title && this.message ? this.message : '';
  }
}
