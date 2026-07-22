import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { Cliente, Aplicativo, ImportacaoClientesResultado, Configuracao } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { resolverStatusCliente, StatusCliente, formatarData } from '../../shared/utils/formatters';
import { oferecerOnboardingCompleto } from '../../shared/utils/onboarding';
import {
  clienteCadastroIncompleto,
  clienteTemPendenciaCadastro,
  iconePendenciaCadastro,
  pendenciasGerenciadasDoCliente,
  resolverFiltroCadastro,
  rotuloCurtoPendencia,
  rotuloFiltroCadastro,
  severidadePendencia,
  TipoPendenciaCadastro,
} from '../../shared/utils/cliente-cadastro-audit';
import { PullRefreshService } from '../../core/services/pull-refresh.service';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_CATALOGO,
} from '../../shared/utils/page-sync.util';
import { StatusBadgeTipo } from '../../components/status-badge/status-badge.component';
import { lerSessionJson, salvarSessionJson } from '../../shared/utils/session-persist.util';

const CHAVE_DENSIDADE_CLIENTES = 'crm.clientes.tabelaCompacta';
import { exportarClientesCsv } from '../../shared/utils/cliente-export';
import { formatarTelefoneExibicao } from '../../shared/utils/telefone.util';
import { clienteParticipaCobrancas, clienteEhCortesia, clienteEhSomenteContato } from '../../shared/utils/cobranca-diaria';
import {
  classesFilterChip,
  classesFilterChipContagem,
  VarianteFilterChip,
} from '../../shared/utils/filter-chip.util';
import {
  limparFiltrosClientesPersistidos,
  persistirFiltrosClientes,
  restaurarFiltrosClientes,
} from '../../shared/utils/clientes-filtros-persist.util';
import { CobrancaLoteFilaService } from '../../core/services/cobranca-lote-fila.service';
import {
  clienteElegivelCobranca,
  montarItensCobrancaClientes,
} from '../../shared/utils/cliente-cobranca.util';

export type FiltroStatusCliente = 'TODOS' | StatusCliente;
export type FiltroCobrancaCliente =
  | 'TODOS'
  | 'COM_COBRANCA'
  | 'SEM_COBRANCA'
  | 'SOMENTE_CONTATO';
export type ColunaOrdenacaoCliente = 'nome' | 'aplicativo' | 'vencimento' | 'status';
export type DirecaoOrdenacao = 'asc' | 'desc';
export type ModoOrdenacaoAplicativo = 'az' | 'za' | 'sem_primeiro' | 'sem_ultimo';
export type ModoOrdenacaoStatus =
  | 'atrasado_primeiro'
  | 'ativo_primeiro'
  | 'inativo_primeiro';

const MODOS_APLICATIVO: ModoOrdenacaoAplicativo[] = [
  'az',
  'za',
  'sem_primeiro',
  'sem_ultimo',
];

const MODOS_STATUS: ModoOrdenacaoStatus[] = [
  'atrasado_primeiro',
  'ativo_primeiro',
  'inativo_primeiro',
];

interface OpcaoFiltroCatalogo {
  id: number;
  nome: string;
}

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
})
export class ClientesPage implements OnInit, OnDestroy {
  clientes: Cliente[] = [];
  loading = true;
  importando = false;
  importarComoSomenteContato = true;
  private readonly destroy$ = new Subject<void>();
  busca = '';
  filtroStatus: FiltroStatusCliente = 'TODOS';
  filtroAplicativoId: number | null = null;
  filtroPlanoId: number | null = null;
  filtroCadastro: TipoPendenciaCadastro | null = null;
  filtroCobranca: FiltroCobrancaCliente = 'TODOS';
  filtroCadastroIncompleto = false;
  pagina = 1;
  readonly porPagina = 10;
  menuAcoesAberto = false;
  ordenacaoColuna: ColunaOrdenacaoCliente = 'vencimento';
  ordenacaoDirecao: DirecaoOrdenacao = 'asc';
  modoOrdenacaoAplicativo: ModoOrdenacaoAplicativo = 'az';
  modoOrdenacaoStatus: ModoOrdenacaoStatus = 'atrasado_primeiro';
  opcoesAplicativos: OpcaoFiltroCatalogo[] = [];
  opcoesPlanos: OpcaoFiltroCatalogo[] = [];
  aplicativos: Aplicativo[] = [];
  tabelaCompacta = false;
  filtrosExtrasAbertos = false;
  selecionados = new Set<number>();
  cobrandoLote = false;

