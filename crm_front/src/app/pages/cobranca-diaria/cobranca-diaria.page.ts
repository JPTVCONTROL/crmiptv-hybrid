import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
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
  EtapaCobrancaDiaria,
  montarItensCobrancaDiaria,
  agruparItensPorEtapaFunil,
  resumoEtapasFunilHoje,
  ORDEM_PONTOS_FUNIL,
  rotuloDiasCobrancaDiaria,
  rotuloTipoCobrancaDiaria,
  TipoCobrancaDiaria,
  trackByItemCobrancaDiaria,
  rotuloPontoDisparo,
} from '../../shared/utils/cobranca-diaria';
import { PontoDisparoAutomacao } from '../../shared/utils/automacao-disparo';
import { CobrancaLoteFilaService } from '../../core/services/cobranca-lote-fila.service';
import { RenovacaoMensalidadeService } from '../../core/services/renovacao-mensalidade.service';
import {
  contatoRegistradoHoje,
  rotuloUltimoContato,
  classeIndicadorContato,
  classeDotContato,
} from '../../shared/utils/contato';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_OPERACAO,
} from '../../shared/utils/page-sync.util';
import {
  classesFilterChip,
  classesFilterChipContagem,
  VarianteFilterChip,
} from '../../shared/utils/filter-chip.util';

export type FiltroGrupoCobranca = 'TODOS' | TipoCobrancaDiaria;

@Component({
  selector: 'app-cobranca-diaria',
  templateUrl: './cobranca-diaria.page.html',
})
export class CobrancaDiariaPage implements OnInit, OnDestroy {
  loading = true;
  private readonly destroy$ = new Subject<void>();
  itens: ItemCobrancaDiaria[] = [];
  selecionados = new Set<number>();
  enviando = false;
  marcandoCobrados = false;
  filtroGrupo: FiltroGrupoCobranca = 'TODOS';
  filtroSomentePendentes = false;
  filtroEtapa: PontoDisparoAutomacao | null = null;
  renovandoMensalidadeId: number | null = null;
  readonly limitePorSecao = 30;
  private secoesExpandidas = new Set<PontoDisparoAutomacao>();

