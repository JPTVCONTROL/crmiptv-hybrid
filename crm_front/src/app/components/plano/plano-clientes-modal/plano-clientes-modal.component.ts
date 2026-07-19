import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PlanoService } from '../../../core/services/plano.service';
import { ClienteService } from '../../../core/services/cliente.service';
import { ToastService } from '../../../core/services/toast.service';
import { Cliente, ClienteAplicativoResumo, Plano } from '../../../core/models';
import { NovoClienteModalComponent } from '../../cliente/novo-cliente-modal/novo-cliente-modal.component';

@Component({
  selector: 'app-plano-clientes-modal',
  templateUrl: './plano-clientes-modal.component.html',
})
export class PlanoClientesModalComponent implements OnInit {
  @Input() plano!: Plano;

  clientes: ClienteAplicativoResumo[] = [];
  loading = true;
  erro = '';

  constructor(
    private modalCtrl: ModalController,
    private planoService: PlanoService,
    private clienteService: ClienteService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.carregarClientes();
  }

  carregarClientes(): void {
    this.loading = true;
    this.erro = '';
    this.planoService.listarClientes(this.plano.id).subscribe({
      next: (data) => {
        this.clientes = data;
        this.loading = false;
      },
      error: (err: Error) => {
        this.erro = err.message ?? 'Erro ao carregar clientes.';
        this.loading = false;
      },
    });
  }

  async editar(clienteResumo: ClienteAplicativoResumo): Promise<void> {
    this.clienteService.buscarPorId(clienteResumo.id).subscribe({
      next: async (cliente: Cliente) => {
        const modal = await this.modalCtrl.create({
          component: NovoClienteModalComponent,
          componentProps: { cliente },
          cssClass: 'crm-modal crm-modal-cliente',
        });
        await modal.present();
        const { data } = await modal.onDidDismiss();
        if (data) this.carregarClientes();
      },
      error: (err: Error) =>
        void this.toast.error(err.message ?? 'Erro ao carregar cliente.'),
    });
  }

  fechar(): void {
    this.modalCtrl.dismiss();
  }
}
