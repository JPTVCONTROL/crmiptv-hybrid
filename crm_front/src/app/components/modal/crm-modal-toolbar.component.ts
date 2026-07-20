import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-crm-modal-toolbar',
  templateUrl: './crm-modal-toolbar.component.html',
})
export class CrmModalToolbarComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Output() voltar = new EventEmitter<void>();
}
