import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CobrancaLoteFilaModalComponent } from '../../components/cobranca/cobranca-lote-fila-modal.component';
import {
  CobrancaLoteItem,
  ResultadoCobrancaLote,
  telefoneValidoParaWhatsApp,
} from '../../shared/utils/whatsapp';
import { notificar } from '../../shared/utils/toast-notifier';

export interface OpcoesCobrancaLoteFila {
  titulo?: string;
  rotuloAbrir?: string;
}

@Injectable({ providedIn: 'root' })
export class CobrancaLoteFilaService {
  constructor(private modalCtrl: ModalController) {}

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

    const modal = await this.modalCtrl.create({
      component: CobrancaLoteFilaModalComponent,
      componentProps: {
        itens: validos,
        ignorados,
        titulo: opcoes?.titulo ?? 'Envio em lote',
        rotuloAbrir: opcoes?.rotuloAbrir ?? 'Abrir WhatsApp',
      },
      cssClass: 'crm-modal crm-modal-cobranca-lote',
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
  }
}
