import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { ToastService } from '../../core/services/toast.service';
import { Aplicativo } from '../../core/models';
import { NovoAplicativoModalComponent } from '../../components/aplicativo/novo-aplicativo-modal/novo-aplicativo-modal.component';
import { AplicativoClientesModalComponent } from '../../components/aplicativo/aplicativo-clientes-modal/aplicativo-clientes-modal.component';

@Component({
  selector: 'app-aplicativos',
  templateUrl: './aplicativos.page.html',
})
export class AplicativosPage implements OnInit {
  aplicativos: Aplicativo[] = [];
  loading = true;
  error = '';
  logosQuebrados = new Set<number>();

  constructor(
    private aplicativoService: AplicativoService,
    private modalCtrl: ModalController,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.logosQuebrados = new Set();
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

  async abrirModal(aplicativo?: Aplicativo): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoAplicativoModalComponent,
      componentProps: { aplicativo: aplicativo ?? null },
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
  }

  async verClientes(app: Aplicativo, event?: Event): Promise<void> {
    event?.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: AplicativoClientesModalComponent,
      componentProps: { aplicativo: app },
      cssClass: 'crm-modal',
    });
    await modal.present();
  }

  excluir(app: Aplicativo): void {
    const qtd = app._count?.clientes ?? 0;
    const avisoClientes =
      qtd > 0
        ? `\n\n${qtd} cliente(s) usam este aplicativo. Eles ficarão sem aplicativo vinculado.`
        : '';

    if (!confirm(`Excluir o aplicativo "${app.nome}"?${avisoClientes}`)) return;

    this.aplicativoService.excluir(app.id).subscribe({
      next: () => this.carregar(),
      error: (err) => void this.toast.error(err.message ?? 'Erro ao excluir aplicativo.'),
    });
  }

  logoQuebrado(id: number): void {
    this.logosQuebrados.add(id);
    this.logosQuebrados = new Set(this.logosQuebrados);
  }

  mostrarLogo(app: Aplicativo): boolean {
    return !!app.logo?.trim() && !this.logosQuebrados.has(app.id);
  }
}
