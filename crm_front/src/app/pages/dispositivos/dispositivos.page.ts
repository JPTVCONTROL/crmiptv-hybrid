import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { DispositivoService } from '../../core/services/dispositivo.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { Dispositivo } from '../../core/models';
import { NovoDispositivoModalComponent } from '../../components/dispositivo/novo-dispositivo-modal/novo-dispositivo-modal.component';
import { DispositivoClientesModalComponent } from '../../components/dispositivo/dispositivo-clientes-modal/dispositivo-clientes-modal.component';
import { rotuloDispositivo } from '../../shared/utils/dispositivos';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_CATALOGO,
} from '../../shared/utils/page-sync.util';

@Component({
  selector: 'app-dispositivos',
  templateUrl: './dispositivos.page.html',
})
export class DispositivosPage implements OnInit, OnDestroy {
  dispositivos: Dispositivo[] = [];
  private readonly destroy$ = new Subject<void>();
  loading = true;
  error = '';
  busca = '';
  filtroAtivo: 'TODOS' | 'ATIVO' | 'INATIVO' = 'TODOS';

  constructor(
    private dispositivoService: DispositivoService,
    private modalCtrl: ModalController,
    private toast: ToastService,
    private confirmacao: ConfirmacaoService,
    private sync: DadosSyncService
  ) {}

  ngOnInit(): void {
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_CATALOGO,
      () => this.carregar(true)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar(true);
    }
  }

  get dispositivosFiltrados(): Dispositivo[] {
    const termo = this.busca.toLowerCase().trim();
    return this.dispositivos.filter((item) => {
      const rotulo = rotuloDispositivo(item).toLowerCase();
      const matchBusca =
        !termo ||
        rotulo.includes(termo) ||
        (item.descricao?.toLowerCase().includes(termo) ?? false);
      const matchAtivo =
        this.filtroAtivo === 'TODOS' ||
        (this.filtroAtivo === 'ATIVO' ? item.ativo : !item.ativo);
      return matchBusca && matchAtivo;
    });
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

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

  async verClientes(item: Dispositivo, event?: Event): Promise<void> {
    event?.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: DispositivoClientesModalComponent,
      componentProps: { dispositivo: item },
      cssClass: 'crm-modal',
    });
    await modal.present();
  }

  async excluir(item: Dispositivo): Promise<void> {
    const qtd = item._count?.clientes ?? 0;
    const avisoClientes =
      qtd > 0
        ? `\n\n${qtd} cliente(s) usam este dispositivo.`
        : '';

    const confirmado = await this.confirmacao.confirmar({
      header: 'Excluir dispositivo',
      message: `Excluir o dispositivo "${rotuloDispositivo(item)}"?${avisoClientes}`,
      confirmText: 'Excluir',
    });
    if (!confirmado) return;

    this.dispositivoService.excluir(item.id).subscribe({
      next: () => this.carregar(),
      error: (err) => void this.toast.error(err.message ?? 'Erro ao excluir dispositivo.'),
    });
  }

  rotulo = rotuloDispositivo;
}
