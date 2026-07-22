import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { contatoRegistradoHoje } from '../../shared/utils/contato';

@Component({
  selector: 'app-marcar-cobrado-btn',
  template: `
    <button
      type="button"
      class="crm-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
      [class.crm-btn-action]="compact"
      [disabled]="desabilitado"
      (click)="marcar()"
    >
      {{ registrando ? 'Salvando...' : label }}
    </button>
  `,
})
export class MarcarCobradoBtnComponent {
  @Input() mensalidadeId!: number;
  @Input() ultimoContatoEm?: string | null;
  @Input() label = 'Marcar cobrado';
  @Input() compact = false;
  @Input() disabled = false;
  @Output() contatoRegistrado = new EventEmitter<number>();

  registrando = false;

  constructor(
    private mensalidadeService: MensalidadeService,
    private toast: ToastService
  ) {}

  get desabilitado(): boolean {
    return (
      this.disabled ||
      this.registrando ||
      !this.mensalidadeId ||
      contatoRegistradoHoje(this.ultimoContatoEm)
    );
  }

  marcar(): void {
    if (this.desabilitado) return;

    this.registrando = true;
    this.mensalidadeService.registrarContato(this.mensalidadeId).subscribe({
      next: () => {
        this.registrando = false;
        this.contatoRegistrado.emit(this.mensalidadeId);
      },
      error: () => {
        this.registrando = false;
        void this.toast.warning('Não foi possível marcar como cobrado.');
      },
    });
  }
}
