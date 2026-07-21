import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { PlanoService } from '../../core/services/plano.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { Plano } from '../../core/models';
import { PlanoClientesModalComponent } from '../../components/plano/plano-clientes-modal/plano-clientes-modal.component';
import { NovoPlanoModalComponent } from '../../components/plano/novo-plano-modal/novo-plano-modal.component';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { formatarValor } from '../../shared/utils/formatters';
import { agruparPlanos, GrupoPlanos, ordenarPlanos, rotuloValidadePlano } from '../../shared/utils/planos';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_CATALOGO,
} from '../../shared/utils/page-sync.util';

@Component({
  selector: 'app-planos',
  templateUrl: './planos.page.html',
})
export class PlanosPage implements OnInit, OnDestroy {
  planos: Plano[] = [];
  private readonly destroy$ = new Subject<void>();
  gruposPlanos: GrupoPlanos[] = [];
  loading = true;
  error = '';
  busca = '';
  filtroAtivo: 'TODOS' | 'ATIVO' | 'INATIVO' = 'TODOS';

  constructor(
    private planoService: PlanoService,
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

  get planosFiltrados(): Plano[] {
    const termo = this.busca.toLowerCase().trim();
    return this.planos.filter((plano) => {
      const matchBusca =
        !termo || plano.nome.toLowerCase().includes(termo);
      const matchAtivo =
        this.filtroAtivo === 'TODOS' ||
        (this.filtroAtivo === 'ATIVO' ? plano.ativo : !plano.ativo);
      return matchBusca && matchAtivo;
    });
  }

  get gruposVisiveis(): GrupoPlanos[] {
    return agruparPlanos(this.planosFiltrados);
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

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

  async excluir(plano: Plano): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      header: 'Excluir plano',
      message: `Excluir o plano "${plano.nome}"?`,
      confirmText: 'Excluir',
    });
    if (!confirmado) return;

    this.planoService.excluir(plano.id).subscribe({
      next: () => this.carregar(),
      error: (err) => void this.toast.error(err.message ?? 'Erro ao excluir plano.'),
    });
  }

  async reajustarClientes(plano: Plano): Promise<void> {
    const qtd = plano._count?.clientes ?? 0;
    if (qtd === 0) {
      void this.toast.warning('Nenhum cliente vinculado a este plano.');
      return;
    }

    const confirmado = await this.confirmacao.confirmar({
      header: 'Reajustar clientes',
      message: `Atualizar o valor mensal de ${qtd} cliente(s) para ${this.fmtValor(plano.valor)}? Cobranças pendentes também serão atualizadas.`,
      confirmText: 'Reajustar',
    });
    if (!confirmado) return;

    this.planoService.reajustarClientes(plano.id).subscribe({
      next: (resultado) => {
        void this.toast.success(
          `${resultado.clientes} cliente(s) e ${resultado.mensalidades} cobrança(s) pendente(s) atualizados.`
        );
      },
      error: (err) =>
        void this.toast.error(err.message ?? 'Erro ao reajustar clientes.'),
    });
  }

  fmtValor = formatarValor;
  rotuloValidade = rotuloValidadePlano;
}
