import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PlanoService } from '../../../core/services/plano.service';
import { ClienteAplicativoResumo, Plano } from '../../../core/models';

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
    private planoService: PlanoService
  ) {}

  ngOnInit(): void {
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

  fechar(): void {
    this.modalCtrl.dismiss();
  }
}
