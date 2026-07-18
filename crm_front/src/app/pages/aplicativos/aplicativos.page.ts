import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { Aplicativo } from '../../core/models';
import { NovoAplicativoModalComponent } from '../../components/aplicativo/novo-aplicativo-modal/novo-aplicativo-modal.component';

@Component({
  selector: 'app-aplicativos',
  templateUrl: './aplicativos.page.html',
})
export class AplicativosPage implements OnInit {
  aplicativos: Aplicativo[] = [];
  loading = true;
  error = '';

  constructor(
    private aplicativoService: AplicativoService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.aplicativoService.listar().subscribe({
      next: (data) => {
        this.aplicativos = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  async novo(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoAplicativoModalComponent,
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
  }
}
