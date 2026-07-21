import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { RenovacaoMensalidadeService } from '../../core/services/renovacao-mensalidade.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { ToastService } from '../../core/services/toast.service';
import { Configuracao, Cliente, Mensalidade } from '../../core/models';
import { formatarValor } from '../../shared/utils/formatters';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_OPERACAO,
} from '../../shared/utils/page-sync.util';
import {
  CelulaCalendario,
  ClienteCalendarioDia,
  EventoCalendario,
  FiltroTipoCalendario,
  agruparClientesPorDia,
  contagemClientesNoMes,
  contagemEventosNoMes,
  filtrarEventosCalendario,
  montarEventosExpiracao,
  montarEventosMensalidade,
  montarGradeMes,
  rotuloClienteCalendario,
  rotuloDiaSelecionado,
  rotuloMesAno,
  rotulosDiasSemanaCalendario,
} from '../../shared/utils/calendario.util';
import {
  classesFilterChip,
  classesFilterChipContagem,
  VarianteFilterChip,
} from '../../shared/utils/filter-chip.util';

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.page.html',
})
export class CalendarioPage implements OnInit, OnDestroy {
  loading = true;
  clientes: Cliente[] = [];
  mensalidades: Mensalidade[] = [];
  filtroTipo: FiltroTipoCalendario = 'TODOS';
  renovandoMensalidadeId: number | null = null;

  anoVisivel: number;
  mesVisivel: number;
  diaSelecionado: string | null = null;

