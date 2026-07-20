import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CampanhaService } from '../../core/services/campanha.service';
import { ClienteService } from '../../core/services/cliente.service';
import { CobrancaLoteFilaService } from '../../core/services/cobranca-lote-fila.service';
import { ToastService } from '../../core/services/toast.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { Campanha, Cliente, TipoCampanha } from '../../core/models';
import { formatarData } from '../../shared/utils/formatters';
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

export interface ClienteCampanhaLinha {
  id: number;
  nome: string;
  telefone: string;
  telefoneValido: boolean;
  enviado: boolean;
  enviadoEm?: string;
}

interface OpcaoFiltroEnvio {
  valor: FiltroEnvioCampanha;
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
  enviosPorCliente = new Map<number, string>();
  selecionadosIds: number[] = [];
  linhasFiltradas: ClienteCampanhaLinha[] = [];

  filtroEnvio: FiltroEnvioCampanha = 'TODOS';
  busca = '';
  buscaCampanhas = '';
  visualizacao: 'lista' | 'campanha' = 'lista';

  readonly rotuloTipoCampanha = rotuloTipoCampanha;
  readonly trackByCampanhaId = (_: number, c: Campanha) => c.id;
  readonly opcoesFiltro: OpcaoFiltroEnvio[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'PENDENTES', rotulo: 'Pendentes' },
    { valor: 'ENVIADOS', rotulo: 'Enviados' },
  ];
  readonly trackByLinhaId = (_: number, linha: ClienteCampanhaLinha) => linha.id;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private campanhaService: CampanhaService,
    private clienteService: ClienteService,
    private cobrancaLoteFila: CobrancaLoteFilaService,
    private toast: ToastService,
    private sync: DadosSyncService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    vincularSincronizacaoPagina(this.sync, this.destroy$, ['clientes'], () => {
      void this.carregar();
    });
    void this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalEnviados(): number {
    return this.enviosPorCliente.size;
  }

  get totalPendentes(): number {
    return Math.max(0, this.clientes.length - this.totalEnviados);
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
    if (!termo) return this.campanhas;
    return this.campanhas.filter(
      (c) =>
        c.titulo.toLowerCase().includes(termo) ||
        c.mensagem.toLowerCase().includes(termo) ||
        rotuloTipoCampanha(c.tipo).toLowerCase().includes(termo)
    );
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

  classesChipFiltro(filtro: FiltroEnvioCampanha): string {
    const base =
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors';
    if (this.filtroEnvio !== filtro) {
      return `${base} border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300`;
    }
    return `${base} border-violet-500/40 bg-violet-500/10 text-violet-200`;
  }

  definirFiltro(filtro: FiltroEnvioCampanha): void {
    this.filtroEnvio = filtro;
    this.atualizarLinhasFiltradas();
  }

  onBuscaChange(): void {
    this.atualizarLinhasFiltradas();
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

  selecionarPendentes(): void {
    this.selecionadosIds = this.montarLinhas()
      .filter((l) => this.podeSelecionar(l))
      .map((l) => l.id);
  }

  limparSelecao(): void {
    this.selecionadosIds = [];
  }

  formatarDataEnvio(data?: string): string {
    return data ? formatarData(data) : '—';
  }

  formatarDataCampanha(data?: string): string {
    return data ? formatarData(data) : '—';
  }

  resumoEnviosCampanha(campanha: Campanha): string {
    const enviados = campanha._count?.envios ?? 0;
    const total = this.clientes.length;
    return `${enviados} de ${total} cliente(s)`;
  }

  percentualEnviosCampanha(campanha: Campanha): number {
    if (this.clientes.length === 0) return 0;
    const enviados = campanha._count?.envios ?? 0;
    return Math.min(100, Math.round((enviados / this.clientes.length) * 100));
  }

  classesTipoCampanha(tipo: TipoCampanha): string {
    const base = 'text-xs font-medium px-2 py-0.5 rounded-full border';
    switch (tipo) {
      case 'PROMOCAO':
        return `${base} text-amber-300 border-amber-500/40 bg-amber-500/10`;
      case 'DATA_COMEMORATIVA':
        return `${base} text-sky-300 border-sky-500/40 bg-sky-500/10`;
      default:
        return `${base} text-violet-300 border-violet-500/40 bg-violet-500/10`;
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
    await this.carregarCampanha(id);
    this.visualizacao = 'campanha';
  }

  voltarParaLista(): void {
    this.visualizacao = 'lista';
    this.campanhaId = null;
    this.campanhaSelecionada = null;
    this.enviosPorCliente.clear();
    this.selecionadosIds = [];
    this.atualizarLinhasFiltradas();
  }

  async carregar(): Promise<void> {
    this.loading = true;
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
      this.loading = false;
    }
  }

  private async carregarCampanha(id: number, resetSelecao = true): Promise<void> {
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
      } else {
        this.selecionadosIds = this.selecionadosIds.filter(
          (clienteId) => !this.enviosPorCliente.has(clienteId)
        );
      }

      this.atualizarLinhasFiltradas();
    } catch {
      void this.toast.error('Erro ao carregar campanha.');
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
    return this.clientes.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      telefoneValido: telefoneValidoParaWhatsApp(cliente.telefone),
      enviado: this.enviosPorCliente.has(cliente.id),
      enviadoEm: this.enviosPorCliente.get(cliente.id),
    }));
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
}
