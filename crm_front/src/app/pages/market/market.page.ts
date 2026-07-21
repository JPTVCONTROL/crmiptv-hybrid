import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CampanhaService } from '../../core/services/campanha.service';
import { ClienteService } from '../../core/services/cliente.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PlanoService } from '../../core/services/plano.service';
import { CobrancaLoteFilaService } from '../../core/services/cobranca-lote-fila.service';
import { ToastService } from '../../core/services/toast.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { PullRefreshService } from '../../core/services/pull-refresh.service';
import { Campanha, Cliente, Plano, TipoCampanha } from '../../core/models';
import { formatarData, resolverStatusCliente, StatusCliente } from '../../shared/utils/formatters';
import {
  FiltroPublicoCampanha,
  SegmentoPublicoCampanha,
  clientePassouFiltroPublico,
  contarClientesPublico,
  rotuloSegmentoPublico,
  rotuloStatusPublico,
} from '../../shared/utils/campanha-publico';
import { resolverDiasAntecedencia } from '../../shared/utils/cobranca-diaria';
import {
  FiltroEnvioCampanha,
  MENSAGEM_CAMPANHA_PADRAO,
  montarMensagemCampanha,
  rotuloTipoCampanha,
} from '../../shared/utils/campanha';
import {
  CobrancaLoteItem,
  telefoneValidoParaWhatsApp,
} from '../../shared/utils/whatsapp';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';
import { confirmarUsuario } from '../../shared/utils/confirm-notifier';
import { CampanhaFormModalComponent } from '../../components/campanha/campanha-form-modal.component';
import { exportarCampanhaCsv } from '../../shared/utils/campanha-export';
import {
  classesFilterChip,
  classesFilterChipContagem,
  VarianteFilterChip,
} from '../../shared/utils/filter-chip.util';
import { lerSessionJson, salvarSessionJson } from '../../shared/utils/session-persist.util';
import {
  FiltroStatusListaCampanha,
  FiltroTipoListaCampanha,
  persistirFiltrosMarketCampanha,
  persistirFiltrosMarketLista,
  restaurarFiltrosMarket,
} from '../../shared/utils/market-filtros-persist.util';

const CHAVE_DENSIDADE_MARKET = 'crm.market.tabelaCompacta';

export interface ClienteCampanhaLinha {
  id: number;
  nome: string;
  telefone: string;
  telefoneValido: boolean;
  enviado: boolean;
  enviadoEm?: string;
  status: StatusCliente;
  cortesia: boolean;
  planoNome?: string;
}

interface OpcaoFiltroEnvio {
  valor: FiltroEnvioCampanha;
  rotulo: string;
}

interface OpcaoSegmentoPublico {
  valor: SegmentoPublicoCampanha;
  rotulo: string;
}

interface OpcaoFiltroStatusLista {
  valor: FiltroStatusListaCampanha;
  rotulo: string;
}

interface OpcaoFiltroTipoLista {
  valor: FiltroTipoListaCampanha;
  rotulo: string;
}

@Component({
  selector: 'app-market',
  templateUrl: './market.page.html',
})
export class MarketPage implements OnInit, OnDestroy {
  loading = true;
  enviando = false;
  reenviandoId: number | null = null;
  excluindo = false;

  campanhas: Campanha[] = [];
  campanhaId: number | null = null;
  campanhaSelecionada: Campanha | null = null;

  formTitulo = '';
  formTipo: TipoCampanha = 'AVISO';
  formMensagem = MENSAGEM_CAMPANHA_PADRAO;

  clientes: Cliente[] = [];
  planos: Plano[] = [];
  diasAntecedencia = resolverDiasAntecedencia();
  enviosPorCliente = new Map<number, string>();
  selecionadosIds: number[] = [];
  linhasFiltradas: ClienteCampanhaLinha[] = [];

  segmentoPublico: SegmentoPublicoCampanha = 'ATIVOS';
  filtroPlanoId: number | null = null;
  incluirCortesia = false;
  filtroEnvio: FiltroEnvioCampanha = 'PENDENTES';
  busca = '';
  buscaCampanhas = '';
  filtroStatusLista: FiltroStatusListaCampanha = 'TODAS';
  filtroTipoLista: FiltroTipoListaCampanha = 'TODOS';
  visualizacao: 'lista' | 'campanha' = 'lista';
  tabelaCompacta = true;

