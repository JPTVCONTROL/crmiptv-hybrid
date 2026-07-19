import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class PagamentoUiService {
  constructor(private alertCtrl: AlertController) {}

  async solicitarDataPagamento(): Promise<string | null> {
    return new Promise((resolve) => {
      void this.montarAlertaInicial(resolve);
    });
  }

  private async montarAlertaInicial(
    resolve: (value: string | null) => void
  ): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Data do pagamento',
      message: 'Quando o pagamento foi realizado?',
      cssClass: 'crm-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => resolve(null),
        },
        {
          text: 'Pago hoje',
          handler: () => {
            resolve(this.formatarDataIso(new Date()));
            return true;
          },
        },
        {
          text: 'Outra data',
          handler: () => {
            void this.montarAlertaOutraData(resolve);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private async montarAlertaOutraData(
    resolve: (value: string | null) => void
  ): Promise<void> {
    const hoje = this.formatarDataIso(new Date());
    const alert = await this.alertCtrl.create({
      header: 'Informe a data',
      message: 'Selecione o dia em que o pagamento foi realizado.',
      cssClass: 'crm-alert',
      inputs: [
        {
          name: 'data',
          type: 'date',
          value: hoje,
          max: hoje,
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => resolve(null),
        },
        {
          text: 'Confirmar',
          handler: (values) => {
            const data = values?.['data'] as string | undefined;
            if (!data?.trim()) {
              return false;
            }
            resolve(data);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private formatarDataIso(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
