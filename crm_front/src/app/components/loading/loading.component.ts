import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `<div class="text-slate-400 py-8 text-center">{{ message }}</div>`,
})
export class LoadingComponent {
  @Input() message = 'Carregando...';
}
