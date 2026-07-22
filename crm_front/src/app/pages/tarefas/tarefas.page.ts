import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { TarefaService } from '../../core/services/tarefa.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { FiltroListaTarefa, Tarefa } from '../../core/models';
import { NovaTarefaModalComponent } from '../../components/tarefa/nova-tarefa-modal/nova-tarefa-modal.component';
import {
  OPCOES_FILTRO_TAREFA,
  classePrazoTarefa,
  contagemFiltroTarefa,
  filtrarTarefas,
  formatarDataTarefa,
  queryParamParaFiltroTarefa,
  rotuloPrazoTarefa,
} from '../../shared/utils/tarefa.util';
import {
  classesFilterChip,
  classesFilterChipContagem,
} from '../../shared/utils/filter-chip.util';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_TAREFAS,
} from '../../shared/utils/page-sync.util';

@Component({
  selector: 'app-tarefas',
  templateUrl: './tarefas.page.html',
})
export class TarefasPage implements OnInit, OnDestroy {
  tarefas: Tarefa[] = [];
  loading = true;
  error = '';
  busca = '';
  filtro: FiltroListaTarefa = 'PENDENTES';
  alternandoId: number | null = null;

  readonly opcoesFiltro = OPCOES_FILTRO_TAREFA;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private tarefaService: TarefaService,
    private modalCtrl: ModalController,
    private toast: ToastService,
    private confirmacao: ConfirmacaoService,
    private sync: DadosSyncService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.filtro = queryParamParaFiltroTarefa(params.get('filtro'));
      if (!this.loading) {
        this.carregar(true);
      }
    });

    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_TAREFAS,
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

  get tarefasFiltradas(): Tarefa[] {
    const termo = this.busca.toLowerCase().trim();
    return filtrarTarefas(this.tarefas, this.filtro).filter((item) => {
      if (!termo) return true;

      const cliente = item.cliente?.nome?.toLowerCase() ?? '';
      return (
        item.titulo.toLowerCase().includes(termo) ||
        (item.descricao?.toLowerCase().includes(termo) ?? false) ||
        cliente.includes(termo)
      );
    });
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    this.tarefaService.listar().subscribe({
      next: (data) => {
        this.tarefas = data;
        this.loading = false;
        this.error = '';
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  definirFiltro(filtro: FiltroListaTarefa): void {
    this.filtro = filtro;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtro === 'PENDENTES' ? {} : { filtro },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  classesChip(filtro: FiltroListaTarefa): string {
    return classesFilterChip(this.filtro === filtro, 'sky');
  }

  classesChipContagem(filtro: FiltroListaTarefa): string {
    return classesFilterChipContagem(this.filtro === filtro, 'sky');
  }

  contagem(filtro: FiltroListaTarefa): number {
    return contagemFiltroTarefa(this.tarefas, filtro);
  }

  rotuloPrazo = rotuloPrazoTarefa;
  classePrazo = classePrazoTarefa;
  formatarData = formatarDataTarefa;

  async abrirModal(tarefa?: Tarefa): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovaTarefaModalComponent,
      componentProps: { tarefa: tarefa ?? null },
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.carregar(true);
    }
  }

  alternarConclusao(tarefa: Tarefa, event?: Event): void {
    event?.stopPropagation();

    if (this.alternandoId !== null) {
      return;
    }

    this.alternandoId = tarefa.id;
    const req = tarefa.concluida
      ? this.tarefaService.reabrir(tarefa.id)
      : this.tarefaService.concluir(tarefa.id);

    req.subscribe({
      next: () => {
        this.alternandoId = null;
        this.carregar(true);
      },
      error: (err) => {
        this.alternandoId = null;
        void this.toast.error(err.message ?? 'Erro ao atualizar tarefa.');
      },
    });
  }

  async excluir(tarefa: Tarefa, event?: Event): Promise<void> {
    event?.stopPropagation();

    const confirmado = await this.confirmacao.confirmar({
      header: 'Excluir tarefa',
      message: `Excluir "${tarefa.titulo}"?`,
      confirmText: 'Excluir',
    });

    if (!confirmado) {
      return;
    }

    this.tarefaService.excluir(tarefa.id).subscribe({
      next: () => this.carregar(true),
      error: (err) => void this.toast.error(err.message ?? 'Erro ao excluir tarefa.'),
    });
  }
}
