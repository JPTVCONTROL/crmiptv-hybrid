import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { abrirWhatsAppCobranca, telefoneValidoParaWhatsApp } from '../../shared/utils/whatsapp';
import { rotuloBloqueioEnviado } from '../../shared/utils/contato';

@Component({
  selector: 'app-whatsapp-bloqueio-btn',
  template: `
    <div class="inline-flex flex-col items-stretch gap-0.5">
      <button
        type="button"
        class="crm-btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
        [class.crm-btn-action]="compact"
        [disabled]="desabilitado"
        (click)="enviar()"
      >
        {{ label }}
      </button>
      <span
        *ngIf="rotuloEnviado"
        class="text-[10px] leading-tight text-slate-500 text-center max-w-[8.5rem]"
      >
        {{ rotuloEnviado }}
      </span>
    </div>
  `,
})
export class WhatsappBloqueioBtnComponent {
  @Input() telefone = '';
  @Input() mensagem = '';
  @Input() mensalidadeId?: number;
  @Input() bloqueioEnviadoEm?: string | null;
  @Input() label = 'Avisar bloqueio';
  @Input() disabled = false;
  @Input() compact = false;
  @Output() bloqueioRegistrado = new EventEmitter<{
    mensalidadeId: number;
    bloqueioEnviadoEm: string;
  }>();

  constructor(
    private toast: ToastService,
    private mensalidadeService: MensalidadeService
  ) {}

  get desabilitado(): boolean {
    return (
      this.disabled ||
      !this.mensalidadeId ||
      !telefoneValidoParaWhatsApp(this.telefone) ||
      !this.mensagem.trim()
    );
  }

  get rotuloEnviado(): string | null {
    return rotuloBloqueioEnviado(this.bloqueioEnviadoEm);
  }

  enviar(): void {
    if (!this.mensalidadeId) {
      return;
    }

    if (!telefoneValidoParaWhatsApp(this.telefone)) {
      void this.toast.warning(
        'Telefone inválido para WhatsApp. Cadastre o número com DDD, por exemplo: (62) 99999-9999.'
      );
      return;
    }

    if (!this.mensagem.trim()) {
      void this.toast.warning('Não foi possível montar a mensagem de bloqueio.');
      return;
    }

    abrirWhatsAppCobranca(this.telefone, this.mensagem);

    this.mensalidadeService.registrarBloqueio(this.mensalidadeId).subscribe({
      next: (resultado) => {
        this.bloqueioEnviadoEm = resultado.bloqueioEnviadoEm;
        this.bloqueioRegistrado.emit({
          mensalidadeId: this.mensalidadeId!,
          bloqueioEnviadoEm: resultado.bloqueioEnviadoEm,
        });
      },
      error: (err) => {
        void this.toast.warning(
          err?.message ?? 'WhatsApp aberto, mas o aviso de bloqueio não foi salvo.'
        );
      },
    });
  }
}