  readonly opcoesFiltroStatus: { valor: FiltroStatusCliente; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'ATIVO', rotulo: 'Ativos' },
    { valor: 'ATRASADO', rotulo: 'Atrasados' },
    { valor: 'INATIVO', rotulo: 'Inativos' },
  ];

  readonly opcoesFiltroCobranca: {
    valor: FiltroCobrancaCliente;
    rotulo: string;
  }[] = [
    { valor: 'TODOS', rotulo: 'Todas cobranças' },
    { valor: 'COM_COBRANCA', rotulo: 'Com cobrança' },
    { valor: 'SEM_COBRANCA', rotulo: 'Sem cobrança' },
    { valor: 'SOMENTE_CONTATO', rotulo: 'Somente contato' },
  ];

  definirFiltroCobranca(filtro: FiltroCobrancaCliente): void {
    this.filtroCobranca = filtro;
    this.pagina = 1;
    this.persistirFiltros();
  }

  alternarFiltroCadastroIncompleto(): void {
    this.filtroCadastroIncompleto = !this.filtroCadastroIncompleto;
    this.pagina = 1;
    this.persistirFiltros();
  }

  contagemCobranca(filtro: FiltroCobrancaCliente): number {
    if (filtro === 'TODOS') {
      return this.clientes.length;
    }

    if (filtro === 'COM_COBRANCA') {
      return this.clientes.filter((c) => clienteParticipaCobrancas(c)).length;
    }

    if (filtro === 'SOMENTE_CONTATO') {
      return this.clientes.filter((c) => clienteEhSomenteContato(c)).length;
    }

    return this.clientes.filter(
      (c) => !clienteParticipaCobrancas(c) && !clienteEhSomenteContato(c)
    ).length;
  }

  contagemCadastroIncompleto(): number {
    return this.clientes.filter((c) =>
      clienteCadastroIncompleto(c, this.aplicativos)
    ).length;
  }

  classesChipCobranca(filtro: FiltroCobrancaCliente): string {
    const ativo = this.filtroCobranca === filtro;
    const variantes: Record<FiltroCobrancaCliente, VarianteFilterChip> = {
      TODOS: 'violet',
      COM_COBRANCA: 'violet',
      SEM_COBRANCA: 'amber',
      SOMENTE_CONTATO: 'sky',
    };
    return classesFilterChip(ativo, variantes[filtro]);
  }

  classesChipContagemCobranca(filtro: FiltroCobrancaCliente): string {
    const ativo = this.filtroCobranca === filtro;
    const variantes: Record<FiltroCobrancaCliente, VarianteFilterChip> = {
      TODOS: 'violet',
      COM_COBRANCA: 'violet',
      SEM_COBRANCA: 'amber',
      SOMENTE_CONTATO: 'sky',
    };
    return classesFilterChipContagem(ativo, variantes[filtro]);
  }

  fecharMenuAcoes(): void {
    this.menuAcoesAberto = false;
  }

  toggleMenuAcoes(): void {
    this.menuAcoesAberto = !this.menuAcoesAberto;
  }

  definirFiltroStatus(filtro: FiltroStatusCliente): void {
    this.filtroStatus = filtro;
    this.pagina = 1;
    this.persistirFiltros();
  }

  contagemStatus(filtro: FiltroStatusCliente): number {
    if (filtro === 'TODOS') {
      return this.clientes.length;
    }

    return this.clientes.filter((c) => this.status(c) === filtro).length;
  }

  get temFiltrosAtivos(): boolean {
    return (
      this.busca.trim().length > 0 ||
      this.filtroStatus !== 'TODOS' ||
      this.filtroAplicativoId !== null ||
      this.filtroPlanoId !== null ||
      this.filtroCadastro !== null ||
      this.filtroCobranca !== 'TODOS' ||
      this.filtroCadastroIncompleto
    );
  }

  get qtdFiltrosExtrasAtivos(): number {
    let total = 0;
    if (this.filtroAplicativoId !== null) total += 1;
    if (this.filtroPlanoId !== null) total += 1;
    if (this.filtroCobranca !== 'TODOS') total += 1;
    if (this.filtroCadastroIncompleto) total += 1;
    return total;
  }

  alternarFiltrosExtras(): void {
    this.filtrosExtrasAbertos = !this.filtrosExtrasAbertos;
  }

  get rotuloFiltroCadastroAtivo(): string {
    return this.filtroCadastro
      ? rotuloFiltroCadastro(this.filtroCadastro)
      : '';
  }

  limparFiltroCadastro(): void {
    this.filtroCadastro = null;
    this.filtroCadastroIncompleto = false;
    this.pagina = 1;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cadastro: null, incompleto: null },
      queryParamsHandling: 'merge',
    });
    this.persistirFiltros();
  }

  limparFiltros(): void {
    this.busca = '';
    this.filtroStatus = 'TODOS';
    this.filtroAplicativoId = null;
    this.filtroPlanoId = null;
    this.filtroCadastro = null;
    this.filtroCobranca = 'TODOS';
    this.filtroCadastroIncompleto = false;
    this.pagina = 1;
    limparFiltrosClientesPersistidos();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cadastro: null, status: null, incompleto: null },
      queryParamsHandling: 'merge',
    });
  }

  aoAlterarBusca(): void {
    this.pagina = 1;
    this.persistirFiltros();
  }

  aoAlterarFiltroCatalogo(): void {
    this.pagina = 1;
    this.persistirFiltros();
  }

  irPaginaAnterior(): void {
    if (this.pagina <= 1) {
      return;
    }

    this.pagina -= 1;
    this.persistirFiltros();
  }

  irPaginaProxima(): void {
    if (this.pagina >= this.totalPaginas) {
      return;
    }

    this.pagina += 1;
    this.persistirFiltros();
  }

  classesChipStatus(filtro: FiltroStatusCliente): string {
    const ativo = this.filtroStatus === filtro;
    const variantes: Record<FiltroStatusCliente, VarianteFilterChip> = {
      TODOS: 'violet',
      ATIVO: 'emerald',
      ATRASADO: 'amber',
      INATIVO: 'red',
    };
    return classesFilterChip(ativo, variantes[filtro]);
  }

  classesChipContagem(filtro: FiltroStatusCliente): string {
    const ativo = this.filtroStatus === filtro;
    const variantes: Record<FiltroStatusCliente, VarianteFilterChip> = {
      TODOS: 'violet',
      ATIVO: 'emerald',
      ATRASADO: 'amber',
      INATIVO: 'red',
    };
    return classesFilterChipContagem(ativo, variantes[filtro]);
  }

  classesFilterChipCadastroIncompleto(): string {
    return classesFilterChip(this.filtroCadastroIncompleto, 'amber');
  }

  classesFilterChipContagemCadastroIncompleto(): string {
    return classesFilterChipContagem(this.filtroCadastroIncompleto, 'amber');
  }

  constructor(
    private clienteService: ClienteService,
    private aplicativoService: AplicativoService,
    private configuracaoService: ConfiguracaoService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    private confirmacao: ConfirmacaoService,
    private sync: DadosSyncService,
    private pullRefresh: PullRefreshService,
    private cobrancaLoteFila: CobrancaLoteFilaService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  ngOnInit(): void {
    this.tabelaCompacta =
      lerSessionJson<boolean>(CHAVE_DENSIDADE_CLIENTES) === true;

    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }
    this.aplicativoService.listar().subscribe({
      next: (apps) => (this.aplicativos = apps),
    });

    this.route.queryParamMap.subscribe((params) => {
      const temParamsNavegacao =
        params.has('status') ||
        params.has('cadastro') ||
        params.has('incompleto') ||
        params.has('cobranca');

      if (temParamsNavegacao) {
        if (params.has('status')) {
          const status = params.get('status');
          this.filtroStatus =
            status === 'ATIVO' || status === 'ATRASADO' || status === 'INATIVO'
              ? status
              : 'TODOS';
        }

        if (params.has('cobranca')) {
          const cobranca = params.get('cobranca');
          this.filtroCobranca =
            cobranca === 'COM_COBRANCA' ||
            cobranca === 'SEM_COBRANCA' ||
            cobranca === 'SOMENTE_CONTATO'
              ? cobranca
              : 'TODOS';
        }

        this.filtroCadastro = params.has('cadastro')
          ? resolverFiltroCadastro(params.get('cadastro'))
          : null;
        this.filtroCadastroIncompleto =
          params.has('incompleto') && params.get('incompleto') === '1';
        this.pagina = 1;
      } else {
        this.aplicarFiltrosPersistidos();
        this.filtroCadastro = null;
        this.filtroCadastroIncompleto = false;
      }

      this.sincronizarFiltrosExtrasAbertos();
      this.persistirFiltros();
    });
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_CATALOGO,
      () => {
        this.carregar(true);
        this.aplicativoService.listar().subscribe({
          next: (apps) => (this.aplicativos = apps),
        });
      }
    );
    this.pullRefresh.registrar((concluir) => this.carregar(true, concluir));
  }

  ngOnDestroy(): void {
    this.persistirFiltros();
    this.pullRefresh.limpar();
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillLeave(): void {
    this.persistirFiltros();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar(true);
    }
  }

  get clientesFiltrados(): Cliente[] {
    const termo = this.busca.toLowerCase().trim();

    const filtrados = this.clientes.filter((c) => {
      const matchBusca =
        !termo ||
        c.nome.toLowerCase().includes(termo) ||
        c.telefone.includes(termo);

      const matchStatus =
        this.filtroStatus === 'TODOS' || this.status(c) === this.filtroStatus;

      const matchAplicativo =
        this.filtroAplicativoId === null ||
        c.aplicativoId === this.filtroAplicativoId;

      const matchPlano =
        this.filtroPlanoId === null || c.planoId === this.filtroPlanoId;

      const matchCadastro =
        !this.filtroCadastro ||
        clienteTemPendenciaCadastro(c, this.filtroCadastro, this.aplicativos);

      const matchCobranca =
        this.filtroCobranca === 'TODOS' ||
        (this.filtroCobranca === 'COM_COBRANCA' &&
          clienteParticipaCobrancas(c)) ||
        (this.filtroCobranca === 'SEM_COBRANCA' &&
          !clienteParticipaCobrancas(c) &&
          !clienteEhSomenteContato(c)) ||
        (this.filtroCobranca === 'SOMENTE_CONTATO' &&
          clienteEhSomenteContato(c));

      const matchIncompleto =
        !this.filtroCadastroIncompleto ||
        clienteCadastroIncompleto(c, this.aplicativos);

      return (
        matchBusca &&
        matchStatus &&
        matchAplicativo &&
        matchPlano &&
        matchCadastro &&
        matchCobranca &&
        matchIncompleto
      );
    });

    return filtrados.sort((a, b) => this.compararClientes(a, b));
  }

  alternarOrdenacao(coluna: ColunaOrdenacaoCliente): void {
    if (this.ordenacaoColuna === coluna) {
      if (coluna === 'aplicativo') {
        this.modoOrdenacaoAplicativo = this.proximoModo(
          this.modoOrdenacaoAplicativo,
          MODOS_APLICATIVO
        );
      } else if (coluna === 'status') {
        this.modoOrdenacaoStatus = this.proximoModo(
          this.modoOrdenacaoStatus,
          MODOS_STATUS
        );
      } else {
        this.ordenacaoDirecao = this.ordenacaoDirecao === 'asc' ? 'desc' : 'asc';
      }
    } else {
      this.ordenacaoColuna = coluna;

      if (coluna === 'nome' || coluna === 'vencimento') {
        this.ordenacaoDirecao = 'asc';
      }

      if (coluna === 'aplicativo') {
        this.modoOrdenacaoAplicativo = 'az';
      }

      if (coluna === 'status') {
        this.modoOrdenacaoStatus = 'atrasado_primeiro';
      }
    }

    this.pagina = 1;
    this.persistirFiltros();
  }

  private aplicarFiltrosPersistidos(): void {
    const salvo = restaurarFiltrosClientes();
    if (!salvo) {
      return;
    }

    this.busca = salvo.busca;
    this.filtroStatus = salvo.filtroStatus;
    this.filtroAplicativoId = salvo.filtroAplicativoId;
    this.filtroPlanoId = salvo.filtroPlanoId;
    this.filtroCobranca = salvo.filtroCobranca;
    this.pagina = salvo.pagina;
    this.ordenacaoColuna = salvo.ordenacaoColuna;
    this.ordenacaoDirecao = salvo.ordenacaoDirecao;
    this.modoOrdenacaoAplicativo = salvo.modoOrdenacaoAplicativo;
    this.modoOrdenacaoStatus = salvo.modoOrdenacaoStatus;
  }

  private persistirFiltros(): void {
    persistirFiltrosClientes({
      busca: this.busca,
      filtroStatus: this.filtroStatus,
      filtroAplicativoId: this.filtroAplicativoId,
      filtroPlanoId: this.filtroPlanoId,
      filtroCobranca: this.filtroCobranca,
      pagina: this.pagina,
      ordenacaoColuna: this.ordenacaoColuna,
      ordenacaoDirecao: this.ordenacaoDirecao,
      modoOrdenacaoAplicativo: this.modoOrdenacaoAplicativo,
      modoOrdenacaoStatus: this.modoOrdenacaoStatus,
    });
  }

  private sincronizarFiltrosExtrasAbertos(): void {
    if (this.qtdFiltrosExtrasAtivos > 0) {
      this.filtrosExtrasAbertos = true;
    }
  }

  rotuloModoOrdenacao(coluna: ColunaOrdenacaoCliente): string {
    if (coluna === 'nome') {
      return this.ordenacaoColuna === 'nome'
        ? `Nome · ${this.ordenacaoDirecao === 'asc' ? 'A→Z' : 'Z→A'}`
        : 'Ordenar por nome';
    }

    if (coluna === 'vencimento') {
      return this.ordenacaoColuna === 'vencimento'
        ? `Vencimento · ${this.ordenacaoDirecao === 'asc' ? 'mais próximo' : 'mais distante'}`
        : 'Ordenar por vencimento';
    }

    if (coluna === 'aplicativo') {
      const rotulos: Record<ModoOrdenacaoAplicativo, string> = {
        az: 'A→Z',
        za: 'Z→A',
        sem_primeiro: 'Sem app primeiro',
        sem_ultimo: 'Sem app por último',
      };
      return `Aplicativo · ${rotulos[this.modoOrdenacaoAplicativo]}`;
    }

    const rotulos: Record<ModoOrdenacaoStatus, string> = {
      atrasado_primeiro: 'Atrasados primeiro',
      ativo_primeiro: 'Ativos primeiro',
      inativo_primeiro: 'Inativos primeiro',
    };
    return `Status · ${rotulos[this.modoOrdenacaoStatus]}`;
  }

  rotuloModoOrdenacaoCurto(coluna: ColunaOrdenacaoCliente): string {
    if (this.ordenacaoColuna !== coluna) {
      return '';
    }

    if (coluna === 'aplicativo') {
      const rotulos: Record<ModoOrdenacaoAplicativo, string> = {
        az: 'A→Z',
        za: 'Z→A',
        sem_primeiro: '∅↑',
        sem_ultimo: '∅↓',
      };
      return rotulos[this.modoOrdenacaoAplicativo];
    }

    if (coluna === 'status') {
      const rotulos: Record<ModoOrdenacaoStatus, string> = {
        atrasado_primeiro: 'Atr.',
        ativo_primeiro: 'Atv.',
        inativo_primeiro: 'Ina.',
      };
      return rotulos[this.modoOrdenacaoStatus];
    }

    return this.ordenacaoDirecao === 'asc' ? '↑' : '↓';
  }

  colunaOrdenacaoAtiva(coluna: ColunaOrdenacaoCliente): boolean {
    return this.ordenacaoColuna === coluna;
  }

  iconeOrdenacao(coluna: ColunaOrdenacaoCliente): string {
    if (this.ordenacaoColuna !== coluna) {
      return 'swap-vertical-outline';
    }

    if (coluna === 'aplicativo' || coluna === 'status') {
      return 'options-outline';
    }

    return this.ordenacaoDirecao === 'asc'
      ? 'arrow-up-outline'
      : 'arrow-down-outline';
  }

  private proximoModo<T extends string>(atual: T, opcoes: readonly T[]): T {
    const indice = opcoes.indexOf(atual);
    return opcoes[(indice + 1) % opcoes.length];
  }

  private compararClientes(a: Cliente, b: Cliente): number {
    let result = 0;

    switch (this.ordenacaoColuna) {
      case 'nome':
        result = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        return result * (this.ordenacaoDirecao === 'asc' ? 1 : -1);
      case 'aplicativo':
        result = this.compararPorAplicativo(a, b);
        break;
      case 'vencimento': {
        const tsA = a.expiraEm
          ? new Date(a.expiraEm).getTime()
          : Number.MAX_SAFE_INTEGER;
        const tsB = b.expiraEm
          ? new Date(b.expiraEm).getTime()
          : Number.MAX_SAFE_INTEGER;
        result = tsA - tsB;
        return result * (this.ordenacaoDirecao === 'asc' ? 1 : -1);
      }
      case 'status':
        result =
          this.prioridadeStatusPorModo(this.status(a)) -
          this.prioridadeStatusPorModo(this.status(b));
        break;
    }

    if (result === 0) {
      result = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }

    return result;
  }

  private compararPorAplicativo(a: Cliente, b: Cliente): number {
    const nomeA = a.aplicativo?.nome ?? '';
    const nomeB = b.aplicativo?.nome ?? '';
    const semA = !a.aplicativoId || !nomeA;
    const semB = !b.aplicativoId || !nomeB;

    switch (this.modoOrdenacaoAplicativo) {
      case 'sem_primeiro':
        if (semA !== semB) {
          return semA ? -1 : 1;
        }
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      case 'sem_ultimo':
        if (semA !== semB) {
          return semA ? 1 : -1;
        }
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      case 'za':
        return nomeB.localeCompare(nomeA, 'pt-BR', { sensitivity: 'base' });
      case 'az':
      default:
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
    }
  }

  private prioridadeStatusPorModo(status: StatusCliente): number {
    switch (this.modoOrdenacaoStatus) {
      case 'ativo_primeiro':
        return status === 'ATIVO' ? 0 : status === 'ATRASADO' ? 1 : 2;
      case 'inativo_primeiro':
        return status === 'INATIVO' ? 0 : status === 'ATRASADO' ? 1 : 2;
      case 'atrasado_primeiro':
      default:
        return status === 'ATRASADO' ? 0 : status === 'ATIVO' ? 1 : 2;
    }
  }

  get clientesPaginados(): Cliente[] {
    const inicio = (this.pagina - 1) * this.porPagina;
    return this.clientesFiltrados.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.clientesFiltrados.length / this.porPagina));
  }

  carregar(silencioso = false, aoConcluir?: () => void): void {
    if (!silencioso) {
      this.loading = true;
    }

    this.clienteService.listar().subscribe({
      next: (data) => {
        this.clientes = data;
        this.atualizarOpcoesCatalogo(data);
        this.loading = false;
        aoConcluir?.();
      },
      error: () => {
        this.loading = false;
        aoConcluir?.();
        if (!silencioso) {
          void this.toast.error('Erro ao carregar clientes.');
        }
      },
    });
  }

  trackByClienteId(_index: number, cliente: Cliente): number {
    return cliente.id;
  }

  private atualizarOpcoesCatalogo(clientes: Cliente[]): void {
    const apps = new Map<number, string>();
    const planos = new Map<number, string>();

    for (const cliente of clientes) {
      if (cliente.aplicativoId && cliente.aplicativo?.nome) {
        apps.set(cliente.aplicativoId, cliente.aplicativo.nome);
      }
      if (cliente.planoId && cliente.plano?.nome) {
        planos.set(cliente.planoId, cliente.plano.nome);
      }
    }

    this.opcoesAplicativos = [...apps.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    this.opcoesPlanos = [...planos.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async novoCliente(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoClienteModalComponent,
      cssClass: 'crm-modal crm-modal-cliente',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.carregar();
      if (data.novo && data.cliente) {
        await oferecerOnboardingCompleto(
          data.cliente as Cliente,
          this.configuracaoService.getSnapshot(),
          this.aplicativos
        );
      }
    }
  }

  async editar(cliente: Cliente): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoClienteModalComponent,
      componentProps: { cliente },
      cssClass: 'crm-modal crm-modal-cliente',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
  }

  verDetalhes(id: number): void {
    this.router.navigate(['/clientes', id]);
  }

  async excluir(cliente: Cliente): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      header: 'Excluir cliente',
      message: `Excluir o cliente ${cliente.nome}?`,
      confirmText: 'Excluir',
    });
    if (!confirmado) return;

    this.clienteService.excluir(cliente.id).subscribe({
      next: () => this.carregar(),
      error: (err) => void this.toast.error(err.message),
    });
  }

  status(cliente: Cliente): StatusCliente {
    return resolverStatusCliente(cliente);
  }

  tipoBadge(cliente: Cliente): StatusBadgeTipo {
    return this.status(cliente);
  }

  alternarDensidadeTabela(): void {
    this.tabelaCompacta = !this.tabelaCompacta;
    salvarSessionJson(CHAVE_DENSIDADE_CLIENTES, this.tabelaCompacta);
  }

  get classesTabela(): string {
    return this.tabelaCompacta ? 'crm-table crm-table--compact' : 'crm-table';
  }

  pendenciasCliente(cliente: Cliente): TipoPendenciaCadastro[] {
    return pendenciasGerenciadasDoCliente(cliente, this.aplicativos);
  }

  pendenciaEmDestaque(tipo: TipoPendenciaCadastro): boolean {
    return !this.filtroCadastro || this.filtroCadastro === tipo;
  }

  rotuloPendencia = rotuloFiltroCadastro;
  rotuloPendenciaCurto = rotuloCurtoPendencia;
  iconePendencia = iconePendenciaCadastro;

  classesChipPendencia(tipo: TipoPendenciaCadastro): Record<string, boolean> {
    const critica = severidadePendencia(tipo) === 'critica';
    const destaque = this.pendenciaEmDestaque(tipo);

    if (!destaque) {
      return {
        'border-slate-700': true,
        'bg-slate-800/40': true,
        'text-slate-500': true,
      };
    }

    if (critica) {
      return {
        'border-red-500/60': true,
        'bg-red-600/15': true,
        'text-red-200': true,
        'ring-1': true,
        'ring-red-500/30': true,
      };
    }

    return {
      'border-amber-500/60': true,
      'bg-amber-600/15': true,
      'text-amber-200': true,
      'ring-1': true,
      'ring-amber-500/30': true,
    };
  }

  fmtData = formatarData;
  fmtTelefone = formatarTelefoneExibicao;

  participaCobrancas = clienteParticipaCobrancas;
  ehCortesia = clienteEhCortesia;
  ehSomenteContato = clienteEhSomenteContato;

  get qtdSelecionados(): number {
    return this.selecionados.size;
  }

  get exibirBarraCobranca(): boolean {
    return (
      this.filtroStatus === 'ATRASADO' ||
      this.filtroStatus === 'INATIVO' ||
      this.qtdSelecionados > 0
    );
  }

  clienteSelecionado(cliente: Cliente): boolean {
    return this.selecionados.has(cliente.id);
  }

  alternarSelecaoCliente(cliente: Cliente): void {
    if (!clienteElegivelCobranca(cliente)) {
      return;
    }

    if (this.selecionados.has(cliente.id)) {
      this.selecionados.delete(cliente.id);
    } else {
      this.selecionados.add(cliente.id);
    }
    this.selecionados = new Set(this.selecionados);
  }

  get todosFiltradosSelecionados(): boolean {
    const elegiveis = this.clientesFiltrados.filter((cliente) =>
      clienteElegivelCobranca(cliente)
    );
    return (
      elegiveis.length > 0 &&
      elegiveis.every((cliente) => this.selecionados.has(cliente.id))
    );
  }

  get todosPaginaSelecionados(): boolean {
    const elegiveis = this.clientesPaginados.filter((cliente) =>
      clienteElegivelCobranca(cliente)
    );
    return (
      elegiveis.length > 0 &&
      elegiveis.every((cliente) => this.selecionados.has(cliente.id))
    );
  }

  alternarTodosFiltrados(): void {
    if (this.todosFiltradosSelecionados) {
      this.selecionados = new Set();
      return;
    }

    this.selecionados = new Set(
      this.clientesFiltrados
        .filter((cliente) => clienteElegivelCobranca(cliente))
        .map((cliente) => cliente.id)
    );
  }

  alternarPagina(): void {
    const elegiveis = this.clientesPaginados.filter((cliente) =>
      clienteElegivelCobranca(cliente)
    );

    if (this.todosPaginaSelecionados) {
      for (const cliente of elegiveis) {
        this.selecionados.delete(cliente.id);
      }
    } else {
      for (const cliente of elegiveis) {
        this.selecionados.add(cliente.id);
      }
    }

    this.selecionados = new Set(this.selecionados);
  }

  selecionarAtrasados(): void {
    this.filtroStatus = 'ATRASADO';
    this.pagina = 1;
    this.persistirFiltros();
    this.selecionados = new Set(
      this.clientesFiltrados
        .filter((cliente) => clienteElegivelCobranca(cliente))
        .map((cliente) => cliente.id)
    );
  }

  limparSelecao(): void {
    this.selecionados = new Set();
  }

  async cobrarSelecionados(): Promise<void> {
    if (this.cobrandoLote || this.selecionados.size === 0) {
      return;
    }

    this.cobrandoLote = true;

    try {
      const itens = montarItensCobrancaClientes(
        this.clientesFiltrados,
        this.selecionados,
        this.configuracao
      );

      if (itens.length === 0) {
        void this.toast.warning(
          'Nenhum cliente selecionado possui dados para cobrança.'
        );
        return;
      }

      await this.cobrancaLoteFila.executar(itens, {
        titulo: 'Cobrança · Clientes',
        rotuloAbrir: 'Abrir WhatsApp',
      });
    } finally {
      this.cobrandoLote = false;
    }
  }

  podeSelecionarCliente(cliente: Cliente): boolean {
    return clienteElegivelCobranca(cliente);
  }

  abrirImportacaoCsv(input: HTMLInputElement): void {
    if (this.importando) {
      return;
    }

    input.value = '';
    input.click();
  }

  baixarModeloCsv(): void {
    const conteudo = 'nome,telefone\nJoão Silva,(62) 99999-1234\n';
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-clientes.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  exportarClientes(): void {
    if (this.clientesFiltrados.length === 0) {
      void this.toast.warning('Nenhum cliente para exportar com os filtros atuais.');
      return;
    }

    exportarClientesCsv(this.clientesFiltrados);
    void this.toast.success(`${this.clientesFiltrados.length} cliente(s) exportado(s).`);
  }

  async onArquivoCsvSelecionado(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    this.importando = true;

    try {
      const csv = await arquivo.text();
      this.clienteService
        .importarCsv(csv, this.importarComoSomenteContato)
        .subscribe({
        next: (resultado) => {
          this.importando = false;
          this.carregar();
          void this.mostrarResultadoImportacao(resultado);
        },
        error: (err) => {
          this.importando = false;
          void this.toast.error(err.message);
        },
      });
    } catch {
      this.importando = false;
      void this.toast.error('Não foi possível ler o arquivo.');
    }
  }

  private async mostrarResultadoImportacao(
    resultado: ImportacaoClientesResultado
  ): Promise<void> {
    const partes = [
      `${resultado.importados} importado(s)`,
      resultado.ignorados > 0
        ? `${resultado.ignorados} ignorado(s) (telefone duplicado)`
        : null,
      resultado.erros.length > 0
        ? `${resultado.erros.length} linha(s) com erro`
        : null,
    ].filter(Boolean);

    if (resultado.importados > 0) {
      void this.toast.success(partes.join(' · '));
    } else if (resultado.erros.length > 0 || resultado.ignorados > 0) {
      void this.toast.warning(partes.join(' · '));
    } else {
      void this.toast.info('Nenhum cliente novo para importar.');
      return;
    }

    if (resultado.erros.length === 0) {
      return;
    }

    const detalhes = resultado.erros
      .slice(0, 12)
      .map((erro) => `Linha ${erro.linha}: ${erro.motivo}`)
      .join('<br />');

    const alert = await this.alertCtrl.create({
      header: 'Erros na importação',
      message:
        detalhes +
        (resultado.erros.length > 12
          ? `<br /><br />... e mais ${resultado.erros.length - 12} linha(s).`
          : ''),
      cssClass: 'crm-alert',
      buttons: ['Entendi'],
    });

    await alert.present();
  }
}
