import { Component, Input } from '@angular/core';

export type StatusBadgeTipo =
  | 'ATIVO'
  | 'ATRASADO'
  | 'INATIVO'
  | 'PAGO'
  | 'PENDENTE'
  | 'NEUTRAL'
  | 'CORTESIA'
  | 'SEM_COBRANCA';

const CLASSES: Record<StatusBadgeTipo, string> = {
  ATIVO: 'crm-badge-ativo',
  ATRASADO: 'crm-badge-atrasado',
  INATIVO: 'crm-badge-inativo',
  PAGO: 'crm-badge-pago',
  PENDENTE: 'crm-badge-pendente',
  NEUTRAL: 'crm-badge-neutral',
  CORTESIA: 'crm-badge-cortesia',
  SEM_COBRANCA: 'crm-badge-sem-cobranca',
};

@Component({
  selector: 'app-status-badge',
  template: `
    <span [class]="classe" [attr.aria-label]="rotulo">
      <span *ngIf="dot" class="crm-badge-dot" aria-hidden="true"></span>
      {{ rotulo }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) tipo!: StatusBadgeTipo;
  @Input() label?: string;
  @Input() dot = false;

  get rotulo(): string {
    return this.label ?? this.tipo.replace(/_/g, ' ');
  }

  get classe(): string {
    return CLASSES[this.tipo] ?? CLASSES.NEUTRAL;
  }
}
