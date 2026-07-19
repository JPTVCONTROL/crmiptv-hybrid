import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { Cliente, Configuracao, Mensalidade, StatusFinanceiro } from '../../core/models';
import {
  formatarValor,
  formatarData,
  statusFinanceiro,
  criarMapaTelefones,
  resolverTelefoneCliente,
} from '../../shared/utils/formatters';
import {
  cobrarMensalidadesEmLote,
  filtrarMensalidadesCobranca,
  montarMensagemBloqueioMensalidade,
  montarMensagemCobrancaMensalidade,
  nomeClienteMensalidade,
  trackByMensalidadeId,
} from '../../shared/utils/cobranca-lote';
import { oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-financeiro',
  templateUrl: './financeiro.page.html',
})
export class FinanceiroPage implements OnInit {
  mensalidades: Mensalidade[] = [];
  telefones = new Map<number, string>();
  nomesClientes = new Map<number, string>();
  configuracao: Configuracao | null = null;
  loading = true;
  busca = '';
  filtro: StatusFinanceiro = 'TODOS';
  pagina = 1;
  readonly porPagina = 10;
  selecionados = new Set<number>();

  constructor(
    private mensalidadeService: MensalidadeService,
    private clienteService: ClienteService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService
  ) {}

  ngOnInit(): void {
    this.configuracaoService.carregar().subscribe({ next: (c) => (this.configuracao = c) });
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    forkJoin([
      this.mensalidadeService.listar(),
      this.clienteService.listar(),
    ]).subscribe({
      next: ([mensalidades, clientes]) => {
        this.mensalidades = mensalidades.filter((m) => m.status !== 'PAGO');
        this.telefones = criarMapaTelefones(clientes);
        this.nomesClientes = new Map(clientes.map((c) => [c.id, c.nome]));
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get filtradas(): Mensalidade[] {
    let lista = [...this.mensalidades];

    if (this.filtro !== 'TODOS') {
      lista = lista.filter((m) => statusFinanceiro(m.vencimento) === this.filtro);
    }

    if (this.busca.trim()) {
      const t = this.busca.toLowerCase();
      lista = lista.filter((m) => m.cliente?.nome?.toLowerCase().includes(t));
    }

    const ordem = { PENDENTE: 0, REGULAR: 1, ATRASADO: 2 };
    lista.sort((a, b) => {
      const sa = statusFinanceiro(a.vencimento);
      const sb = statusFinanceiro(b.vencimento);
      if (ordem[sa] !== ordem[sb]) return ordem[sa] - ordem[sb];
      return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
    });

    return lista;
  }

  get paginadas(): Mensalidade[] {
    const inicio = (this.pagina - 1) * this.porPagina;
    return this.filtradas.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filtradas.length / this.porPagina));
  }

  resumo(tipo: StatusFinanceiro): { qtd: number; valor: string } {
    const lista =
      tipo === 'TODOS'
        ? this.mensalidades
        : this.mensalidades.filter((m) => statusFinanceiro(m.vencimento) === tipo);
    const valor = lista.reduce((t, m) => t + m.valor, 0);
    return { qtd: lista.length, valor: formatarValor(valor) };
  }

  status(m: Mensalidade): StatusFinanceiro {
    return statusFinanceiro(m.vencimento);
  }

  telefone(m: Mensalidade): string {
    return resolverTelefoneCliente(m, this.telefones);
  }

  mensagem(m: Mensalidade): string {
    return montarMensagemCobrancaMensalidade(
      m,
      this.configuracao,
      this.nomesClientes,
      this.status(m) === 'ATRASADO'
    );
  }

  mensagemBloqueio(m: Mensalidade): string {
    return montarMensagemBloqueioMensalidade(
      m,
      this.configuracao,
      this.nomesClientes
    );
  }

  async pagar(m: Mensalidade): Promise<void> {
    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    this.mensalidadeService.registrarPagamento(m.id, pagoEm).subscribe({
      next: (resultado) => {
        oferecerMensagemRenovacao({
          telefone: this.telefone(m),
          nome: nomeClienteMensalidade(m, this.nomesClientes),
          referencia: m.referencia,
          valor: m.valor,
          novoVencimento: resultado.novoVencimento,
          empresa: this.configuracao?.nomeEmpresa ?? 'JPTV',
          templateRenovacao: this.configuracao?.mensagemRenovacao,
        });
        this.carregar();
      },
      error: (err) => alert(err.message),
    });
  }

  get qtdSelecionados(): number {
    return this.selecionados.size;
  }

  get qtdAtrasadosFiltrados(): number {
    return this.filtradas.filter((m) => this.status(m) === 'ATRASADO').length;
  }

  estaSelecionado(m: Mensalidade): boolean {
    return this.selecionados.has(m.id);
  }

  alternarSelecao(m: Mensalidade): void {
    if (this.selecionados.has(m.id)) {
      this.selecionados.delete(m.id);
    } else {
      this.selecionados.add(m.id);
    }
    this.selecionados = new Set(this.selecionados);
  }

  alternarTodosFiltrados(): void {
    if (this.todosFiltradosSelecionados) {
      this.selecionados = new Set();
      return;
    }

    this.selecionados = new Set(this.filtradas.map((m) => m.id));
  }

  get todosFiltradosSelecionados(): boolean {
    return (
      this.filtradas.length > 0 &&
      this.filtradas.every((m) => this.selecionados.has(m.id))
    );
  }

  get todosPaginaSelecionados(): boolean {
    return (
      this.paginadas.length > 0 &&
      this.paginadas.every((m) => this.selecionados.has(m.id))
    );
  }

  alternarPagina(): void {
    if (this.todosPaginaSelecionados) {
      for (const m of this.paginadas) {
        this.selecionados.delete(m.id);
      }
    } else {
      for (const m of this.paginadas) {
        this.selecionados.add(m.id);
      }
    }
    this.selecionados = new Set(this.selecionados);
  }

  selecionarAtrasados(): void {
    this.selecionados = new Set(
      this.filtradas
        .filter((m) => this.status(m) === 'ATRASADO')
        .map((m) => m.id)
    );
  }

  limparSelecao(): void {
    this.selecionados = new Set();
  }

  cobrarSelecionados(): void {
    cobrarMensalidadesEmLote(
      this.mensalidades,
      this.selecionados,
      this.telefones,
      this.configuracao,
      this.nomesClientes
    );
  }

  cobrarAtrasados(): void {
    const atrasados = filtrarMensalidadesCobranca(
      this.filtradas,
      'ATRASADO'
    );
    this.selecionados = new Set(atrasados.map((m) => m.id));
    this.cobrarSelecionados();
  }

  fmtValor = formatarValor;
  fmtData = formatarData;

  trackByMensalidade = trackByMensalidadeId;
}
