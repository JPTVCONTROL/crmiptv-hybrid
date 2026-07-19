import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PlanoService } from '../../core/services/plano.service';
import { Plano } from '../../core/models';
import { PlanoClientesModalComponent } from '../../components/plano/plano-clientes-modal/plano-clientes-modal.component';
import { NovoPlanoModalComponent } from '../../components/plano/novo-plano-modal/novo-plano-modal.component';
import { ToastService } from '../../core/services/toast.service';
import { formatarValor } from '../../shared/utils/formatters';
import { agruparPlanos, GrupoPlanos, ordenarPlanos, rotuloValidadePlano } from '../../shared/utils/planos';

@Component({
  selector: 'app-planos',
  templateUrl: './planos.page.html',
})
export class PlanosPage implements OnInit {
  planos: Plano[] = [];
  gruposPlanos: GrupoPlanos[] = [];
  loading = true;
  error = '';

  constructor(
    private planoService: PlanoService,
    private modalCtrl: ModalController,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.planoService.listar().subscribe({
      next: (data) => {
        this.planos = ordenarPlanos(data);
        this.gruposPlanos = agruparPlanos(this.planos);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  async verClientes(plano: Plano): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PlanoClientesModalComponent,
      componentProps: { plano },
      cssClass: 'crm-modal',
    });
    await modal.present();
  }

  async abrirModal(plano?: Plano): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoPlanoModalComponent,
      componentProps: { plano: plano ?? null },
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
  }

  excluir(plano: Plano): void {
    if (!confirm(`Excluir o plano "${plano.nome}"?`)) return;

    this.planoService.excluir(plano.id).subscribe({
      next: () => this.carregar(),
      error: (err) => void this.toast.error(err.message ?? 'Erro ao excluir plano.'),
    });
  }

  fmtValor = formatarValor;
  rotuloValidade = rotuloValidadePlano;
}
