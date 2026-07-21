import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { AutomacaoService } from '../../core/services/automacao.service';
import { ToastService } from '../../core/services/toast.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
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
import { AUTOMACAO_META_HABILITADA } from '../../shared/utils/automacao-meta';
import { CobrancaLoteFilaService } from '../../core/services/cobranca-lote-fila.service';
import { RenovacaoMensalidadeService } from '../../core/services/renovacao-mensalidade.service';
import {
  contatoRegistradoHoje,
  rotuloUltimoContato,
  classeIndicadorContato,
  classeDotContato,
} from '../../shared/utils/contato';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';

export type FiltroGrupoCobranca = 'TODOS' | TipoCobrancaDiaria;

@Component({
  selector: 'app-cobranca-diaria',
  templateUrl: './cobranca-diaria.page.html',
})
export class CobrancaDiariaPage implements OnInit, OnDestroy {
  readonly automacaoMetaHabilitada = AUTOMACAO_META_HABILITADA;
  loading = true;
  private readonly destroy$ = new Subject<void>();
  itens: ItemCobrancaDiaria[] = [];
  selecionados = new Set<number>();
  enviando = false;
  filtroGrupo: FiltroGrupoCobranca = 'TODOS';
  filtroSomentePendentes = false;
  automacaoAtiva = false;
  salvandoAutomacao = false;
  whatsappApiConfigurado = false;
  templatesMetaProntos = false;
  horariosAutomacao = '08:00–09:00';
  renovandoMensalidadeId: number | null = null;
  readonly limitePorSecao = 30;
  private secoesExpandidas = new Set<TipoCobrancaDiaria>();

  constructor(
    private route: ActivatedRoute,
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private automacaoService: AutomacaoService,
    private toast: ToastService,
    private sync: DadosSyncService,
    private cobrancaLoteFila: CobrancaLoteFilaService,
    private renovacao: RenovacaoMensalidadeService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  get diasAntecedencia(): number {
    return resolverDiasAntecedencia(this.configuracao);
  }

  get aguardandoTemplatesMeta(): boolean {
    return this.whatsappApiConfigurado && !this.templatesMetaProntos;
  }

  get automacaoToggleDesabilitado(): boolean {
    return (
      this.salvandoAutomacao ||
      !this.whatsappApiConfigurado ||
      this.aguardandoTemplatesMeta
    );
  }

  get subtitulo(): string {
    const hoje = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return `Rotina de ${hoje} · atrasados e vencimentos em até ${this.diasAntecedencia} dias`;
  }

  get itensContactaveis(): ItemCobrancaDiaria[] {
    return this.itens.filter((item) => item.telefoneValido);
  }

  get contactadosHoje(): number {
    return this.itensContactaveis.filter((item) =>
      contatoRegistradoHoje(item.ultimoContatoEm)
    ).length;
  }

  get rotinaFeitaHoje(): boolean {
    return (
      this.itensContactaveis.length === 0 ||
      this.contactadosHoje === this.itensContactaveis.length
    );
  }

  get qtdPendentesHoje(): number {
    return this.itensContactaveis.filter(
      (item) => !contatoRegistradoHoje(item.ultimoContatoEm)
    ).length;
  }

  get qtdAtrasadosNaoContactados(): number {
    return this.itensContactaveis.filter(
      (item) =>
        item.tipo === 'ATRASADO' &&
        !contatoRegistradoHoje(item.ultimoContatoEm)
    ).length;
  }

  get itensFiltrados(): ItemCobrancaDiaria[] {
    return this.itens.filter((item) => this.itemPassaFiltroPendentes(item));
  }

  get listaFiltradaVazia(): boolean {
    return this.itens.length > 0 && this.itensFiltrados.length === 0;
  }

  get progressoRotina(): string {
    return `${this.contactadosHoje} de ${this.itensContactaveis.length} contactados hoje`;
  }

  get progressoRotinaPercent(): number {
    if (this.itensContactaveis.length === 0) return 100;
    return Math.round(
      (this.contactadosHoje / this.itensContactaveis.length) * 100
    );
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

    this.route.queryParamMap.subscribe((params) => {
      this.aplicarQueryParams(
        params.get('pendentes') === '1',
        params.get('atrasados') === '1'
      );
    });

    this.carregar();
    this.carregarAutomacao();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades', 'configuracoes'],
      () => this.carregar(true)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private aplicarQueryParams(
    selecionarPendentes: boolean,
    somenteAtrasados = false
  ): void {
    if (somenteAtrasados) {
      this.filtroGrupo = 'ATRASADO';
      this.filtroSomentePendentes = true;
    } else if (selecionarPendentes) {
      this.filtroSomentePendentes = true;
    }

    if (this.itens.length > 0) {
      if (somenteAtrasados) {
        this.selecionarAtrasadosNaoContactados();
      } else if (selecionarPendentes) {
        this.selecionarNaoContactados();
      }
    } else {
      this.selecionarPendentesViaQuery = selecionarPendentes && !somenteAtrasados;
      this.selecionarAtrasadosViaQuery = somenteAtrasados;
    }
  }

  private selecionarPendentesViaQuery = false;
  private selecionarAtrasadosViaQuery = false;

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar(true);
    }
    this.carregarAutomacao(true);
  }

