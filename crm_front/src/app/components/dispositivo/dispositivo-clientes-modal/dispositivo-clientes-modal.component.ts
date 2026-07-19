import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DispositivoService } from '../../../core/services/dispositivo.service';
import { ClienteDispositivoResumo, Dispositivo } from '../../../core/models';
import { rotuloDispositivo } from '../../../shared/utils/dispositivos';

@Component({
  selector: 'app-dispositivo-clientes-modal',
  templateUrl: './dispositivo-clientes-modal.component.html',
})
export class DispositivoClientesModalComponent implements OnInit {
  @Input() dispositivo!: Dispositivo;

  clientes: ClienteDispositivoResumo[] = [];
  loading = true;
  erro = '';

  constructor(
    private modalCtrl: ModalController,
    private dispositivoService: DispositivoService
  ) {}

  ngOnInit(): void {
    this.dispositivoService.listarClientes(this.dispositivo.id).subscribe({
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

  titulo(): string {
    return rotuloDispositivo(this.dispositivo);
  }

  fechar(): void {
    this.modalCtrl.dismiss();
  }

  rotuloMacs(macs: string[]): string {
    return macs.length ? macs.join(', ') : '—';
  }
}
