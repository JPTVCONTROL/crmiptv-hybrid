import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { AplicativoService } from '../../../core/services/aplicativo.service';
import { DadosSyncService } from '../../../core/services/dados-sync.service';
import { Aplicativo, ClienteAplicativoResumo } from '../../../core/models';
import { vincularSyncModal } from '../../../shared/utils/modal-sync.util';

@Component({
  selector: 'app-aplicativo-clientes-modal',
  templateUrl: './aplicativo-clientes-modal.component.html',
})
export class AplicativoClientesModalComponent implements OnInit, OnDestroy {
  @Input() aplicativo!: Aplicativo;

  clientes: ClienteAplicativoResumo[] = [];
  loading = true;
  erro = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private modalCtrl: ModalController,
    private aplicativoService: AplicativoService,
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
