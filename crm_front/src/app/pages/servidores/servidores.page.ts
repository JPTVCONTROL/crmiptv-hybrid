import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { PainelCreditoService } from '../../core/services/painel-credito.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { PainelCredito } from '../../core/models';
import { formatarValor } from '../../shared/utils/formatters';
import { NovoServidorModalComponent } from '../../components/servidor/novo-servidor-modal/novo-servidor-modal.component';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_CATALOGO,
} from '../../shared/utils/page-sync.util';

@Component({
  selector: 'app-servidores',
  templateUrl: './servidores.page.html',
})
export class ServidoresPage implements OnInit, OnDestroy {
  servidores: PainelCredito[] = [];
  private readonly destroy$ = new Subject<void>();
  loading = true;
  error = '';
  busca = '';
  filtroAtivo: 'TODOS' | 'ATIVO' | 'INATIVO' = 'TODOS';

  constructor(
    private painelCreditoService: PainelCreditoService,
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

  get servidoresFiltrados(): PainelCredito[] {
    const termo = this.busca.toLowerCase().trim();
    return this.servidores.filter((servidor) => {
      const matchBusca =
        !termo ||
        servidor.nome.toLowerCase().includes(termo) ||
        servidor.codigo.toLowerCase().includes(termo);
      const ativo = servidor.ativo !== false;
      const matchAtivo =
        this.filtroAtivo === 'TODOS' ||
        (this.filtroAtivo === 'ATIVO' ? ativo : !ativo);
      return matchBusca && matchAtivo;
    });
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    this.painelCreditoService.listar().subscribe({
      next: (data) => {
        this.servidores = data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  async abrirModal(servidor?: PainelCredito): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoServidorModalComponent,
      componentProps: { servidor: servidor ?? null },
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.carregar(true);
    }
  }

  async excluir(servidor: PainelCredito): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      header: 'Excluir servidor',
      message: `Excluir o servidor "${servidor.nome}"?`,
      confirmText: 'Excluir',
    });
    if (!confirmado) {
      return;
    }

    this.painelCreditoService.excluir(servidor.id).subscribe({
      next: () => {
        void this.toast.success('Servidor excluído.');
        this.carregar(true);
      },
      error: (err) =>
        void this.toast.error(err.message ?? 'Erro ao excluir servidor.'),
    });
  }

  fmtValor = formatarValor;
}
