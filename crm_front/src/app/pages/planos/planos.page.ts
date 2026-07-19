import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PlanoService } from '../../core/services/plano.service';
import { Plano } from '../../core/models';
import { PlanoClientesModalComponent } from '../../components/plano/plano-clientes-modal/plano-clientes-modal.component';
import { NovoPlanoModalComponent } from '../../components/plano/novo-plano-modal/novo-plano-modal.component';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { formatarValor } from '../../shared/utils/formatters';
import { agruparPlanos, GrupoPlanos, ordenarPlanos, rotuloValidadePlano } from '../../shared/utils/planos';

@Component({
  selector: 'app-planos',
  templateUrl: './planos.page.html',
})
export class PlanosPage implements OnInit {
  planos: Plano[] = [];
  gruposPlanos: GrupoPlanos[] = [];
  loading = true;
  error = '';
  busca = '';
  filtroAtivo: 'TODOS' | 'ATIVO' | 'INATIVO' = 'TODOS';

  constructor(
    private planoService: PlanoService,
    private modalCtrl: ModalController,
    private toast: ToastService,
    private confirmacao: ConfirmacaoService
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar();
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

  carregar(): void {
    this.loading = true;
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

  fmtValor = formatarValor;
  rotuloValidade = rotuloValidadePlano;
}