  carregarAutomacao(silencioso = false): void {
    if (!AUTOMACAO_META_HABILITADA) {
      return;
    }

    this.automacaoService.obterPainel().subscribe({
      next: (painel) => {
        this.automacaoAtiva =
          painel.config.lembretesAtivos || painel.config.cobrancaAtrasadosAtiva;
        this.whatsappApiConfigurado = painel.whatsappConfigurado;
        this.templatesMetaProntos = painel.templatesProntos;
        const inicio = painel.janelaManha?.inicio ?? '08:00';
        const fim = painel.janelaManha?.fim ?? '09:00';
        this.horariosAutomacao = `${inicio}–${fim}`;
      },
      error: () => {
        if (!silencioso) {
          void this.toast.error('Erro ao carregar status da automação.');
        }
      },
    });
  }

  alternarAutomacao(ativo: boolean): void {
    if (ativo && !this.whatsappApiConfigurado) {
      this.automacaoAtiva = false;
      void this.toast.warning(
        'Configure a WhatsApp API no backend antes de ativar o envio automático.'
      );
      return;
    }

    if (ativo && this.aguardandoTemplatesMeta) {
      this.automacaoAtiva = false;
      void this.toast.warning(
        'Confirme os templates aprovados em Automações antes de ativar o envio automático.'
      );
      return;
    }

    const anterior = this.automacaoAtiva;
    this.automacaoAtiva = ativo;
    this.salvandoAutomacao = true;

    this.automacaoService
      .salvar({
        lembretesAtivos: ativo,
        cobrancaAtrasadosAtiva: ativo,
      })
      .subscribe({
        next: () => {
          this.salvandoAutomacao = false;
          void this.toast.success(
            ativo
              ? 'Cobrança diária automática ativada.'
              : 'Cobrança diária automática desativada.'
          );
        },
        error: (err: Error) => {
          this.automacaoAtiva = anterior;
          this.salvandoAutomacao = false;
          void this.toast.error(err.message ?? 'Erro ao salvar automação.');
        },
      });
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    const selecionadosAnteriores = silencioso
      ? new Set(this.selecionados)
      : null;

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

        if (selecionadosAnteriores) {
          const idsValidos = new Set(this.itens.map((item) => item.mensalidadeId));
          this.selecionados = new Set(
            [...selecionadosAnteriores].filter((id) => idsValidos.has(id))
          );
        } else {
          this.selecionarElegiveis();
          if (this.selecionarAtrasadosViaQuery) {
            this.selecionarAtrasadosNaoContactados();
            this.selecionarAtrasadosViaQuery = false;
          } else if (this.selecionarPendentesViaQuery) {
            this.selecionarNaoContactados();
            this.selecionarPendentesViaQuery = false;
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        if (!silencioso) {
          void this.toast.error('Erro ao carregar a cobrança diária.');
        }
      },
    });
  }

  itensVisiveisPorTipo(tipo: TipoCobrancaDiaria): ItemCobrancaDiaria[] {
    if (this.filtroGrupo !== 'TODOS' && this.filtroGrupo !== tipo) {
      return [];
    }
    const lista = this.itensPorTipo(tipo);
    if (this.secoesExpandidas.has(tipo)) {
      return lista;
    }
    return lista.slice(0, this.limitePorSecao);
  }

  temMaisItens(tipo: TipoCobrancaDiaria): boolean {
    return (
      !this.secoesExpandidas.has(tipo) &&
      this.itensPorTipo(tipo).length > this.limitePorSecao
    );
  }

  expandirSecao(tipo: TipoCobrancaDiaria): void {
    this.secoesExpandidas.add(tipo);
  }

  definirFiltroGrupo(filtro: FiltroGrupoCobranca): void {
    this.filtroGrupo = filtro;
  }

  alternarFiltroSomentePendentes(): void {
    this.filtroSomentePendentes = !this.filtroSomentePendentes;
  }

  private itemPassaFiltroPendentes(item: ItemCobrancaDiaria): boolean {
    if (!this.filtroSomentePendentes) {
      return true;
    }

    return !contatoRegistradoHoje(item.ultimoContatoEm);
  }

  selecionarSomente(tipo: TipoCobrancaDiaria): void {
    this.selecionados = new Set(
      this.itensPorTipo(tipo)
        .filter((item) => item.telefoneValido)
        .map((item) => item.mensalidadeId)
    );
  }

  selecionarNaoContactados(): void {
    this.selecionados = new Set(
      this.itensContactaveis
        .filter((item) => !contatoRegistradoHoje(item.ultimoContatoEm))
        .map((item) => item.mensalidadeId)
    );
  }

  selecionarAtrasadosNaoContactados(): void {
    this.filtroGrupo = 'ATRASADO';
    this.filtroSomentePendentes = true;
    this.selecionados = new Set(
      this.itensContactaveis
        .filter(
          (item) =>
            item.tipo === 'ATRASADO' &&
            !contatoRegistradoHoje(item.ultimoContatoEm)
        )
        .map((item) => item.mensalidadeId)
    );
  }

  itensPorTipo(tipo: TipoCobrancaDiaria): ItemCobrancaDiaria[] {
    return this.itens.filter(
      (item) => item.tipo === tipo && this.itemPassaFiltroPendentes(item)
    );
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

  contatoRegistradoHoje(item: ItemCobrancaDiaria): boolean {
    return contatoRegistradoHoje(item.ultimoContatoEm);
  }

  rotuloContato(item: ItemCobrancaDiaria): string {
    return rotuloUltimoContato(item.ultimoContatoEm);
  }

  classeContato(item: ItemCobrancaDiaria): string {
    return classeIndicadorContato(item.ultimoContatoEm);
  }

  classeDot(item: ItemCobrancaDiaria): string {
    return classeDotContato(item.ultimoContatoEm);
  }

  onContatoRegistrado(mensalidadeId: number): void {
    this.atualizarContatosLocais([mensalidadeId]);
  }

  onBloqueioRegistrado(evento: {
    mensalidadeId: number;
    bloqueioEnviadoEm: string;
  }): void {
    this.atualizarBloqueioLocal(evento.mensalidadeId, evento.bloqueioEnviadoEm);
  }

  estaRenovando(item: ItemCobrancaDiaria): boolean {
    return this.renovandoMensalidadeId === item.mensalidadeId;
  }

  async renovar(item: ItemCobrancaDiaria): Promise<void> {
    if (this.renovandoMensalidadeId !== null) return;

    this.renovandoMensalidadeId = item.mensalidadeId;
    const ok = await this.renovacao.registrarRenovacao({
      mensalidadeId: item.mensalidadeId,
      clienteId: item.clienteId,
      telefone: item.telefone,
      nome: item.nome,
      referencia: item.referencia,
      valorFallback: item.valor,
    });
    this.renovandoMensalidadeId = null;
    if (ok) this.carregar(true);
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

    const resultado = await this.cobrancaLoteFila.executar(
      selecionados.map((item) => ({
        id: item.mensalidadeId,
        nome: item.nome,
        telefone: item.telefone,
        mensagem: item.mensagem,
      })),
      { titulo: 'Cobrança diária', rotuloAbrir: 'Abrir WhatsApp' }
    );

    if (resultado.idsEnviados.length > 0) {
      this.mensalidadeService.registrarContatos(resultado.idsEnviados).subscribe({
        next: () => {
          this.atualizarContatosLocais(resultado.idsEnviados);
          this.enviando = false;
        },
        error: () => {
          void this.toast.warning(
            'WhatsApp aberto, mas nem todos os contatos foram salvos.'
          );
          this.enviando = false;
        },
      });
      return;
    }

    this.enviando = false;
  }

  private atualizarContatosLocais(ids: number[]): void {
    const agora = new Date().toISOString();
    const idsSet = new Set(ids);
    this.itens = this.itens.map((item) =>
      idsSet.has(item.mensalidadeId)
        ? { ...item, ultimoContatoEm: agora }
        : item
    );
  }

  private atualizarBloqueioLocal(
    mensalidadeId: number,
    bloqueioEnviadoEm: string
  ): void {
    this.itens = this.itens.map((item) =>
      item.mensalidadeId === mensalidadeId
        ? {
            ...item,
            bloqueioEnviadoEm,
            ultimoContatoEm: bloqueioEnviadoEm,
          }
        : item
    );
  }

  rotuloDias = rotuloDiasCobrancaDiaria;
  rotuloTipo = rotuloTipoCobrancaDiaria;
  fmtData = formatarData;
  fmtValor = formatarValor;
  trackByItem = trackByItemCobrancaDiaria;
}
