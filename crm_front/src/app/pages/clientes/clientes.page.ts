import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ClienteService } from '../../core/services/cliente.service';
import { Cliente } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { statusCliente, StatusCliente, formatarData } from '../../shared/utils/formatters';

export type FiltroStatusCliente = 'TODOS' | StatusCliente;

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
})
export class ClientesPage implements OnInit {
  clientes: Cliente[] = [];
  loading = true;
  busca = '';
  filtroStatus: FiltroStatusCliente = 'TODOS';

  readonly opcoesFiltroStatus: { valor: FiltroStatusCliente; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'ATIVO', rotulo: 'Ativos' },
    { valor: 'ATRASADO', rotulo: 'Atrasados' },
    { valor: 'INATIVO', rotulo: 'Inativos' },
  ];

  definirFiltroStatus(filtro: FiltroStatusCliente): void {
    this.filtroStatus = filtro;
  }

  contagemStatus(filtro: FiltroStatusCliente): number {
    if (filtro === 'TODOS') {
      return this.clientes.length;
    }

    return this.clientes.filter((c) => this.status(c) === filtro).length;
  }

  get temFiltrosAtivos(): boolean {
    return this.busca.trim().length > 0 || this.filtroStatus !== 'TODOS';
  }

  limparFiltros(): void {
    this.busca = '';
    this.filtroStatus = 'TODOS';
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
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const status = params.get('status');
      if (status === 'ATIVO' || status === 'ATRASADO' || status === 'INATIVO') {
        this.filtroStatus = status;
      }
    });
    this.carregar();
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

      return matchBusca && matchStatus;
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

  carregar(): void {
    this.loading = true;
    this.clienteService.listar().subscribe({
      next: (data) => {
        this.clientes = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  async novoCliente(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoClienteModalComponent,
      cssClass: 'crm-modal crm-modal-cliente',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
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

  excluir(cliente: Cliente): void {
    if (!confirm(`Excluir o cliente ${cliente.nome}?`)) return;
    this.clienteService.excluir(cliente.id).subscribe({
      next: () => this.carregar(),
      error: (err) => alert(err.message),
    });
  }

  status(cliente: Cliente): StatusCliente {
    return statusCliente(cliente.expiraEm);
  }

  fmtData = formatarData;
}
