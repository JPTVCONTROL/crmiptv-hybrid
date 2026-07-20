import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-crm-modal-shell',
  templateUrl: './crm-modal-shell.component.html',
})
export class CrmModalShellComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() comRodape = true;
  @Output() voltar = new EventEmitter<void>();
}
