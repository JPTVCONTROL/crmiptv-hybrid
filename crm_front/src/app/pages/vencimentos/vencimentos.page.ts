import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { Configuracao, Mensalidade } from '../../core/models';
import {
  formatarValor,
  formatarData,
  calcularDias,
} from '../../shared/utils/formatters';
import { trackByMensalidadeId } from '../../shared/utils/cobranca-lote';
import {
  resolverDiasAntecedencia,
  rotuloDiasCobrancaDiaria,
  clienteEhCortesia,
} from '../../shared/utils/cobranca-diaria';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';
import {
  classesFilterChip,
  classesFilterChipContagem,
  VarianteFilterChip,
} from '../../shared/utils/filter-chip.util';

export type FiltroVencimento = 'TODOS' | 'HOJE' | 'PROXIMO' | 'ATRASADO';

@Component({
  selector: 'app-vencimentos',
  templateUrl: './vencimentos.page.html',
})
export class VencimentosPage implements OnInit, OnDestroy {
  mensalidades: Mensalidade[] = [];
  private readonly destroy$ = new Subject<void>();
  loading = true;
  busca = '';
  filtro: FiltroVencimento = 'TODOS';
  pagina = 1;
  readonly porPagina = 10;

  readonly opcoesFiltro: { valor: FiltroVencimento; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'HOJE', rotulo: 'Hoje' },
    { valor: 'PROXIMO', rotulo: 'Próximos' },
    { valor: 'ATRASADO', rotulo: 'Atrasados' },
  ];

  constructor(
    private route: ActivatedRoute,
    private mensalidadeService: MensalidadeService,
    private clienteService: ClienteService,
    private configuracaoService: ConfiguracaoService,
    private sync: DadosSyncService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  get diasAntecedencia(): number {
    return resolverDiasAntecedencia(this.configuracao);
  }

  ngOnInit(): void {
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }

    this.route.queryParamMap.subscribe((params) => {
      const filtro = params.get('filtro');
      this.filtro =
        filtro === 'HOJE' ||
        filtro === 'PROXIMO' ||
        filtro === 'ATRASADO'
          ? filtro
          : 'TODOS';
      this.pagina = 1;
    });

    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades'],
      () => this.carregar(true)
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

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }

    forkJoin([
      this.mensalidadeService.listar(),
      this.clienteService.listar(),
    ]).subscribe({
      next: ([mensalidades]) => {
        this.mensalidades = mensalidades
          .filter((m) => m.status === 'PENDENTE')
          .sort(
            (a, b) =>
              new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
          );
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get mensalidadesFiltradas(): Mensalidade[] {
    const termo = this.busca.toLowerCase().trim();

    return this.mensalidades.filter((m) => {
      const matchBusca =
        !termo || m.cliente?.nome?.toLowerCase().includes(termo);

      if (this.filtro === 'TODOS') return matchBusca;

      const dias = calcularDias(m.vencimento);
      if (this.filtro === 'ATRASADO') return matchBusca && dias < 0;
      if (this.filtro === 'HOJE') return matchBusca && dias === 0;
      if (this.filtro === 'PROXIMO') {
        return matchBusca && dias > 0 && dias <= this.diasAntecedencia;
      }

      return matchBusca;
    });
  }

  get paginadas(): Mensalidade[] {
    const inicio = (this.pagina - 1) * this.porPagina;
    return this.mensalidadesFiltradas.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.mensalidadesFiltradas.length / this.porPagina));
  }

  get totalPendente(): string {
    const v = this.mensalidades
      .filter((m) => !clienteEhCortesia(m.cliente))
      .reduce((t, m) => t + m.valor, 0);
    return formatarValor(v);
  }

  get vencemHoje(): number {
    return this.mensalidades.filter((m) => calcularDias(m.vencimento) === 0).length;
  }

  get atrasados(): number {
    return this.mensalidades.filter((m) => calcularDias(m.vencimento) < 0).length;
  }

  statusLabel(m: Mensalidade): string {
    return rotuloDiasCobrancaDiaria(calcularDias(m.vencimento)).toUpperCase();
  }

  classesStatusVencimento(m: Mensalidade): Record<string, boolean> {
    const dias = calcularDias(m.vencimento);
    if (dias < 0) {
      return { 'crm-badge-atrasado': true };
    }
    if (dias === 0) {
      return { 'crm-badge-pendente': true };
    }
    if (dias <= this.diasAntecedencia) {
      return { 'crm-badge-pendente': true };
    }
    return { 'crm-badge-neutral': true };
  }

  definirFiltro(valor: FiltroVencimento): void {
    this.filtro = valor;
    this.pagina = 1;
  }

  contagemFiltro(valor: FiltroVencimento): number {
    if (valor === 'TODOS') {
      return this.mensalidades.length;
    }

    return this.mensalidades.filter((m) => {
      const dias = calcularDias(m.vencimento);
      if (valor === 'ATRASADO') return dias < 0;
      if (valor === 'HOJE') return dias === 0;
      if (valor === 'PROXIMO') return dias > 0 && dias <= this.diasAntecedencia;
      return false;
    }).length;
  }

  get temFiltrosAtivos(): boolean {
    return this.busca.trim().length > 0 || this.filtro !== 'TODOS';
  }

  limparFiltros(): void {
    this.busca = '';
    this.filtro = 'TODOS';
    this.pagina = 1;
  }

  classesChipStatus(filtro: FiltroVencimento): string {
    const ativo = this.filtro === filtro;
    const variantes: Record<FiltroVencimento, VarianteFilterChip> = {
      TODOS: 'violet',
      HOJE: 'red',
      PROXIMO: 'amber',
      ATRASADO: 'red',
    };
    return classesFilterChip(ativo, variantes[filtro]);
  }

  classesChipContagem(filtro: FiltroVencimento): string {
    const ativo = this.filtro === filtro;
    const variantes: Record<FiltroVencimento, VarianteFilterChip> = {
      TODOS: 'violet',
      HOJE: 'red',
      PROXIMO: 'amber',
      ATRASADO: 'red',
    };
    return classesFilterChipContagem(ativo, variantes[filtro]);
  }

  exportarCsv(): void {
    if (this.mensalidadesFiltradas.length === 0) return;

    const linhas = [
      ['Cliente', 'Referência', 'Valor', 'Vencimento', 'Status'].join(';'),
      ...this.mensalidadesFiltradas.map((m) =>
        [
          `"${(m.cliente?.nome ?? 'Cliente').replace(/"/g, '""')}"`,
          m.referencia,
          m.valor.toFixed(2).replace('.', ','),
          this.fmtData(m.vencimento),
          this.statusLabel(m),
        ].join(';')
      ),
    ];

    const blob = new Blob(['\uFEFF' + linhas.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vencimentos-${this.filtro.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  fmtValor = formatarValor;
  fmtData = formatarData;
  trackByMensalidade = trackByMensalidadeId;
  ehCortesia = clienteEhCortesia;
}
