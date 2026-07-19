import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { ToastService } from '../../core/services/toast.service';
import { Configuracao } from '../../core/models';
import {
  criarMapaTelefones,
  formatarData,
  formatarValor,
} from '../../shared/utils/formatters';
import {
  resolverDiasAntecedencia,
  ItemCobrancaDiaria,
  montarItensCobrancaDiaria,
  rotuloDiasCobrancaDiaria,
  rotuloTipoCobrancaDiaria,
  TipoCobrancaDiaria,
  trackByItemCobrancaDiaria,
} from '../../shared/utils/cobranca-diaria';
import { executarCobrancaEmLote } from '../../shared/utils/whatsapp';

export type FiltroGrupoCobranca = 'TODOS' | TipoCobrancaDiaria;

@Component({
  selector: 'app-cobranca-diaria',
  templateUrl: './cobranca-diaria.page.html',
})
export class CobrancaDiariaPage implements OnInit {
  loading = true;
  itens: ItemCobrancaDiaria[] = [];
  selecionados = new Set<number>();
  enviando = false;
  filtroGrupo: FiltroGrupoCobranca = 'TODOS';

  constructor(
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private toast: ToastService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  get diasAntecedencia(): number {
    return resolverDiasAntecedencia(this.configuracao);
  }

  get subtitulo(): string {
    const hoje = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return `Rotina de ${hoje} · atrasados e vencimentos em até ${this.diasAntecedencia} dias`;
  }

  get rotinaFeitaHoje(): boolean {
    return localStorage.getItem('crm-rotina-diaria-data') === new Date().toISOString().slice(0, 10);
  }

  get resumoEnvio(): string {
    const selecionados = this.itens.filter((item) => this.selecionados.has(item.mensalidadeId));
    const cobrancas = selecionados.filter((item) => item.tipo === 'ATRASADO').length;
    const lembretes = selecionados.filter((item) => item.tipo === 'A_VENCER').length;
    return `${cobrancas} cobrança(s) · ${lembretes} lembrete(s)`;
  }

  ngOnInit(): void {
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }
    this.carregar();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar(true);
    }
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    forkJoin([
      this.mensalidadeService.listar(),
      this.clienteService.listar(),
    ]).subscribe({
      next: ([mensalidades, clientes]) => {
        const telefones = criarMapaTelefones(clientes);
        const nomes = new Map(clientes.map((c) => [c.id, c.nome]));

        this.itens = montarItensCobrancaDiaria(
          mensalidades,
          telefones,
          this.configuracao,
          nomes
        );

        this.selecionarElegiveis();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  itensVisiveisPorTipo(tipo: TipoCobrancaDiaria): ItemCobrancaDiaria[] {
    if (this.filtroGrupo !== 'TODOS' && this.filtroGrupo !== tipo) {
      return [];
    }
    return this.itensPorTipo(tipo);
  }

  definirFiltroGrupo(filtro: FiltroGrupoCobranca): void {
    this.filtroGrupo = filtro;
  }

  selecionarSomente(tipo: TipoCobrancaDiaria): void {
    this.selecionados = new Set(
      this.itensPorTipo(tipo)
        .filter((item) => item.telefoneValido)
        .map((item) => item.mensalidadeId)
    );
  }

  itensPorTipo(tipo: TipoCobrancaDiaria): ItemCobrancaDiaria[] {
    return this.itens.filter((item) => item.tipo === tipo);
  }

  get qtdAtrasados(): number {
    return this.itensPorTipo('ATRASADO').length;
  }

  get qtdAVencer(): number {
    return this.itensPorTipo('A_VENCER').length;
  }

  get valorTotal(): string {
    const total = this.itens.reduce((acc, item) => acc + item.valor, 0);
    return formatarValor(total);
  }

  get qtdSemTelefone(): number {
    return this.itens.filter((item) => !item.telefoneValido).length;
  }

  get qtdSelecionados(): number {
    return this.selecionados.size;
  }

  get qtdSelecionadosValidos(): number {
    return this.itens.filter(
      (item) => this.selecionados.has(item.mensalidadeId) && item.telefoneValido
    ).length;
  }

  estaSelecionado(item: ItemCobrancaDiaria): boolean {
    return this.selecionados.has(item.mensalidadeId);
  }

  alternarSelecao(item: ItemCobrancaDiaria): void {
    if (this.selecionados.has(item.mensalidadeId)) {
      this.selecionados.delete(item.mensalidadeId);
    } else {
      this.selecionados.add(item.mensalidadeId);
    }
    this.selecionados = new Set(this.selecionados);
  }

  selecionarElegiveis(): void {
    this.selecionados = new Set(
      this.itens
        .filter((item) => item.telefoneValido)
        .map((item) => item.mensalidadeId)
    );
  }

  limparSelecao(): void {
    this.selecionados = new Set();
  }

  todosTipoSelecionados(tipo: TipoCobrancaDiaria): boolean {
    const lista = this.itensPorTipo(tipo);
    return (
      lista.length > 0 &&
      lista.every((item) => this.selecionados.has(item.mensalidadeId))
    );
  }

  alternarTipo(tipo: TipoCobrancaDiaria): void {
    const lista = this.itensPorTipo(tipo);
    if (this.todosTipoSelecionados(tipo)) {
      for (const item of lista) {
        this.selecionados.delete(item.mensalidadeId);
      }
    } else {
      for (const item of lista) {
        this.selecionados.add(item.mensalidadeId);
      }
    }
    this.selecionados = new Set(this.selecionados);
  }

  async enviarSelecionados(): Promise<void> {
    const selecionados = this.itens.filter(
      (item) =>
        this.selecionados.has(item.mensalidadeId) && item.telefoneValido
    );

    if (selecionados.length === 0) {
      void this.toast.warning(
        'Selecione ao menos um cliente com telefone válido para WhatsApp.'
      );
      return;
    }

    this.enviando = true;

    await executarCobrancaEmLote(
      selecionados.map((item) => ({
        id: item.mensalidadeId,
        nome: item.nome,
        telefone: item.telefone,
        mensagem: item.mensagem,
      }))
    );

    localStorage.setItem('crm-rotina-diaria-data', new Date().toISOString().slice(0, 10));
    this.enviando = false;
  }

  rotuloDias = rotuloDiasCobrancaDiaria;
  rotuloTipo = rotuloTipoCobrancaDiaria;
  fmtData = formatarData;
  fmtValor = formatarValor;
  trackByItem = trackByItemCobrancaDiaria;
}