  readonly diasSemana = rotulosDiasSemanaCalendario();
  readonly opcoesFiltro: { valor: FiltroTipoCalendario; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'EXPIRACAO', rotulo: 'Expirações' },
    { valor: 'MENSALIDADE', rotulo: 'Mensalidades' },
  ];
  readonly trackByCelula = (_: number, celula: CelulaCalendario) =>
    celula.data ?? `vazio-${_}`;
  readonly trackByClienteDia = (_: number, cliente: ClienteCalendarioDia) => cliente.id;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private renovacao: RenovacaoMensalidadeService,
    private sync: DadosSyncService,
    private toast: ToastService
  ) {
    const hoje = new Date();
    this.anoVisivel = hoje.getFullYear();
    this.mesVisivel = hoje.getMonth();
    this.diaSelecionado = null;
  }

  ngOnInit(): void {
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }

    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_OPERACAO,
      () => this.carregar(true)
    );
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar(true);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get tituloMes(): string {
    return rotuloMesAno(this.anoVisivel, this.mesVisivel);
  }

  get eventosFiltrados(): EventoCalendario[] {
    const todos = [
      ...montarEventosExpiracao(this.clientes),
      ...montarEventosMensalidade(this.mensalidades),
    ];
    return filtrarEventosCalendario(todos, this.filtroTipo);
  }

  get clientesPorDia(): Map<string, ClienteCalendarioDia[]> {
    return agruparClientesPorDia(this.eventosFiltrados);
  }

  get gradeMes(): CelulaCalendario[] {
    return montarGradeMes(this.anoVisivel, this.mesVisivel, this.clientesPorDia);
  }

  get resumoMes(): { expiracoes: number; mensalidades: number; clientes: number } {
    const todos = [
      ...montarEventosExpiracao(this.clientes),
      ...montarEventosMensalidade(this.mensalidades),
    ];
    const contagem = contagemEventosNoMes(todos, this.anoVisivel, this.mesVisivel);
    return {
      ...contagem,
      clientes: contagemClientesNoMes(
        agruparClientesPorDia(todos),
        this.anoVisivel,
        this.mesVisivel
      ),
    };
  }

  get clientesDiaSelecionado(): ClienteCalendarioDia[] {
    if (!this.diaSelecionado) return [];
    return this.clientesPorDia.get(this.diaSelecionado) ?? [];
  }

  get rotuloDiaSelecionado(): string {
    if (!this.diaSelecionado) return '';
    return rotuloDiaSelecionado(this.diaSelecionado);
  }

  contagemFiltro(filtro: FiltroTipoCalendario): number {
    const todos = [
      ...montarEventosExpiracao(this.clientes),
      ...montarEventosMensalidade(this.mensalidades),
    ];
    const agrupados = agruparClientesPorDia(filtrarEventosCalendario(todos, filtro));
    let total = 0;
    for (const [data, clientes] of agrupados.entries()) {
      const parsed = new Date(`${data}T12:00:00`);
      if (
        parsed.getFullYear() === this.anoVisivel &&
        parsed.getMonth() === this.mesVisivel
      ) {
        total += clientes.length;
      }
    }
    return total;
  }

  classesChipTipo(filtro: FiltroTipoCalendario): string {
    const variantes: Record<FiltroTipoCalendario, VarianteFilterChip> = {
      TODOS: 'violet',
      EXPIRACAO: 'amber',
      MENSALIDADE: 'emerald',
    };
    return classesFilterChip(this.filtroTipo === filtro, variantes[filtro]);
  }

  classesChipContagem(filtro: FiltroTipoCalendario): string {
    const variantes: Record<FiltroTipoCalendario, VarianteFilterChip> = {
      TODOS: 'violet',
      EXPIRACAO: 'amber',
      MENSALIDADE: 'emerald',
    };
    return classesFilterChipContagem(this.filtroTipo === filtro, variantes[filtro]);
  }

  definirFiltro(filtro: FiltroTipoCalendario): void {
    this.filtroTipo = filtro;
  }

  mesAnterior(): void {
    if (this.mesVisivel === 0) {
      this.mesVisivel = 11;
      this.anoVisivel--;
    } else {
      this.mesVisivel--;
    }
    this.diaSelecionado = null;
  }

  mesProximo(): void {
    if (this.mesVisivel === 11) {
      this.mesVisivel = 0;
      this.anoVisivel++;
    } else {
      this.mesVisivel++;
    }
    this.diaSelecionado = null;
  }

  irParaHoje(): void {
    const hoje = new Date();
    this.anoVisivel = hoje.getFullYear();
    this.mesVisivel = hoje.getMonth();
    this.selecionarDia(this.formatarChave(hoje));
  }

  selecionarDia(data: string | null): void {
    if (!data) return;
    this.diaSelecionado = data;
  }

  classeCelula(celula: CelulaCalendario): Record<string, boolean> {
    const selecionada = !!celula.data && celula.data === this.diaSelecionado;
    return {
      'crm-calendar-day--muted': !celula.mesAtual,
      'crm-calendar-day--hoje': celula.hoje,
      'crm-calendar-day--selected': selecionada,
      'crm-calendar-day--com-eventos': celula.clientes.length > 0,
    };
  }

  celulaTemExpiracao(celula: CelulaCalendario): boolean {
    return celula.clientes.some((cliente) => cliente.temExpiracao);
  }

  celulaTemMensalidade(celula: CelulaCalendario): boolean {
    return celula.clientes.some((cliente) => cliente.temMensalidade);
  }

  classeUrgenciaCliente(cliente: ClienteCalendarioDia): string {
    if (cliente.urgencia === 'ATRASADO') {
      return cliente.temMensalidade ? 'crm-badge-atrasado' : 'crm-badge-inativo';
    }
    if (cliente.urgencia === 'HOJE') return 'crm-badge-pendente';
    return 'crm-badge-neutral';
  }

  rotuloResumoCliente = rotuloClienteCalendario;

  podeRenovar(cliente: ClienteCalendarioDia): boolean {
    return !!cliente.mensalidadeId;
  }

  async renovar(cliente: ClienteCalendarioDia): Promise<void> {
    if (!cliente.mensalidadeId || this.renovandoMensalidadeId !== null) {
      return;
    }

    const mensalidadeId = cliente.mensalidadeId;
    this.renovandoMensalidadeId = mensalidadeId;

    if (cliente.cortesia) {
      const ok = await this.renovacao.registrarRenovacaoCortesia({
        mensalidadeId,
        clienteId: cliente.clienteId,
        telefone: cliente.telefone,
        nome: cliente.clienteNome,
        referencia: cliente.referenciaMensalidade,
        nomePlanoAtual: cliente.planoNome,
      });
      this.renovandoMensalidadeId = null;
      if (ok) this.carregar(true);
      return;
    }

    const ok = await this.renovacao.registrarRenovacao({
      mensalidadeId,
      clienteId: cliente.clienteId,
      telefone: cliente.telefone,
      nome: cliente.clienteNome,
      referencia: cliente.referenciaMensalidade ?? '',
      valorFallback: cliente.valorMensalidade ?? 0,
      nomePlanoAtual: cliente.planoNome,
    });
    this.renovandoMensalidadeId = null;
    if (ok) this.carregar(true);
  }

  fmtValor = formatarValor;

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  private carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    forkJoin([
      this.clienteService.listar(),
      this.mensalidadeService.listar(),
    ]).subscribe({
      next: ([clientes, mensalidades]) => {
        this.clientes = clientes;
        this.mensalidades = mensalidades;
        this.loading = false;

        if (!this.diaSelecionado) {
          this.irParaHoje();
        }
      },
      error: () => {
        this.loading = false;
        if (!silencioso) {
          void this.toast.error('Erro ao carregar o calendário.');
        }
      },
    });
  }

  private formatarChave(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
