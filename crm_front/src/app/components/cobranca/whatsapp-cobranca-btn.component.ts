import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  abrirWhatsAppCobranca,
  telefoneValidoParaWhatsApp,
} from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-whatsapp-cobranca-btn',
  template: `
    <button
      type="button"
      class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      [disabled]="desabilitado"
      (click)="enviar()"
    >
      {{ label }}
    </button>
  `,
})
export class WhatsappCobrancaBtnComponent {
  @Input() telefone = '';
  @Input() mensagem = '';
  @Input() label = 'WhatsApp';
  @Input() disabled = false;
  @Output() erro = new EventEmitter<string>();

  get desabilitado(): boolean {
    return this.disabled || !telefoneValidoParaWhatsApp(this.telefone);
  }

  enviar(): void {
    const telefoneAtual = this.telefone;
    const mensagemAtual = this.mensagem;

    if (!telefoneValidoParaWhatsApp(telefoneAtual)) {
      const msg =
        'Telefone inválido para WhatsApp. Cadastre o número com DDD, por exemplo: (62) 99999-9999.';
      alert(msg);
      this.erro.emit(msg);
      return;
    }

    if (!mensagemAtual.trim()) {
      const msg = 'Não foi possível montar a mensagem do WhatsApp.';
      alert(msg);
      this.erro.emit(msg);
      return;
    }

    abrirWhatsAppCobranca(telefoneAtual, mensagemAtual);
  }
}
