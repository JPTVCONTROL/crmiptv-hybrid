import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `<div class="text-slate-500 text-center py-12">{{ message }}</div>`,
})
export class EmptyStateComponent {
  @Input() message = 'Nenhum registro encontrado.';
}
