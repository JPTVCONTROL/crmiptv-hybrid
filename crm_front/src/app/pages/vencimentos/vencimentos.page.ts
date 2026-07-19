import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { Configuracao, Mensalidade } from '../../core/models';
import {
  formatarValor,
  formatarData,
  calcularDias,
  criarMapaTelefones,
  resolverTelefoneCliente,
} from '../../shared/utils/formatters';
import {
  cobrarMensalidadesEmLote,
  filtrarMensalidadesCobranca,
  mensalidadeEstaAtrasada,
  montarMensagemBloqueioMensalidade,
  montarMensagemCobrancaMensalidade,
  nomeClienteMensalidade,
  trackByMensalidadeId,
} from '../../shared/utils/cobranca-lote';
import { oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-vencimentos',
  templateUrl: './vencimentos.page.html',
})
export class VencimentosPage implements OnInit {
  mensalidades: Mensalidade[] = [];
  telefones = new Map<number, string>();
  nomesClientes = new Map<number, string>();
  configuracao: Configuracao | null = null;
  loading = true;
  selecionados = new Set<number>();

  constructor(
    private mensalidadeService: MensalidadeService,
    private clienteService: ClienteService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService
  ) {}

  ngOnInit(): void {
    this.configuracaoService.carregar().subscribe({ next: (c) => (this.configuracao = c) });
    forkJoin([
      this.mensalidadeService.listar(),
      this.clienteService.listar(),
    ]).subscribe({
      next: ([mensalidades, clientes]) => {
        this.telefones = criarMapaTelefones(clientes);
        this.nomesClientes = new Map(clientes.map((c) => [c.id, c.nome]));
        this.mensalidades = mensalidades
          .filter((m) => m.status === 'PENDENTE')
          .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get totalPendente(): string {
    const v = this.mensalidades.reduce((t, m) => t + m.valor, 0);
    return formatarValor(v);
  }

  get vencemHoje(): number {
    return this.mensalidades.filter((m) => calcularDias(m.vencimento) === 0).length;
  }

  get atrasados(): number {
    return this.mensalidades.filter((m) => calcularDias(m.vencimento) < 0).length;
  }

  statusLabel(m: Mensalidade): string {
    const dias = calcularDias(m.vencimento);
    if (dias < 0) return 'ATRASADO';
    if (dias === 0) return 'HOJE';
    return 'PRÓXIMO';
  }

  telefone(m: Mensalidade): string {
    return resolverTelefoneCliente(m, this.telefones);
  }

  mensagem(m: Mensalidade): string {
    return montarMensagemCobrancaMensalidade(
      m,
      this.configuracao,
      this.nomesClientes
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
        this.ngOnInit();
      },
      error: (err) => alert(err.message),
    });
  }

  get qtdSelecionados(): number {
    return this.selecionados.size;
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

  alternarTodos(): void {
    if (this.todosSelecionados) {
      this.selecionados = new Set();
      return;
    }

    this.selecionados = new Set(this.mensalidades.map((m) => m.id));
  }

  get todosSelecionados(): boolean {
    return (
      this.mensalidades.length > 0 &&
      this.mensalidades.every((m) => this.selecionados.has(m.id))
    );
  }

  selecionarAtrasados(): void {
    this.selecionados = new Set(
      this.mensalidades
        .filter((m) => calcularDias(m.vencimento) < 0)
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
      this.mensalidades,
      'ATRASADO'
    );
    this.selecionados = new Set(atrasados.map((m) => m.id));
    this.cobrarSelecionados();
  }

  fmtValor = formatarValor;
  fmtData = formatarData;
  trackByMensalidade = trackByMensalidadeId;
  mensalidadeAtrasada = mensalidadeEstaAtrasada;
}
