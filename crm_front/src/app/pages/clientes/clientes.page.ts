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
import { Cliente, Aplicativo, ImportacaoClientesResultado } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { statusCliente, StatusCliente, formatarData } from '../../shared/utils/formatters';
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
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';
import { exportarClientesCsv } from '../../shared/utils/cliente-export';
import { clienteParticipaCobrancas } from '../../shared/utils/cobranca-diaria';

export type FiltroStatusCliente = 'TODOS' | StatusCliente;
export type FiltroCobrancaCliente = 'TODOS' | 'COM_COBRANCA' | 'SEM_COBRANCA';

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
  private readonly destroy$ = new Subject<void>();
  busca = '';
  filtroStatus: FiltroStatusCliente = 'TODOS';
  filtroAplicativoId: number | null = null;
  filtroPlanoId: number | null = null;
  filtroCadastro: TipoPendenciaCadastro | null = null;
  filtroCobranca: FiltroCobrancaCliente = 'TODOS';
  filtroCadastroIncompleto = false;
  pagina = 1;
  readonly porPagina = 15;
  opcoesAplicativos: OpcaoFiltroCatalogo[] = [];
  opcoesPlanos: OpcaoFiltroCatalogo[] = [];
  aplicativos: Aplicativo[] = [];

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
  ];

  definirFiltroCobranca(filtro: FiltroCobrancaCliente): void {
    this.filtroCobranca = filtro;
    this.pagina = 1;
  }

  alternarFiltroCadastroIncompleto(): void {
    this.filtroCadastroIncompleto = !this.filtroCadastroIncompleto;
    this.pagina = 1;
  }

  contagemCobranca(filtro: FiltroCobrancaCliente): number {
    if (filtro === 'TODOS') {
      return this.clientes.length;
    }

    if (filtro === 'COM_COBRANCA') {
      return this.clientes.filter((c) => clienteParticipaCobrancas(c)).length;
    }

    return this.clientes.filter((c) => !clienteParticipaCobrancas(c)).length;
  }

  contagemCadastroIncompleto(): number {
    return this.clientes.filter((c) =>
      clienteCadastroIncompleto(c, this.aplicativos)
    ).length;
  }

  classesChipCobranca(filtro: FiltroCobrancaCliente): Record<string, boolean> {
    const ativo = this.filtroCobranca === filtro;

    if (!ativo) {
      return {
        'border-slate-700': true,
        'bg-slate-800/50': true,
        'text-slate-400': true,
      };
    }

    if (filtro === 'SEM_COBRANCA') {
      return {
        'border-amber-500': true,
        'bg-amber-600/15': true,
        'text-amber-200': true,
      };
    }

    return {
      'border-violet-500': true,
      'bg-violet-600/15': true,
      'text-violet-200': true,
    };
  }

  definirFiltroStatus(filtro: FiltroStatusCliente): void {
    this.filtroStatus = filtro;
    this.pagina = 1;
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

  get rotuloFiltroCadastroAtivo(): string {
    return this.filtroCadastro
      ? rotuloFiltroCadastro(this.filtroCadastro)
      : '';
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
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cadastro: null, status: null, incompleto: null },
      queryParamsHandling: 'merge',
    });
  }

  classesChipStatus(filtro: FiltroStatusCliente): Record<string, boolean> {
    const ativo = this.filtroStatus === filtro;

    if (!ativo) {
      return {
        'border-slate-700': true,
        'bg-slate-800/50': true,
        'text-slate-400': true,
        'hover:border-slate-600': true,
        'hover:text-slate-300': true,
      };
    }

    if (filtro === 'TODOS') {
      return {
        'border-violet-500': true,
        'bg-violet-600/15': true,
        'text-violet-200': true,
        'shadow-sm': true,
        'shadow-violet-900/20': true,
      };
    }

    if (filtro === 'ATIVO') {
      return {
        'border-green-500': true,
        'bg-green-600/15': true,
        'text-green-200': true,
        'shadow-sm': true,
        'shadow-green-900/20': true,
      };
    }

    if (filtro === 'ATRASADO') {
      return {
        'border-amber-500': true,
        'bg-amber-600/15': true,
        'text-amber-200': true,
        'shadow-sm': true,
        'shadow-amber-900/20': true,
      };
    }

    return {
      'border-red-500': true,
      'bg-red-600/15': true,
      'text-red-200': true,
      'shadow-sm': true,
      'shadow-red-900/20': true,
    };
  }

  classesChipContagem(filtro: FiltroStatusCliente): Record<string, boolean> {
    const ativo = this.filtroStatus === filtro;

    if (!ativo) {
      return { 'bg-slate-700/80': true };
    }

    return {
      'bg-violet-500/25': filtro === 'TODOS',
      'bg-green-500/25': filtro === 'ATIVO',
      'bg-amber-500/25': filtro === 'ATRASADO',
      'bg-red-500/25': filtro === 'INATIVO',
    };
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
    private sync: DadosSyncService
  ) {}

  ngOnInit(): void {
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }
    this.aplicativoService.listar().subscribe({
      next: (apps) => (this.aplicativos = apps),
    });

    this.route.queryParamMap.subscribe((params) => {
      const status = params.get('status');
      this.filtroStatus =
        status === 'ATIVO' || status === 'ATRASADO' || status === 'INATIVO'
          ? status
          : 'TODOS';

      this.filtroCadastro = resolverFiltroCadastro(params.get('cadastro'));
      this.filtroCadastroIncompleto = params.get('incompleto') === '1';
      this.pagina = 1;
    });
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades', 'catalogos'],
      () => {
        this.carregar(true);
        this.aplicativoService.listar().subscribe({
          next: (apps) => (this.aplicativos = apps),
        });
      }
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
          !clienteParticipaCobrancas(c));

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

    return filtrados.sort((a, b) => {
      const ordemCobrancaA = clienteParticipaCobrancas(a) ? 0 : 1;
      const ordemCobrancaB = clienteParticipaCobrancas(b) ? 0 : 1;

      if (ordemCobrancaA !== ordemCobrancaB) {
        return ordemCobrancaA - ordemCobrancaB;
      }

      const tsA = a.expiraEm ? new Date(a.expiraEm).getTime() : Number.MAX_SAFE_INTEGER;
      const tsB = b.expiraEm ? new Date(b.expiraEm).getTime() : Number.MAX_SAFE_INTEGER;

      if (tsA !== tsB) {
        return tsA - tsB;
      }

      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }

  get clientesPaginados(): Cliente[] {
    const inicio = (this.pagina - 1) * this.porPagina;
    return this.clientesFiltrados.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.clientesFiltrados.length / this.porPagina));
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    this.clienteService.listar().subscribe({
      next: (data) => {
        this.clientes = data;
        this.atualizarOpcoesCatalogo(data);
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
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
    return statusCliente(cliente.expiraEm);
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

  participaCobrancas = clienteParticipaCobrancas;

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
      this.clienteService.importarCsv(csv).subscribe({
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
