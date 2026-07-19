import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
})
export class PageHeaderComponent {
  @HostBinding('class') readonly hostClass = 'crm-page-header block w-full';

  @Input() title = '';
  @Input() subtitle = '';
}
