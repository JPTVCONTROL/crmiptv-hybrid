import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
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
export class CobrancaLoteFilaModalComponent implements OnInit {
  @Input() itens: CobrancaLoteItem[] = [];
  @Input() ignorados = 0;
  @Input() titulo = 'Envio em lote';
  @Input() rotuloAbrir = 'Abrir WhatsApp';

  indice = 0;
  abertos = 0;
  readonly idsEnviados: number[] = [];
  cancelado = false;
  mostrarMensagem = false;

  constructor(
    private modalCtrl: ModalController,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.itens.length === 0) {
      void this.fechar();
    }
  }

  get atual(): CobrancaLoteItem | null {
    return this.itens[this.indice] ?? null;
  }

  get progresso(): string {
    return `${Math.min(this.indice + 1, this.itens.length)} / ${this.itens.length}`;
  }

  get concluido(): boolean {
    return this.indice >= this.itens.length;
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
    this.abertos++;
    this.idsEnviados.push(item.id);
    this.avancar();
  }

  pular(): void {
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
