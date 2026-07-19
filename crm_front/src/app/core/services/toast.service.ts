import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { registrarToastNotifier, ToastType } from '../../shared/utils/toast-notifier';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private toastCtrl: ToastController) {
    registrarToastNotifier((message, type) => {
      void this.show(message, type ?? 'info');
    });
  }

  success(message: string): Promise<void> {
    return this.show(message, 'success');
  }

  error(message: string): Promise<void> {
    return this.show(message, 'error');
  }

  warning(message: string): Promise<void> {
    return this.show(message, 'warning');
  }

  info(message: string): Promise<void> {
    return this.show(message, 'info');
  }

  private async show(message: string, type: ToastType): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3200,
      position: 'bottom',
      color: this.mapColor(type),
    });
    await toast.present();
  }

  private mapColor(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'primary';
    }
  }
}
