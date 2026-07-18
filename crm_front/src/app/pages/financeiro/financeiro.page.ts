import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { Cliente, Configuracao, Mensalidade, StatusFinanceiro } from '../../core/models';
import {
  formatarValor,
  formatarData,
  statusFinanceiro,
  criarMapaTelefones,
  resolverTelefoneCliente,
} from '../../shared/utils/formatters';
import { montarMensagemCobranca } from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-financeiro',
  templateUrl: './financeiro.page.html',
})
export class FinanceiroPage implements OnInit {
  mensalidades: Mensalidade[] = [];
  telefones = new Map<number, string>();
  configuracao: Configuracao | null = null;
  loading = true;
  busca = '';
  filtro: StatusFinanceiro = 'TODOS';
  pagina = 1;
  readonly porPagina = 10;

  constructor(
    private mensalidadeService: MensalidadeService,
    private clienteService: ClienteService,
    private configuracaoService: ConfiguracaoService
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
    const cfg = this.configuracao;
    return montarMensagemCobranca(
      {
        nome: m.cliente?.nome ?? '',
        referencia: m.referencia,
        valor: m.valor,
        vencimento: m.vencimento,
        empresa: cfg?.nomeEmpresa ?? 'JPTV',
        atrasado: this.status(m) === 'ATRASADO',
        pix: cfg?.chavePix ?? undefined,
        tipoPix: cfg?.tipoPix ?? undefined,
        favorecido: cfg?.favorecidoPix ?? undefined,
      },
      cfg?.mensagemCobranca
    );
  }

  pagar(m: Mensalidade): void {
    this.mensalidadeService.registrarPagamento(m.id).subscribe({
      next: () => this.carregar(),
      error: (err) => alert(err.message),
    });
  }

  fmtValor = formatarValor;
  fmtData = formatarData;
}