  constructor(
    private route: ActivatedRoute,
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
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

  get subtitulo(): string {
    const hoje = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return `Rotina de ${hoje} · funil progressivo (5, 3, 1, 0 dias antes · 1, 2, 3 e 7 atrasados)`;
  }

  get itensElegiveis(): ItemCobrancaDiaria[] {
    return this.itens;
  }

  get itensContactaveis(): ItemCobrancaDiaria[] {
    return this.itens.filter((item) => item.telefoneValido);
  }

  get contactadosHoje(): number {
    return this.itensElegiveis.filter((item) =>
      contatoRegistradoHoje(item.ultimoContatoEm)
    ).length;
  }

  get rotinaFeitaHoje(): boolean {
    return (
      this.itensElegiveis.length === 0 ||
      this.contactadosHoje === this.itensElegiveis.length
    );
  }

  get qtdPendentesHoje(): number {
    return this.itensElegiveis.filter(
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

  get resumoEtapasHoje(): string {
    return resumoEtapasFunilHoje(this.itens);
  }

  get itensBaseLista(): ItemCobrancaDiaria[] {
    return this.itens.filter((item) => {
      if (this.filtroEtapa && item.pontoDisparo !== this.filtroEtapa) {
        return false;
      }
      if (this.filtroGrupo !== 'TODOS' && item.tipo !== this.filtroGrupo) {
        return false;
      }
      return this.itemPassaFiltroPendentes(item);
    });
  }

  get etapasAtivas(): EtapaCobrancaDiaria[] {
    return agruparItensPorEtapaFunil(this.itensBaseLista);
  }

  get itensFiltrados(): ItemCobrancaDiaria[] {
    return this.itensBaseLista;
  }

  get listaFiltradaVazia(): boolean {
    return this.itens.length > 0 && this.itensFiltrados.length === 0;
  }

  get progressoRotina(): string {
    return `${this.contactadosHoje} de ${this.itensElegiveis.length} contactados hoje`;
  }

  get progressoRotinaPercent(): number {
    if (this.itensElegiveis.length === 0) return 100;
    return Math.round(
      (this.contactadosHoje / this.itensElegiveis.length) * 100
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
        params.get('atrasados') === '1',
        params.get('etapa')
      );
    });

    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_OPERACAO,
      () => this.carregar(true)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private aplicarQueryParams(
    selecionarPendentes: boolean,
    somenteAtrasados = false,
    etapa: string | null = null
  ): void {
    this.filtroEtapa = this.etapaValida(etapa);
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

  private etapaValida(valor: string | null): PontoDisparoAutomacao | null {
    if (!valor) {
      return null;
    }
    return ORDEM_PONTOS_FUNIL.includes(valor as PontoDisparoAutomacao)
      ? (valor as PontoDisparoAutomacao)
      : null;
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

  itensVisiveisPorEtapa(etapa: EtapaCobrancaDiaria): ItemCobrancaDiaria[] {
    if (this.secoesExpandidas.has(etapa.ponto)) {
      return etapa.itens;
    }
    return etapa.itens.slice(0, this.limitePorSecao);
  }

  temMaisItensEtapa(etapa: EtapaCobrancaDiaria): boolean {
    return (
      !this.secoesExpandidas.has(etapa.ponto) &&
      etapa.itens.length > this.limitePorSecao
    );
  }

  expandirSecaoEtapa(ponto: PontoDisparoAutomacao): void {
    this.secoesExpandidas.add(ponto);
  }

  trackByEtapa(_index: number, etapa: EtapaCobrancaDiaria): string {
    return etapa.ponto;
  }

  todosEtapaSelecionados(etapa: EtapaCobrancaDiaria): boolean {
    return (
      etapa.itens.length > 0 &&
      etapa.itens.every((item) => this.selecionados.has(item.mensalidadeId))
    );
  }

  alternarEtapa(etapa: EtapaCobrancaDiaria): void {
    if (this.todosEtapaSelecionados(etapa)) {
      for (const item of etapa.itens) {
        this.selecionados.delete(item.mensalidadeId);
      }
    } else {
      for (const item of etapa.itens) {
        this.selecionados.add(item.mensalidadeId);
      }
    }
    this.selecionados = new Set(this.selecionados);
  }

  classeBadgeEtapa(tipo: TipoCobrancaDiaria): string {
    return tipo === 'ATRASADO'
      ? 'bg-red-600/20 text-red-300'
      : 'bg-amber-600/20 text-amber-200';
  }

  classeVencimentoEtapa(tipo: TipoCobrancaDiaria): string {
    return tipo === 'ATRASADO' ? 'text-red-300' : 'text-amber-300';
  }

  definirFiltroGrupo(filtro: FiltroGrupoCobranca): void {
    this.filtroGrupo = filtro;
  }

  contagemGrupo(filtro: FiltroGrupoCobranca): number {
    if (filtro === 'TODOS') {
      return this.itens.length;
    }

    return this.itens.filter((item) => item.tipo === filtro).length;
  }

  classesChipGrupo(filtro: FiltroGrupoCobranca): string {
    const ativo = this.filtroGrupo === filtro;
    const variantes: Record<FiltroGrupoCobranca, VarianteFilterChip> = {
      TODOS: 'violet',
      ATRASADO: 'red',
      A_VENCER: 'amber',
    };
    return classesFilterChip(ativo, variantes[filtro]);
  }

  classesChipGrupoContagem(filtro: FiltroGrupoCobranca): string {
    const ativo = this.filtroGrupo === filtro;
    const variantes: Record<FiltroGrupoCobranca, VarianteFilterChip> = {
      TODOS: 'violet',
      ATRASADO: 'red',
      A_VENCER: 'amber',
    };
    return classesFilterChipContagem(ativo, variantes[filtro]);
  }

  classesChipPendentes(): string {
    return classesFilterChip(this.filtroSomentePendentes, 'emerald');
  }

  classesChipPendentesContagem(): string {
    return classesFilterChipContagem(this.filtroSomentePendentes, 'emerald');
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

  get qtdSelecionadosPendentes(): number {
    return this.itens.filter(
      (item) =>
        this.selecionados.has(item.mensalidadeId) &&
        !contatoRegistradoHoje(item.ultimoContatoEm)
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
      { titulo: 'Cobrança diária', rotuloAbrir: 'Abrir WhatsApp', exibirMarcarCobrado: true }
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

  marcarPendentesComoCobrado(): void {
    const ids = this.itensElegiveis
      .filter((item) => !contatoRegistradoHoje(item.ultimoContatoEm))
      .map((item) => item.mensalidadeId);

    if (ids.length === 0) {
      void this.toast.warning('Não há clientes pendentes de contato hoje.');
      return;
    }

    this.marcandoCobrados = true;
    this.mensalidadeService.registrarContatos(ids).subscribe({
      next: () => {
        this.atualizarContatosLocais(ids);
        this.marcandoCobrados = false;
      },
      error: () => {
        this.marcandoCobrados = false;
        void this.toast.warning('Não foi possível marcar os pendentes como cobrado.');
      },
    });
  }

  marcarCobradosSelecionados(): void {
    const ids = this.itens
      .filter(
        (item) =>
          this.selecionados.has(item.mensalidadeId) &&
          !contatoRegistradoHoje(item.ultimoContatoEm)
      )
      .map((item) => item.mensalidadeId);

    if (ids.length === 0) {
      void this.toast.warning('Selecione clientes ainda não contactados hoje.');
      return;
    }

    this.marcandoCobrados = true;
    this.mensalidadeService.registrarContatos(ids).subscribe({
      next: () => {
        this.atualizarContatosLocais(ids);
        this.marcandoCobrados = false;
      },
      error: () => {
        this.marcandoCobrados = false;
        void this.toast.warning('Não foi possível marcar os selecionados como cobrado.');
      },
    });
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
  rotuloPonto = rotuloPontoDisparo;
  rotuloTipo = rotuloTipoCobrancaDiaria;
  fmtData = formatarData;
  fmtValor = formatarValor;
  trackByItem = trackByItemCobrancaDiaria;
}
