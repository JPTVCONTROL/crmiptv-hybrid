import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="crm-empty-state">
      <div class="crm-empty-state-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
        </svg>
      </div>
      <p class="crm-empty-state-message">{{ message }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() message = 'Nenhum registro encontrado.';
}
