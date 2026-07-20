import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `
    <div class="crm-loading" role="status" aria-live="polite" aria-busy="true">
      <div class="crm-loading-spinner" aria-hidden="true"></div>
      <p class="text-sm">{{ message }}</p>
    </div>
  `,
})
export class LoadingComponent {
  @Input() message = 'Carregando...';
}
