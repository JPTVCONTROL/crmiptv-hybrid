import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  host: { class: 'crm-page-header' },
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
