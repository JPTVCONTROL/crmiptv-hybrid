import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DispositivoService } from '../../core/services/dispositivo.service';
import { Dispositivo } from '../../core/models';
import { NovoDispositivoModalComponent } from '../../components/dispositivo/novo-dispositivo-modal/novo-dispositivo-modal.component';
import { rotuloDispositivo } from '../../shared/utils/dispositivos';

@Component({
  selector: 'app-dispositivos',
  templateUrl: './dispositivos.page.html',
})
export class DispositivosPage implements OnInit {
  dispositivos: Dispositivo[] = [];
  loading = true;
  error = '';

  constructor(
    private dispositivoService: DispositivoService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.dispositivoService.listar().subscribe({
      next: (data) => {
        this.dispositivos = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  async abrirModal(dispositivo?: Dispositivo): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoDispositivoModalComponent,
      componentProps: { dispositivo: dispositivo ?? null },
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
  }

  excluir(item: Dispositivo): void {
    const qtd = item._count?.clientes ?? 0;
    const avisoClientes =
      qtd > 0
        ? `\n\n${qtd} cliente(s) usam este dispositivo.`
        : '';

    if (!confirm(`Excluir o dispositivo "${rotuloDispositivo(item)}"?${avisoClientes}`)) return;

    this.dispositivoService.excluir(item.id).subscribe({
      next: () => this.carregar(),
      error: (err) => alert(err.message ?? 'Erro ao excluir dispositivo.'),
    });
  }

  rotulo = rotuloDispositivo;
}
