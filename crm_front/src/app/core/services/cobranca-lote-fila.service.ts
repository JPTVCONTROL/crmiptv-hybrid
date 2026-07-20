import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CobrancaLoteFilaModalComponent } from '../../components/cobranca/cobranca-lote-fila-modal.component';
import {
  CobrancaLoteItem,
  ResultadoCobrancaLote,
  telefoneValidoParaWhatsApp,
} from '../../shared/utils/whatsapp';
import { notificar } from '../../shared/utils/toast-notifier';

export type MarcadorEnvioCampanhaFn = (clienteId: number) => Promise<void>;

export interface OpcoesCobrancaLoteFila {
  titulo?: string;
  rotuloAbrir?: string;
  modoManual?: boolean;
  rotuloMarcar?: string;
  onMarcarEnviado?: MarcadorEnvioCampanhaFn;
}

@Injectable({ providedIn: 'root' })
export class CobrancaLoteFilaService {
  private marcadorEnvioAtual: MarcadorEnvioCampanhaFn | null = null;

  constructor(private modalCtrl: ModalController) {}

  obterMarcadorEnvioAtual(): MarcadorEnvioCampanhaFn | null {
    return this.marcadorEnvioAtual;
  }

  async executar(
    itens: CobrancaLoteItem[],
    opcoes?: OpcoesCobrancaLoteFila
  ): Promise<ResultadoCobrancaLote> {
    const validos = itens.filter((item) =>
      telefoneValidoParaWhatsApp(item.telefone)
    );
    const ignorados = itens.length - validos.length;

    if (validos.length === 0) {
      notificar(
        ignorados > 0
          ? 'Nenhum cliente selecionado possui telefone válido cadastrado.'
          : 'Selecione ao menos um cliente para enviar.',
        'warning'
      );
      return { abertos: 0, ignorados, cancelado: true, idsEnviados: [] };
    }

    this.marcadorEnvioAtual = opcoes?.onMarcarEnviado ?? null;

    try {
      const modal = await this.modalCtrl.create({
        component: CobrancaLoteFilaModalComponent,
        componentProps: {
          itens: validos,
          ignorados,
          titulo: opcoes?.titulo ?? 'Envio em lote',
          rotuloAbrir: opcoes?.rotuloAbrir ?? 'Abrir WhatsApp',
          modoManual: opcoes?.modoManual ?? false,
          rotuloMarcar: opcoes?.rotuloMarcar ?? 'Marcar enviado e próximo',
        },
        cssClass: 'crm-modal crm-modal-cobranca-lote',
        backdropDismiss: false,
      });

      await modal.present();
      const { data } = await modal.onDidDismiss<ResultadoCobrancaLote>();

      if (data) {
        if (!data.cancelado && data.abertos > 0) {
          notificar(
            `Envio em lote concluído: ${data.abertos} WhatsApp(s) aberto(s).`,
            'success'
          );
        } else if (data.cancelado && data.abertos > 0) {
          notificar(
            `Fila interrompida. ${data.abertos} WhatsApp(s) aberto(s).`,
            'info'
          );
        }
        return data;
      }

      return { abertos: 0, ignorados, cancelado: true, idsEnviados: [] };
    } finally {
      this.marcadorEnvioAtual = null;
    }
  }
}
