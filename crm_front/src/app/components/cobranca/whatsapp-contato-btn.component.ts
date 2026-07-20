import { Component, Input } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import {
  abrirWhatsAppContato,
  telefoneValidoParaWhatsApp,
} from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-whatsapp-contato-btn',
  template: `
    <button
      type="button"
      class="crm-btn-success disabled:opacity-50 disabled:cursor-not-allowed"
      [disabled]="desabilitado"
      (click)="abrir()"
    >
      {{ label }}
    </button>
  `,
})
export class WhatsappContatoBtnComponent {
  @Input() telefone = '';
  @Input() label = 'WhatsApp';

  constructor(private toast: ToastService) {}

  get desabilitado(): boolean {
    return !telefoneValidoParaWhatsApp(this.telefone);
  }

  abrir(): void {
    if (!telefoneValidoParaWhatsApp(this.telefone)) {
      void this.toast.warning(
        'Telefone inválido para WhatsApp. Cadastre o número com DDD, por exemplo: (62) 99999-9999.'
      );
      return;
    }

    abrirWhatsAppContato(this.telefone);
  }
}
