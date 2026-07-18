import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value = '';
  @Input() color = '#A855F7';
}
