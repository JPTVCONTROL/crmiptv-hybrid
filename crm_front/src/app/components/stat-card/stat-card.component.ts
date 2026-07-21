import { Component, Input } from '@angular/core';
import {
  CRM_STAT_VARIANT_COLORS,
  StatCardVariant,
} from '../../shared/constants/crm-theme.constants';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value = '';
  @Input() subtitle = '';
  @Input() variant: StatCardVariant = 'primary';
  @Input() color = '';

  get corStat(): string {
    if (this.color?.trim()) {
      return this.color.trim();
    }

    return CRM_STAT_VARIANT_COLORS[this.variant];
  }
}
