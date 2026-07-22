import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject, forkJoin } from 'rxjs';
import { DespesaService } from '../../core/services/despesa.service';
import { PainelCreditoService } from '../../core/services/painel-credito.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ConsumoCreditoPainel,
  DespesaMensal,
  PainelCredito,
  ResumoCustos,
} from '../../core/models';
import { NovaDespesaModalComponent } from '../../components/despesa/nova-despesa-modal/nova-despesa-modal.component';
import { formatarData, formatarValor } from '../../shared/utils/formatters';
import { rotuloCategoriaDespesa } from '../../shared/utils/despesa.util';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_CUSTOS,
} from '../../shared/utils/page-sync.util';

@Component({
  selector: 'app-custos',
  templateUrl: './custos.page.html',
})
export class CustosPage implements OnInit, OnDestroy {
  loading = true;
  error = '';
  resumo: ResumoCustos | null = null;
  despesas: DespesaMensal[] = [];
  paineis: PainelCredito[] = [];
  consumos: ConsumoCreditoPainel[] = [];
  periodo = this.periodoAtual();

  custosFixos = '';
  custosVariaveis = '';
  totalMes = '';
  margemEstimada = '';
  margemPercentual = '';
  mrr = '';
  qtdCreditosConsumidos = 0;
  margemValor = 0;

  readonly fmtValor = formatarValor;
  readonly fmtData = formatarData;
  readonly rotuloCategoria = rotuloCategoriaDespesa;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private despesaService: DespesaService,
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
      DOMINIOS_SYNC_CUSTOS,
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

  get despesasAtivas(): DespesaMensal[] {
    return this.despesas.filter((item) => item.ativo);
  }

  get rotuloPeriodo(): string {
    const [ano, mes] = this.periodo.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    forkJoin([
      this.despesaService.obterResumo(),
      this.painelCreditoService.listar(),
      this.painelCreditoService.listarConsumos(this.periodo),
    ]).subscribe({
      next: ([data, paineis, consumosData]) => {
        this.resumo = data;
        this.despesas = data.despesas ?? [];
        this.paineis = paineis;
        this.consumos = consumosData.itens;
        this.qtdCreditosConsumidos = consumosData.resumo.quantidade;

        const fixos = data.despesasFixas;
        const variaveis = consumosData.resumo.total;
        const total = Math.round((fixos + variaveis) * 100) / 100;

        this.custosFixos = formatarValor(fixos);
        this.custosVariaveis = formatarValor(variaveis);
        this.totalMes = formatarValor(total);
        this.margemValor = Math.round((data.mrr - total) * 100) / 100;
        this.margemEstimada = formatarValor(this.margemValor);
        this.margemPercentual =
          data.mrr > 0
            ? `${Math.round((this.margemValor / data.mrr) * 1000) / 10}%`
            : '0%';
        this.mrr = formatarValor(data.mrr);

        this.loading = false;
        this.error = '';
      },
      error: (err) => {
        const mensagem = err.message ?? 'Erro ao carregar custos.';
        this.error =
          mensagem === 'Rota não encontrada.'
            ? 'API desatualizada ou offline. No crm_back execute: npm run api:restart'
            : mensagem;
        this.loading = false;
      },
    });
  }

  recalcularPeriodo(): void {
    this.carregar(true);
  }

  async abrirModalDespesa(despesa?: DespesaMensal): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovaDespesaModalComponent,
      componentProps: { despesa: despesa ?? null },
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.carregar(true);
    }
  }

  async excluirDespesa(despesa: DespesaMensal, event?: Event): Promise<void> {
    event?.stopPropagation();

    const confirmado = await this.confirmacao.confirmar({
      header: 'Excluir despesa',
      message: `Excluir "${despesa.nome}"?`,
      confirmText: 'Excluir',
    });

    if (!confirmado) {
      return;
    }

    this.despesaService.excluir(despesa.id).subscribe({
      next: () => this.carregar(true),
      error: (err) =>
        void this.toast.error(err.message ?? 'Erro ao excluir despesa.'),
    });
  }

  margemPositiva(valor: number): boolean {
    return valor >= 0;
  }

  private periodoAtual(): string {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }
}
