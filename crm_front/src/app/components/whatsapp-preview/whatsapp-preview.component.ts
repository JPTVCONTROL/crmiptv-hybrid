import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-whatsapp-preview',
  templateUrl: './whatsapp-preview.component.html',
})
export class WhatsappPreviewComponent {
  @Input() mensagem = '';
  @Input() contato = 'João Silva';
  @Input() rotulo = 'Prévia WhatsApp';
  @Input() detalhes = '';

  get inicialContato(): string {
    const nome = this.contato.trim();
    return nome ? nome.charAt(0).toUpperCase() : '?';
  }

  get hora(): string {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
