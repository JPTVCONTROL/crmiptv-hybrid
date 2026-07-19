import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import {
  ConfirmOptions,
  registrarConfirmNotifier,
} from '../../shared/utils/confirm-notifier';

@Injectable({ providedIn: 'root' })
export class ConfirmacaoService {
  constructor(private alertCtrl: AlertController) {
    registrarConfirmNotifier((options) => this.confirmar(options));
  }

  confirmar(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      void this.montarAlerta(options, resolve);
    });
  }

  private async montarAlerta(
    options: ConfirmOptions,
    resolve: (value: boolean) => void
  ): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: options.header ?? 'Confirmar',
      message: options.message,
      cssClass: 'crm-alert',
      buttons: [
        {
          text: options.cancelText ?? 'Cancelar',
          role: 'cancel',
          handler: () => resolve(false),
        },
        {
          text: options.confirmText ?? 'Confirmar',
          handler: () => resolve(true),
        },
      ],
    });

    await alert.present();
  }
}
