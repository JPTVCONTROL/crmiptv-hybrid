import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-whatsapp-cobranca-btn',
  template: `
    <button
      type="button"
      class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      [disabled]="disabled"
      (click)="enviar()"
    >
      WhatsApp
    </button>
  `,
})
export class WhatsappCobrancaBtnComponent {
  @Input() telefone = '';
  @Input() mensagem = '';
  @Input() disabled = false;
  @Output() erro = new EventEmitter<string>();

  enviar(): void {
    import('../../shared/utils/whatsapp').then(({ abrirWhatsAppCobranca, telefoneValidoParaWhatsApp }) => {
      if (!telefoneValidoParaWhatsApp(this.telefone)) {
        this.erro.emit('Telefone inválido para WhatsApp.');
        return;
      }
      abrirWhatsAppCobranca(this.telefone, this.mensagem);
    });
  }
}
