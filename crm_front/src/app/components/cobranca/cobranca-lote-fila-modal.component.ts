import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CobrancaLoteFilaService } from '../../core/services/cobranca-lote-fila.service';
import { ToastService } from '../../core/services/toast.service';
import {
  abrirWhatsAppCobranca,
  CobrancaLoteItem,
  ResultadoCobrancaLote,
  urlWhatsAppCobranca,
} from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-cobranca-lote-fila-modal',
  templateUrl: './cobranca-lote-fila-modal.component.html',
})
export class CobrancaLoteFilaModalComponent {
  @Input() itens: CobrancaLoteItem[] = [];
  @Input() ignorados = 0;
  @Input() titulo = 'Envio em lote';
  @Input() rotuloAbrir = 'Abrir WhatsApp';
  @Input() modoManual = false;
  @Input() rotuloMarcar = 'Marcar enviado e próximo';
  @Input() exibirMarcarCobrado = false;
  @Input() rotuloMarcarCobrado = 'Marcar cobrado';

  indice = 0;
  abertos = 0;
  readonly idsEnviados: number[] = [];
  cancelado = false;
  mostrarMensagem = false;
  registrando = false;

  constructor(
    private modalCtrl: ModalController,
    private toast: ToastService,
    private filaService: CobrancaLoteFilaService
  ) {}

  get atual(): CobrancaLoteItem | null {
    return this.itens[this.indice] ?? null;
  }

  get progresso(): string {
    if (this.itens.length === 0) return '0 / 0';
    return `${Math.min(this.indice + 1, this.itens.length)} / ${this.itens.length}`;
  }

  get concluido(): boolean {
    return this.itens.length === 0 || this.indice >= this.itens.length;
  }

  get urlAtual(): string | null {
    const item = this.atual;
    if (!item) return null;
    return urlWhatsAppCobranca(item.telefone, item.mensagem);
  }

  abrir(): void {
    const item = this.atual;
    if (!item) return;

    abrirWhatsAppCobranca(item.telefone, item.mensagem);

    if (this.modoManual) {
      this.abertos++;
      return;
    }

    this.abertos++;
    this.idsEnviados.push(item.id);
    this.avancar();
  }

  async marcarEnviado(): Promise<void> {
    const item = this.atual;
    if (!item || this.registrando) return;

    this.registrando = true;
    try {
      const registrar = this.filaService.obterMarcadorEnvioAtual();
      if (registrar) {
        await registrar(item.id);
      }
      if (!this.idsEnviados.includes(item.id)) {
        this.idsEnviados.push(item.id);
      }
      this.avancar();
    } catch {
      void this.toast.error('Não foi possível registrar o envio.');
    } finally {
      this.registrando = false;
    }
  }

  pular(): void {
    this.avancar();
  }

  marcarCobrado(): void {
    const item = this.atual;
    if (!item) return;

    if (!this.idsEnviados.includes(item.id)) {
      this.idsEnviados.push(item.id);
    }
    this.avancar();
  }

  async copiarLink(): Promise<void> {
    const url = this.urlAtual;
    if (!url) {
      void this.toast.warning('Link indisponível para este cliente.');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      void this.toast.success('Link do WhatsApp copiado.');
    } catch {
      void this.toast.error('Não foi possível copiar o link.');
    }
  }

  encerrar(): void {
    this.cancelado = this.indice < this.itens.length;
    void this.fechar();
  }

  private avancar(): void {
    this.indice++;
    this.mostrarMensagem = false;

    if (this.concluido) {
      void this.fechar(false);
    }
  }

  private async fechar(interrompido = true): Promise<void> {
    const resultado: ResultadoCobrancaLote = {
      abertos: this.abertos,
      ignorados: this.ignorados,
      cancelado: interrompido ? this.cancelado : false,
      idsEnviados: [...this.idsEnviados],
    };

    await this.modalCtrl.dismiss(resultado);
  }
}