  readonly rotuloTipoCampanha = rotuloTipoCampanha;
  readonly trackByCampanhaId = (_: number, c: Campanha) => c.id;
  readonly opcoesFiltro: OpcaoFiltroEnvio[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'PENDENTES', rotulo: 'Pendentes' },
    { valor: 'ENVIADOS', rotulo: 'Enviados' },
  ];
  readonly opcoesSegmentoPublico: OpcaoSegmentoPublico[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'ATIVOS', rotulo: 'Ativos' },
    { valor: 'VENCENDO', rotulo: 'Vencendo' },
    { valor: 'ATRASADOS', rotulo: 'Atrasados' },
    { valor: 'INATIVOS', rotulo: 'Inativos' },
  ];
  readonly opcoesFiltroStatusLista: OpcaoFiltroStatusLista[] = [
    { valor: 'TODAS', rotulo: 'Todas' },
    { valor: 'COM_ENVIOS', rotulo: 'Com envios' },
    { valor: 'SEM_ENVIOS', rotulo: 'Sem envios' },
  ];
  readonly opcoesFiltroTipoLista: OpcaoFiltroTipoLista[] = [
    { valor: 'TODOS', rotulo: 'Todos tipos' },
    { valor: 'AVISO', rotulo: 'Aviso' },
    { valor: 'PROMOCAO', rotulo: 'Promoção' },
    { valor: 'DATA_COMEMORATIVA', rotulo: 'Comemorativa' },
  ];
  readonly rotuloSegmentoPublico = rotuloSegmentoPublico;
  readonly rotuloStatusPublico = rotuloStatusPublico;
  readonly trackByLinhaId = (_: number, linha: ClienteCampanhaLinha) => linha.id;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private campanhaService: CampanhaService,
    private clienteService: ClienteService,
    private planoService: PlanoService,
    private configuracaoService: ConfiguracaoService,
    private cobrancaLoteFila: CobrancaLoteFilaService,
    private toast: ToastService,
    private sync: DadosSyncService,
    private pullRefresh: PullRefreshService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    this.tabelaCompacta =
      lerSessionJson<boolean>(CHAVE_DENSIDADE_MARKET) !== false;

    const filtrosSalvos = restaurarFiltrosMarket();
    if (filtrosSalvos?.lista) {
      this.buscaCampanhas = filtrosSalvos.lista.buscaCampanhas ?? '';
      this.filtroStatusLista = filtrosSalvos.lista.filtroStatusLista ?? 'TODAS';
      this.filtroTipoLista = filtrosSalvos.lista.filtroTipoLista ?? 'TODOS';
    }
    if (filtrosSalvos?.campanha) {
      this.segmentoPublico = filtrosSalvos.campanha.segmentoPublico ?? 'ATIVOS';
      this.filtroPlanoId = filtrosSalvos.campanha.filtroPlanoId ?? null;
      this.incluirCortesia = filtrosSalvos.campanha.incluirCortesia ?? false;
      this.filtroEnvio = filtrosSalvos.campanha.filtroEnvio ?? 'PENDENTES';
      this.busca = filtrosSalvos.campanha.busca ?? '';
    }

    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'campanhas', 'catalogos', 'configuracoes'],
      () => {
        void this.carregar(true);
      }
    );
    this.pullRefresh.registrar((concluir) => {
      void this.carregar(true).finally(() => concluir());
    });
    void this.carregar();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      void this.carregar(true);
    }
  }

  ngOnDestroy(): void {
    this.pullRefresh.limpar();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get qtdClientesComWhatsApp(): number {
    return this.clientes.filter((c) =>
      telefoneValidoParaWhatsApp(c.telefone)
    ).length;
  }

  get percentualEnvioCampanha(): number {
    const base = this.qtdPublicoComTelefone;
    if (base <= 0) {
      return this.totalEnviados > 0 ? 100 : 0;
    }
    return Math.min(100, Math.round((this.totalEnviados / base) * 100));
  }

  get campanhaConcluida(): boolean {
    return (
      this.qtdPublicoComTelefone > 0 &&
      this.totalEnviados >= this.qtdPublicoComTelefone
    );
  }

  get previewMensagemCampanha(): string {
    const amostra =
      this.linhasFiltradas.find((l) => l.telefoneValido)?.nome ??
      this.clientesNoPublico.find((c) =>
        telefoneValidoParaWhatsApp(c.telefone)
      )?.nome ??
      'Cliente';
    return montarMensagemCampanha(this.formMensagem, amostra);
  }

  get totalEnviados(): number {
    return this.clientesNoPublico.filter((c) => this.enviosPorCliente.has(c.id)).length;
  }

  get totalPendentes(): number {
    return Math.max(0, this.qtdPublicoElegivel - this.totalEnviados);
  }

  get qtdPublicoElegivel(): number {
    return this.clientesNoPublico.length;
  }

  get qtdPublicoComTelefone(): number {
    return this.clientesNoPublico.filter((c) =>
      telefoneValidoParaWhatsApp(c.telefone)
    ).length;
  }

  get qtdPublicoSelecionaveis(): number {
    return this.montarLinhas().filter((l) => this.podeSelecionar(l)).length;
  }

  private get filtroPublicoAtual(): FiltroPublicoCampanha {
    return {
      segmento: this.segmentoPublico,
      planoId: this.filtroPlanoId,
      incluirCortesia: this.incluirCortesia,
      diasAntecedenciaVencendo: this.diasAntecedencia,
    };
  }

  private get clientesNoPublico(): Cliente[] {
    return this.clientes.filter((cliente) =>
      clientePassouFiltroPublico(cliente, this.filtroPublicoAtual)
    );
  }

  get qtdSelecionados(): number {
    return this.selecionadosIds.length;
  }

  get qtdFiltradosSelecionaveis(): number {
    return this.linhasFiltradas.filter((l) => this.podeSelecionar(l)).length;
  }

  get todosFiltradosSelecionados(): boolean {
    const elegiveis = this.linhasFiltradas.filter((l) => this.podeSelecionar(l));
    return (
      elegiveis.length > 0 &&
      elegiveis.every((l) => this.estaSelecionado(l.id))
    );
  }

  get algumFiltradoSelecionado(): boolean {
    return this.linhasFiltradas.some(
      (l) => this.podeSelecionar(l) && this.estaSelecionado(l.id)
    );
  }

  get podeIniciarEnvio(): boolean {
    return (
      this.emModoCampanha &&
      !!this.campanhaId &&
      !this.enviando &&
      this.qtdSelecionados > 0 &&
      !!this.formTitulo.trim() &&
      !!this.formMensagem.trim()
    );
  }

  get campanhasFiltradas(): Campanha[] {
    const termo = this.buscaCampanhas.trim().toLowerCase();

    return this.campanhas.filter((campanha) => {
      const enviados = campanha._count?.envios ?? 0;

      if (this.filtroTipoLista !== 'TODOS' && campanha.tipo !== this.filtroTipoLista) {
        return false;
      }

      if (this.filtroStatusLista === 'SEM_ENVIOS' && enviados > 0) {
        return false;
      }

      if (this.filtroStatusLista === 'COM_ENVIOS' && enviados === 0) {
        return false;
      }

      if (!termo) {
        return true;
      }

      return (
        campanha.titulo.toLowerCase().includes(termo) ||
        campanha.mensagem.toLowerCase().includes(termo) ||
        rotuloTipoCampanha(campanha.tipo).toLowerCase().includes(termo)
      );
    });
  }

  get tituloModoCampanha(): string {
    if (this.campanhaId) return this.formTitulo.trim() || 'Editar campanha';
    return 'Nova campanha';
  }

  get subtituloModoCampanha(): string {
    return `${this.totalEnviados} enviado(s) · ${this.totalPendentes} pendente(s)`;
  }

  get emModoLista(): boolean {
    return this.visualizacao === 'lista';
  }

  get emModoCampanha(): boolean {
    return this.visualizacao === 'campanha';
  }

  get totalEnviosTodasCampanhas(): number {
    return this.campanhas.reduce((acc, c) => acc + (c._count?.envios ?? 0), 0);
  }

  contagemFiltro(filtro: FiltroEnvioCampanha): number {
    return this.montarLinhas().filter((linha) => this.passouFiltroEnvio(linha, filtro)).length;
  }

  contagemSegmentoPublico(segmento: SegmentoPublicoCampanha): number {
    return contarClientesPublico(this.clientes, {
      ...this.filtroPublicoAtual,
      segmento,
    });
  }

  classesChipPublico(segmento: SegmentoPublicoCampanha): string {
    const variantes: Record<SegmentoPublicoCampanha, VarianteFilterChip> = {
      TODOS: 'violet',
      ATIVOS: 'emerald',
      VENCENDO: 'amber',
      ATRASADOS: 'red',
      INATIVOS: 'red',
    };
    return classesFilterChip(this.segmentoPublico === segmento, variantes[segmento]);
  }

  classesChipContagemPublico(segmento: SegmentoPublicoCampanha): string {
    const variantes: Record<SegmentoPublicoCampanha, VarianteFilterChip> = {
      TODOS: 'violet',
      ATIVOS: 'emerald',
      VENCENDO: 'amber',
      ATRASADOS: 'red',
      INATIVOS: 'red',
    };
    return classesFilterChipContagem(this.segmentoPublico === segmento, variantes[segmento]);
  }

  definirSegmentoPublico(segmento: SegmentoPublicoCampanha): void {
    this.segmentoPublico = segmento;
    this.onPublicoChange();
  }

  definirFiltroStatusLista(filtro: FiltroStatusListaCampanha): void {
    this.filtroStatusLista = filtro;
    this.persistirFiltrosLista();
  }

  definirFiltroTipoLista(filtro: FiltroTipoListaCampanha): void {
    this.filtroTipoLista = filtro;
    this.persistirFiltrosLista();
  }

  onBuscaCampanhasChange(): void {
    this.persistirFiltrosLista();
  }

  classesChipStatusLista(filtro: FiltroStatusListaCampanha): string {
    const variantes: Record<FiltroStatusListaCampanha, VarianteFilterChip> = {
      TODAS: 'violet',
      COM_ENVIOS: 'emerald',
      SEM_ENVIOS: 'amber',
    };
    return classesFilterChip(this.filtroStatusLista === filtro, variantes[filtro]);
  }

  classesChipTipoLista(filtro: FiltroTipoListaCampanha): string {
    const variantes: Record<FiltroTipoListaCampanha, VarianteFilterChip> = {
      TODOS: 'violet',
      AVISO: 'violet',
      PROMOCAO: 'amber',
      DATA_COMEMORATIVA: 'emerald',
    };
    return classesFilterChip(this.filtroTipoLista === filtro, variantes[filtro]);
  }

  contagemStatusLista(filtro: FiltroStatusListaCampanha): number {
    return this.campanhas.filter((campanha) => {
      const enviados = campanha._count?.envios ?? 0;
      if (filtro === 'SEM_ENVIOS') return enviados === 0;
      if (filtro === 'COM_ENVIOS') return enviados > 0;
      return true;
    }).length;
  }

  contagemTipoLista(filtro: FiltroTipoListaCampanha): number {
    if (filtro === 'TODOS') return this.campanhas.length;
    return this.campanhas.filter((campanha) => campanha.tipo === filtro).length;
  }

  classesChipContagemStatusLista(filtro: FiltroStatusListaCampanha): string {
    const variantes: Record<FiltroStatusListaCampanha, VarianteFilterChip> = {
      TODAS: 'violet',
      COM_ENVIOS: 'emerald',
      SEM_ENVIOS: 'amber',
    };
    return classesFilterChipContagem(
      this.filtroStatusLista === filtro,
      variantes[filtro]
    );
  }

  classesChipContagemTipoLista(filtro: FiltroTipoListaCampanha): string {
    const variantes: Record<FiltroTipoListaCampanha, VarianteFilterChip> = {
      TODOS: 'violet',
      AVISO: 'violet',
      PROMOCAO: 'amber',
      DATA_COMEMORATIVA: 'emerald',
    };
    return classesFilterChipContagem(
      this.filtroTipoLista === filtro,
      variantes[filtro]
    );
  }

  onPublicoChange(): void {
    this.podarSelecaoForaDoPublico();
    this.atualizarLinhasFiltradas();
    this.persistirFiltrosCampanha();
  }

  classesChipFiltro(filtro: FiltroEnvioCampanha): string {
    const variantes: Record<FiltroEnvioCampanha, VarianteFilterChip> = {
      TODOS: 'violet',
      PENDENTES: 'amber',
      ENVIADOS: 'emerald',
    };
    return classesFilterChip(this.filtroEnvio === filtro, variantes[filtro]);
  }

  classesChipContagemFiltro(filtro: FiltroEnvioCampanha): string {
    const variantes: Record<FiltroEnvioCampanha, VarianteFilterChip> = {
      TODOS: 'violet',
      PENDENTES: 'amber',
      ENVIADOS: 'emerald',
    };
    return classesFilterChipContagem(this.filtroEnvio === filtro, variantes[filtro]);
  }

  classeBadgeStatusPublico(status: StatusCliente): string {
    switch (status) {
      case 'ATIVO':
        return 'crm-badge-ativo';
      case 'ATRASADO':
        return 'crm-badge-atrasado';
      case 'INATIVO':
        return 'crm-badge-inativo';
      default:
        return 'crm-badge-neutral';
    }
  }

  alternarDensidadeTabela(): void {
    this.tabelaCompacta = !this.tabelaCompacta;
    salvarSessionJson(CHAVE_DENSIDADE_MARKET, this.tabelaCompacta);
  }

  get classesTabela(): string {
    return this.tabelaCompacta ? 'crm-table crm-table--compact' : 'crm-table';
  }

  definirFiltro(filtro: FiltroEnvioCampanha): void {
    this.filtroEnvio = filtro;
    this.atualizarLinhasFiltradas();
    this.persistirFiltrosCampanha();
  }

  onBuscaChange(): void {
    this.atualizarLinhasFiltradas();
    this.persistirFiltrosCampanha();
  }

  selecionarPendentes(): void {
    this.filtroEnvio = 'PENDENTES';
    this.atualizarLinhasFiltradas();
    this.selecionadosIds = this.linhasFiltradas
      .filter((linha) => this.podeSelecionar(linha))
      .map((linha) => linha.id);
    this.persistirFiltrosCampanha();
  }

  focarPendentes(): void {
    this.filtroEnvio = 'PENDENTES';
    this.atualizarLinhasFiltradas();
    this.persistirFiltrosCampanha();
  }

  podeSelecionar(linha: ClienteCampanhaLinha): boolean {
    return !linha.enviado && linha.telefoneValido;
  }

  podeReenviar(linha: ClienteCampanhaLinha): boolean {
    return linha.enviado && linha.telefoneValido;
  }

  async reenviarCliente(linha: ClienteCampanhaLinha, event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.campanhaId || !this.podeReenviar(linha) || this.reenviandoId !== null) {
      return;
    }

    const cliente = this.clientes.find((c) => c.id === linha.id);
    if (!cliente) return;

    const campanhaId = this.campanhaId;
    const mensagemBase = this.formMensagem.trim();
    const item: CobrancaLoteItem = {
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      mensagem: montarMensagemCampanha(mensagemBase, cliente.nome),
    };

    this.reenviandoId = linha.id;
    try {
      const resultado = await this.cobrancaLoteFila.executar([item], {
        titulo: 'Reenviar campanha',
        rotuloAbrir: 'Abrir WhatsApp',
        modoManual: true,
        rotuloMarcar: 'Confirmar reenvio',
        onMarcarEnviado: async (clienteId) => {
          await firstValueFrom(
            this.campanhaService.registrarEnvios(campanhaId, [clienteId])
          );
          this.enviosPorCliente.set(clienteId, new Date().toISOString());
          this.atualizarLinhasFiltradas();
        },
      });

      if (resultado.idsEnviados.length > 0) {
        await this.carregarCampanha(campanhaId, false);
        this.campanhas = await firstValueFrom(this.campanhaService.listar());
      }
    } catch {
      void this.toast.error('Não foi possível iniciar o reenvio.');
    } finally {
      this.reenviandoId = null;
    }
  }

  estaSelecionado(id: number): boolean {
    return this.selecionadosIds.includes(id);
  }

  alternarSelecaoClick(id: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.podeSelecionarPorId(id)) return;
    this.alternarSelecao(id);
  }

  alternarSelecaoLinha(linha: ClienteCampanhaLinha): void {
    if (!this.podeSelecionar(linha)) return;
    this.alternarSelecao(linha.id);
  }

  alternarSelecionarTodosFiltrados(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const elegiveis = this.linhasFiltradas.filter((l) => this.podeSelecionar(l));
    if (elegiveis.length === 0) return;

    if (this.todosFiltradosSelecionados) {
      const idsFiltrados = new Set(elegiveis.map((l) => l.id));
      this.selecionadosIds = this.selecionadosIds.filter((id) => !idsFiltrados.has(id));
      return;
    }

    const next = new Set(this.selecionadosIds);
    for (const linha of elegiveis) {
      next.add(linha.id);
    }
    this.selecionadosIds = [...next];
  }

  private podeSelecionarPorId(id: number): boolean {
    const linha = this.montarLinhas().find((l) => l.id === id);
    return linha ? this.podeSelecionar(linha) : false;
  }

  private alternarSelecao(id: number): void {
    if (this.estaSelecionado(id)) {
      this.selecionadosIds = this.selecionadosIds.filter((item) => item !== id);
    } else {
      this.selecionadosIds = [...this.selecionadosIds, id];
    }
  }

  selecionarElegiveisWhatsApp(): void {
    this.selecionadosIds = this.montarLinhas()
      .filter((l) => this.podeSelecionar(l) && l.telefoneValido)
      .map((l) => l.id);
  }

  limparSelecao(): void {
    this.selecionadosIds = [];
  }

  exportarCampanha(): void {
    const linhas = this.montarLinhas();
    if (linhas.length === 0) {
      void this.toast.warning('Nenhum destinatário no público atual para exportar.');
      return;
    }

    const plano = this.filtroPlanoId
      ? this.planos.find((item) => item.id === this.filtroPlanoId)
      : undefined;

    exportarCampanhaCsv(linhas, {
      titulo: this.formTitulo.trim() || 'Campanha',
      tipo: this.formTipo,
      segmento: this.segmentoPublico,
      planoNome: plano?.nome,
      incluirCortesia: this.incluirCortesia,
    });

    void this.toast.success(`CSV exportado · ${linhas.length} destinatário(s) do público atual.`);
  }

  formatarDataEnvio(data?: string): string {
    return data ? formatarData(data) : '—';
  }

  formatarDataCampanha(data?: string): string {
    return data ? formatarData(data) : '—';
  }

  resumoEnviosCampanha(campanha: Campanha): string {
    const enviados = campanha._count?.envios ?? 0;
    if (enviados === 0) {
      return 'Nenhum envio';
    }
    return enviados === 1 ? '1 envio registrado' : `${enviados} envios registrados`;
  }

  percentualEnviosCampanha(campanha: Campanha): number {
    const enviados = campanha._count?.envios ?? 0;
    const base = Math.max(this.qtdClientesComWhatsApp, enviados, 1);
    return Math.min(100, Math.round((enviados / base) * 100));
  }

  legendaProgressoCampanha(campanha: Campanha): string {
    const enviados = campanha._count?.envios ?? 0;
    if (enviados === 0) {
      return 'Aguardando primeiro envio';
    }
    return `${this.percentualEnviosCampanha(campanha)}% da base WhatsApp`;
  }

  campanhaTemEnviosPendentes(campanha: Campanha): boolean {
    return (campanha._count?.envios ?? 0) === 0;
  }

  classesTipoCampanha(tipo: TipoCampanha): string {
    switch (tipo) {
      case 'PROMOCAO':
        return 'crm-badge-promocao';
      case 'DATA_COMEMORATIVA':
        return 'crm-badge-comemorativa';
      default:
        return 'crm-badge-campanha';
    }
  }

  async abrirModalCampanha(
    campanha: Campanha | null = null,
    abrirEnvioAposSalvar = false
  ): Promise<void> {
    try {
      const modal = await this.modalCtrl.create({
        component: CampanhaFormModalComponent,
        componentProps: { campanha },
        cssClass: 'crm-modal crm-modal-lg',
        backdropDismiss: true,
      });
      await modal.present();
      const { data, role } = await modal.onDidDismiss<Campanha>();

      if (role !== 'confirm' || !data) return;

      this.campanhas = await firstValueFrom(this.campanhaService.listar());

      if (abrirEnvioAposSalvar || this.emModoCampanha) {
        await this.abrirCampanha(data.id);
      }
    } catch {
      void this.toast.error('Não foi possível abrir o formulário da campanha.');
    }
  }

  async iniciarNovaCampanha(): Promise<void> {
    await this.abrirModalCampanha(null, true);
  }

  async editarCampanhaAtual(): Promise<void> {
    if (!this.campanhaSelecionada) return;
    await this.abrirModalCampanha(this.campanhaSelecionada, false);
  }

  async abrirCampanha(id: number): Promise<void> {
    const ok = await this.carregarCampanha(id);
    if (ok) {
      this.visualizacao = 'campanha';
    }
  }

  voltarParaLista(): void {
    this.visualizacao = 'lista';
    this.campanhaId = null;
    this.campanhaSelecionada = null;
    this.enviosPorCliente.clear();
    this.selecionadosIds = [];
    this.atualizarLinhasFiltradas();
  }

  async carregar(silencioso = false): Promise<void> {
    if (!silencioso) {
      this.loading = true;
    }
    try {
      try {
        this.clientes = await firstValueFrom(
          this.clienteService.listar().pipe(takeUntil(this.destroy$))
        );
      } catch {
        this.clientes = [];
        void this.toast.error('Erro ao carregar clientes.');
      }

      try {
        this.planos = await firstValueFrom(
          this.planoService.listar().pipe(takeUntil(this.destroy$))
        );
      } catch {
        this.planos = [];
      }

      try {
        const config = await firstValueFrom(
          this.configuracaoService.carregar().pipe(takeUntil(this.destroy$))
        );
        this.diasAntecedencia = resolverDiasAntecedencia(config);
      } catch {
        this.diasAntecedencia = resolverDiasAntecedencia();
      }

      try {
        this.campanhas = await firstValueFrom(
          this.campanhaService.listar().pipe(takeUntil(this.destroy$))
        );
      } catch {
        this.campanhas = [];
        void this.toast.warning(
          'Não foi possível carregar campanhas. Reinicie o servidor (npm run dev) e tente novamente.'
        );
      }

      if (this.emModoCampanha && this.campanhaId) {
        await this.carregarCampanha(this.campanhaId, false);
      }

      this.atualizarLinhasFiltradas();
    } finally {
      if (!silencioso) {
        this.loading = false;
      }
    }
  }

  private async carregarCampanha(id: number, resetSelecao = true): Promise<boolean> {
    try {
      const campanha = await firstValueFrom(this.campanhaService.buscarPorId(id));
      this.campanhaId = campanha.id;
      this.campanhaSelecionada = campanha;
      this.formTitulo = campanha.titulo;
      this.formTipo = campanha.tipo;
      this.formMensagem = campanha.mensagem;

      this.enviosPorCliente.clear();
      for (const envio of campanha.envios ?? []) {
        this.enviosPorCliente.set(envio.clienteId, envio.enviadoEm);
      }

      if (resetSelecao) {
        this.selecionadosIds = [];
        this.atualizarLinhasFiltradas();
        this.selecionarElegiveisWhatsApp();
      } else {
        this.selecionadosIds = this.selecionadosIds.filter(
          (clienteId) => !this.enviosPorCliente.has(clienteId)
        );
        this.atualizarLinhasFiltradas();
      }

      return true;
    } catch {
      void this.toast.error('Erro ao carregar campanha.');
      return false;
    }
  }

  async excluirCampanha(): Promise<void> {
    if (!this.campanhaId) return;

    const confirmar = await confirmarUsuario(
      'O histórico de envios desta campanha será perdido.',
      'Excluir campanha?'
    );
    if (!confirmar) return;

    this.excluindo = true;
    try {
      await firstValueFrom(this.campanhaService.excluir(this.campanhaId));
      void this.toast.success('Campanha excluída.');
      this.campanhaId = null;
      this.campanhaSelecionada = null;
      this.visualizacao = 'lista';
      await this.carregar();
    } catch {
      void this.toast.error('Erro ao excluir campanha.');
    } finally {
      this.excluindo = false;
    }
  }

  async iniciarEnvio(): Promise<void> {
    if (!this.campanhaId) {
      void this.toast.warning('Campanha não encontrada.');
      return;
    }

    const selecionadosValidos = this.selecionadosIds.filter((id) => {
      const cliente = this.clientes.find((c) => c.id === id);
      return cliente && telefoneValidoParaWhatsApp(cliente.telefone);
    });

    if (selecionadosValidos.length === 0) {
      void this.toast.warning(
        'Selecione ao menos um cliente com telefone válido para WhatsApp.'
      );
      return;
    }

    const campanhaId = this.campanhaId;
    const mensagemBase = this.formMensagem.trim();
    const itens: CobrancaLoteItem[] = selecionadosValidos
      .map((id) => {
        const cliente = this.clientes.find((c) => c.id === id);
        if (!cliente) return null;
        return {
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          mensagem: montarMensagemCampanha(mensagemBase, cliente.nome),
        };
      })
      .filter((item): item is CobrancaLoteItem => item !== null);

    this.enviando = true;
    try {
      void this.toast.info(
        `Fila iniciada · ${itens.length} cliente(s). Abra o WhatsApp e marque cada envio.`
      );

      const resultado = await this.cobrancaLoteFila.executar(itens, {
        titulo: 'Campanha · envio manual',
        rotuloAbrir: 'Abrir WhatsApp',
        modoManual: true,
        rotuloMarcar: 'Marcar enviado e próximo',
        onMarcarEnviado: async (clienteId) => {
          await firstValueFrom(
            this.campanhaService.registrarEnvios(campanhaId!, [clienteId])
          );
          this.enviosPorCliente.set(clienteId, new Date().toISOString());
          this.selecionadosIds = this.selecionadosIds.filter((id) => id !== clienteId);
          this.atualizarLinhasFiltradas();
        },
      });

      if (resultado.idsEnviados.length > 0) {
        await this.carregarCampanha(campanhaId!, false);
        this.campanhas = await firstValueFrom(this.campanhaService.listar());
      }
    } catch {
      void this.toast.error('Não foi possível iniciar a fila de envio.');
    } finally {
      this.enviando = false;
    }
  }

  private montarLinhas(): ClienteCampanhaLinha[] {
    return this.clientesNoPublico.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      telefoneValido: telefoneValidoParaWhatsApp(cliente.telefone),
      enviado: this.enviosPorCliente.has(cliente.id),
      enviadoEm: this.enviosPorCliente.get(cliente.id),
      status: resolverStatusCliente(cliente),
      cortesia: !!cliente.cortesia,
      planoNome: cliente.plano?.nome,
    }));
  }

  private podarSelecaoForaDoPublico(): void {
    const idsPublico = new Set(this.clientesNoPublico.map((cliente) => cliente.id));
    this.selecionadosIds = this.selecionadosIds.filter((id) => idsPublico.has(id));
  }

  private passouFiltroEnvio(
    linha: ClienteCampanhaLinha,
    filtro: FiltroEnvioCampanha = this.filtroEnvio
  ): boolean {
    if (filtro === 'PENDENTES' && linha.enviado) return false;
    if (filtro === 'ENVIADOS' && !linha.enviado) return false;
    return true;
  }

  private atualizarLinhasFiltradas(): void {
    const termo = this.busca.trim().toLowerCase();
    this.linhasFiltradas = this.montarLinhas().filter((linha) => {
      if (!this.passouFiltroEnvio(linha)) return false;
      if (!termo) return true;
      return (
        linha.nome.toLowerCase().includes(termo) ||
        linha.telefone.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
      );
    });
  }

  private persistirFiltrosCampanha(): void {
    persistirFiltrosMarketCampanha({
      segmentoPublico: this.segmentoPublico,
      filtroPlanoId: this.filtroPlanoId,
      incluirCortesia: this.incluirCortesia,
      filtroEnvio: this.filtroEnvio,
      busca: this.busca,
    });
  }

  private persistirFiltrosLista(): void {
    persistirFiltrosMarketLista({
      buscaCampanhas: this.buscaCampanhas,
      filtroStatusLista: this.filtroStatusLista,
      filtroTipoLista: this.filtroTipoLista,
    });
  }
}
