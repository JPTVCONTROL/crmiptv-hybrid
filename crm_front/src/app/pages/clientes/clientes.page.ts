import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { Cliente, Aplicativo } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { statusCliente, StatusCliente, formatarData } from '../../shared/utils/formatters';
import { oferecerOnboardingCompleto } from '../../shared/utils/onboarding';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';

export type FiltroStatusCliente = 'TODOS' | StatusCliente;

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
  private readonly destroy$ = new Subject<void>();
  busca = '';
  filtroStatus: FiltroStatusCliente = 'TODOS';
  filtroAplicativoId: number | null = null;
  filtroPlanoId: number | null = null;
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
      this.filtroPlanoId !== null
    );
  }

  limparFiltros(): void {
    this.busca = '';
    this.filtroStatus = 'TODOS';
    this.filtroAplicativoId = null;
    this.filtroPlanoId = null;
    this.pagina = 1;
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
      if (status === 'ATIVO' || status === 'ATRASADO' || status === 'INATIVO') {
        this.filtroStatus = status;
      }
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

      return matchBusca && matchStatus && matchAplicativo && matchPlano;
    });

    return filtrados.sort((a, b) => {
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

  fmtData = formatarData;
}
