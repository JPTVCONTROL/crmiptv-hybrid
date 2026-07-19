import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { Aplicativo } from '../../core/models';
import { NovoAplicativoModalComponent } from '../../components/aplicativo/novo-aplicativo-modal/novo-aplicativo-modal.component';
import { AplicativoClientesModalComponent } from '../../components/aplicativo/aplicativo-clientes-modal/aplicativo-clientes-modal.component';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';

@Component({
  selector: 'app-aplicativos',
  templateUrl: './aplicativos.page.html',
})
export class AplicativosPage implements OnInit, OnDestroy {
  aplicativos: Aplicativo[] = [];
  private readonly destroy$ = new Subject<void>();
  loading = true;
  error = '';
  logosQuebrados = new Set<number>();
  busca = '';
  filtroAtivo: 'TODOS' | 'ATIVO' | 'INATIVO' = 'TODOS';

  constructor(
    private aplicativoService: AplicativoService,
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
      ['catalogos'],
      () => this.carregar()
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar();
    }
  }

  get aplicativosFiltrados(): Aplicativo[] {
    const termo = this.busca.toLowerCase().trim();
    return this.aplicativos.filter((app) => {
      const matchBusca =
        !termo ||
        app.nome.toLowerCase().includes(termo) ||
        (app.descricao?.toLowerCase().includes(termo) ?? false);
      const matchAtivo =
        this.filtroAtivo === 'TODOS' ||
        (this.filtroAtivo === 'ATIVO' ? app.ativo : !app.ativo);
      return matchBusca && matchAtivo;
    });
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

  async excluir(app: Aplicativo): Promise<void> {
    const qtd = app._count?.clientes ?? 0;
    const avisoClientes =
      qtd > 0
        ? `\n\n${qtd} cliente(s) usam este aplicativo. Eles ficarão sem aplicativo vinculado.`
        : '';

    const confirmado = await this.confirmacao.confirmar({
      header: 'Excluir aplicativo',
      message: `Excluir o aplicativo "${app.nome}"?${avisoClientes}`,
      confirmText: 'Excluir',
    });
    if (!confirmado) return;

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
