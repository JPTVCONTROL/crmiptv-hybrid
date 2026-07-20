import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import {
  abrirWhatsAppCobranca,
  telefoneValidoParaWhatsApp,
} from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-whatsapp-cobranca-btn',
  template: `
    <button
      type="button"
      class="crm-btn-success disabled:opacity-50 disabled:cursor-not-allowed"
      [class.crm-btn-action]="compact"
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
  @Input() mensalidadeId?: number;
  @Input() label = 'Cobrar';
  @Input() disabled = false;
  @Input() compact = false;
  @Output() erro = new EventEmitter<string>();
  @Output() contatoRegistrado = new EventEmitter<number>();

  constructor(
    private toast: ToastService,
    private mensalidadeService: MensalidadeService
  ) {}

  get desabilitado(): boolean {
    return this.disabled || !telefoneValidoParaWhatsApp(this.telefone);
  }

  enviar(): void {
    const telefoneAtual = this.telefone;
    const mensagemAtual = this.mensagem;

    if (!telefoneValidoParaWhatsApp(telefoneAtual)) {
      const msg =
        'Telefone inválido para WhatsApp. Cadastre o número com DDD, por exemplo: (62) 99999-9999.';
      void this.toast.warning(msg);
      this.erro.emit(msg);
      return;
    }

    if (!mensagemAtual.trim()) {
      const msg = 'Não foi possível montar a mensagem do WhatsApp.';
      void this.toast.warning(msg);
      this.erro.emit(msg);
      return;
    }

    abrirWhatsAppCobranca(telefoneAtual, mensagemAtual);
    this.registrarContatoSeNecessario();
  }

  private registrarContatoSeNecessario(): void {
    if (!this.mensalidadeId) return;

    this.mensalidadeService.registrarContato(this.mensalidadeId).subscribe({
      next: () => {
        this.contatoRegistrado.emit(this.mensalidadeId!);
      },
      error: () => {
        void this.toast.warning('WhatsApp aberto, mas o contato não foi salvo.');
      },
    });
  }
}
