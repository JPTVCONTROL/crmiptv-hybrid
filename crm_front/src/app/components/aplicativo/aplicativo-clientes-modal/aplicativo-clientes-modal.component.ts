import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AplicativoService } from '../../../core/services/aplicativo.service';
import { Aplicativo, ClienteAplicativoResumo } from '../../../core/models';

@Component({
  selector: 'app-aplicativo-clientes-modal',
  templateUrl: './aplicativo-clientes-modal.component.html',
})
export class AplicativoClientesModalComponent implements OnInit {
  @Input() aplicativo!: Aplicativo;

  clientes: ClienteAplicativoResumo[] = [];
  loading = true;
  erro = '';

  constructor(
    private modalCtrl: ModalController,
    private aplicativoService: AplicativoService
  ) {}

  ngOnInit(): void {
    this.aplicativoService.listarClientes(this.aplicativo.id).subscribe({
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
