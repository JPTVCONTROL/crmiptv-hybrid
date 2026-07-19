import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { DispositivoService } from '../../../core/services/dispositivo.service';
import { DadosSyncService } from '../../../core/services/dados-sync.service';
import { ClienteDispositivoResumo, Dispositivo } from '../../../core/models';
import { rotuloDispositivo } from '../../../shared/utils/dispositivos';
import { vincularSyncModal } from '../../../shared/utils/modal-sync.util';

@Component({
  selector: 'app-dispositivo-clientes-modal',
  templateUrl: './dispositivo-clientes-modal.component.html',
})
export class DispositivoClientesModalComponent implements OnInit, OnDestroy {
  @Input() dispositivo!: Dispositivo;

  clientes: ClienteDispositivoResumo[] = [];
  loading = true;
  erro = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private modalCtrl: ModalController,
    private dispositivoService: DispositivoService,
    private sync: DadosSyncService
  ) {}

  ngOnInit(): void {
    this.carregarClientes();
    vincularSyncModal(this.sync, this.destroy$, ['clientes'], () =>
      this.carregarClientes(true)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarClientes(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    this.erro = '';
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
