import { Component, Input } from '@angular/core';

export type LoadingVariant = 'page' | 'table' | 'detail' | 'cards' | 'spinner';

@Component({
  selector: 'app-loading',
  template: `
    <div
      class="crm-loading"
      [class.crm-loading--inline]="variant === 'spinner'"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <ng-container [ngSwitch]="variant">
        <ng-container *ngSwitchCase="'spinner'">
          <div class="crm-loading-spinner" aria-hidden="true"></div>
          <p class="text-sm">{{ message }}</p>
        </ng-container>

        <div *ngSwitchCase="'page'" class="crm-skeleton-page w-full">
          <div class="crm-skeleton crm-skeleton-line w-48 h-8 mb-2"></div>
          <div class="crm-skeleton crm-skeleton-line w-64 h-4 mb-8"></div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div *ngFor="let _ of placeholders4" class="crm-skeleton crm-skeleton-card h-24"></div>
          </div>
          <div class="crm-skeleton crm-skeleton-block h-56"></div>
        </div>

        <div *ngSwitchCase="'table'" class="crm-skeleton-page w-full">
          <div class="crm-skeleton crm-skeleton-line w-40 h-7 mb-6"></div>
          <div class="crm-skeleton crm-skeleton-block h-10 mb-3"></div>
          <div *ngFor="let _ of placeholders6" class="crm-skeleton crm-skeleton-line h-12 mb-2"></div>
        </div>

        <div *ngSwitchCase="'detail'" class="crm-skeleton-page w-full">
          <div class="crm-skeleton crm-skeleton-hero h-36 mb-6"></div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div *ngFor="let _ of placeholders4" class="crm-skeleton crm-skeleton-card h-40"></div>
          </div>
        </div>

        <div *ngSwitchCase="'cards'" class="crm-skeleton-page w-full">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div *ngFor="let _ of placeholders6" class="crm-skeleton crm-skeleton-card h-32"></div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class LoadingComponent {
  @Input() message = 'Carregando...';
  @Input() variant: LoadingVariant = 'page';

  readonly placeholders4 = [0, 1, 2, 3];
  readonly placeholders6 = [0, 1, 2, 3, 4, 5];
}
