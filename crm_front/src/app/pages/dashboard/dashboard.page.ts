import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { Cliente, Configuracao, Mensalidade } from '../../core/models';
import {
  calcularDias,
  criarMapaTelefones,
  formatarData,
  formatarValor,
  resolverTelefoneCliente,
  statusCliente,
  StatusCliente,
} from '../../shared/utils/formatters';
import {
  montarItemCobrancaLote,
  nomeClienteMensalidade,
} from '../../shared/utils/cobranca-lote';
import {
  abrirWhatsAppCobranca,
  executarCobrancaEmLote,
  montarMensagemBloqueio,
  montarMensagemCobranca,
  oferecerMensagemRenovacao,
  telefoneValidoParaWhatsApp,
} from '../../shared/utils/whatsapp';
import { DadoFaturamento } from '../../components/dashboard/faturamento-chart.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  loading = true;
  clientes: Cliente[] = [];
  mensalidades: Mensalidade[] = [];

  totalClientes = 0;
  qtdAtivos = 0;
  qtdAtrasados = 0;
  qtdInativos = 0;
  recebidoMes = '';
  valorPendente = '';
  totalRecebido = '';
  pendentes = 0;
  vencemHoje = 0;
  faturamentoMensal: DadoFaturamento[] = [];
  proximosVencimentos: Mensalidade[] = [];
  clientesAtencao: Cliente[] = [];
  configuracao: Configuracao | null = null;
  telefones = new Map<number, string>();
  nomesClientes = new Map<number, string>();
  pagando = new Set<number>();

  subtituloPagina = '';

  constructor(
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService
  ) {}

  ngOnInit(): void {
    this.subtituloPagina = this.montarSubtitulo();
    this.configuracaoService.carregar().subscribe({ next: (c) => (this.configuracao = c) });
    this.carregar();
  }

  carregar(silencioso = false): void {
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
        this.telefones = criarMapaTelefones(clientes);
        this.nomesClientes = new Map(clientes.map((c) => [c.id, c.nome]));
        this.calcularKpis();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private montarSubtitulo(): string {
    const hoje = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `Resumo de ${hoje}`;
  }

  private calcularKpis(): void {
    this.totalClientes = this.clientes.length;
    this.qtdAtivos = this.clientes.filter((c) => statusCliente(c.expiraEm) === 'ATIVO').length;
    this.qtdAtrasados = this.clientes.filter((c) => statusCliente(c.expiraEm) === 'ATRASADO').length;
    this.qtdInativos = this.clientes.filter((c) => statusCliente(c.expiraEm) === 'INATIVO').length;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pagos = this.mensalidades.filter((m) => m.status === 'PAGO');
    const pendentesLista = this.mensalidades.filter((m) => m.status === 'PENDENTE');

    const recebidoTotal = pagos.reduce((t, m) => t + m.valor, 0);
    this.totalRecebido = formatarValor(recebidoTotal);

    const recebidoNoMes = pagos
      .filter((m) => {
        if (!m.pagoEm) return false;
        const pago = new Date(m.pagoEm);
        return (
          pago.getMonth() === hoje.getMonth() &&
          pago.getFullYear() === hoje.getFullYear()
        );
      })
      .reduce((t, m) => t + m.valor, 0);
    this.recebidoMes = formatarValor(recebidoNoMes);

    const pendenteValor = pendentesLista.reduce((t, m) => t + m.valor, 0);
    this.valorPendente = formatarValor(pendenteValor);
    this.pendentes = pendentesLista.length;

    this.vencemHoje = pendentesLista.filter((m) => calcularDias(m.vencimento) === 0).length;

    this.proximosVencimentos = pendentesLista
      .filter((m) => {
        const dias = calcularDias(m.vencimento);
        return dias >= 0 && dias <= 5;
      })
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

    this.clientesAtencao = this.clientes
      .filter((c) => statusCliente(c.expiraEm) !== 'ATIVO')
      .sort((a, b) => {
        const da = a.expiraEm ? new Date(a.expiraEm).getTime() : 0;
        const db = b.expiraEm ? new Date(b.expiraEm).getTime() : 0;
        return da - db;
      })
      .slice(0, 10);

    this.faturamentoMensal = this.calcularFaturamentoMensal();
  }

  private calcularFaturamentoMensal(): DadoFaturamento[] {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    const resultado: DadoFaturamento[] = [];

    for (let i = 5; i >= 0; i--) {
      const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const rotulo = `${meses[referencia.getMonth()]}/${String(referencia.getFullYear()).slice(-2)}`;

      let total = 0;
      for (const mensalidade of this.mensalidades) {
        if (mensalidade.status !== 'PAGO' || !mensalidade.pagoEm) continue;

        const pago = new Date(mensalidade.pagoEm);
        if (
          pago.getMonth() === referencia.getMonth() &&
          pago.getFullYear() === referencia.getFullYear()
        ) {
          total += mensalidade.valor;
        }
      }

      resultado.push({ mes: rotulo, total });
    }

    return resultado;
  }

  status(cliente: Cliente): StatusCliente {
    return statusCliente(cliente.expiraEm);
  }

  rotuloExpiracao(expiraEm?: string | null): string {
    if (!expiraEm) return 'Sem data de vencimento';

    const dias = calcularDias(expiraEm);
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Vence amanhã';
    if (dias > 0) return `Vence em ${dias} dia(s)`;
    if (dias === -1) return 'Venceu ontem';
    return `Venceu há ${Math.abs(dias)} dia(s)`;
  }

  rotuloVencimento(vencimento: string): string {
    const dias = calcularDias(vencimento);
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Amanhã';
    if (dias > 0) return `Em ${dias} dias`;
    return `${Math.abs(dias)} dia(s) atrasado`;
  }

  podeCobrar(cliente: Cliente): boolean {
    return telefoneValidoParaWhatsApp(cliente.telefone) && !!this.dadosCobranca(cliente);
  }

  cobrar(cliente: Cliente): void {
    const dados = this.dadosCobranca(cliente);
    if (!dados) {
      alert('Nenhuma cobrança pendente encontrada para este cliente.');
      return;
    }

    abrirWhatsAppCobranca(cliente.telefone, this.montarMensagem(cliente, dados));
  }

  cobrarTodos(): void {
    const itens = this.clientesAtencao
      .filter((c) => this.podeCobrar(c))
      .map((c) => {
        const dados = this.dadosCobranca(c)!;
        return {
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          mensagem: this.montarMensagem(c, dados),
        };
      });

    executarCobrancaEmLote(itens);
  }

  mensalidadePendente(cliente: Cliente): Mensalidade | undefined {
    return (
      cliente.mensalidades?.find((m) => m.status === 'PENDENTE') ??
      this.mensalidades.find(
        (m) => m.clienteId === cliente.id && m.status === 'PENDENTE'
      )
    );
  }

  telefoneMensalidade(m: Mensalidade): string {
    return resolverTelefoneCliente(m, this.telefones);
  }

  podeCobrarMensalidade(m: Mensalidade): boolean {
    return telefoneValidoParaWhatsApp(this.telefoneMensalidade(m));
  }

  cobrarMensalidade(m: Mensalidade): void {
    const item = montarItemCobrancaLote(
      m,
      this.telefones,
      this.configuracao,
      this.nomesClientes
    );
    abrirWhatsAppCobranca(item.telefone, item.mensagem);
  }

  cobrarProximosVencimentos(): void {
    const itens = this.proximosVencimentos
      .filter((m) => this.podeCobrarMensalidade(m))
      .map((m) =>
        montarItemCobrancaLote(m, this.telefones, this.configuracao, this.nomesClientes)
      );

    executarCobrancaEmLote(itens);
  }

  estaPagando(id: number): boolean {
    return this.pagando.has(id);
  }

  async pagarMensalidade(m: Mensalidade): Promise<void> {
    if (this.pagando.has(m.id)) return;

    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    this.pagando.add(m.id);
    this.pagando = new Set(this.pagando);

    this.mensalidadeService.registrarPagamento(m.id, pagoEm).subscribe({
      next: (resultado) => {
        this.pagando.delete(m.id);
        this.pagando = new Set(this.pagando);

        oferecerMensagemRenovacao({
          telefone: this.telefoneMensalidade(m),
          nome: nomeClienteMensalidade(m, this.nomesClientes),
          referencia: m.referencia,
          valor: m.valor,
          novoVencimento: resultado.novoVencimento,
          empresa: this.configuracao?.nomeEmpresa ?? 'JPTV',
          templateRenovacao: this.configuracao?.mensagemRenovacao,
        });

        this.carregar(true);
      },
      error: (err) => {
        this.pagando.delete(m.id);
        this.pagando = new Set(this.pagando);
        alert(err.message ?? 'Erro ao registrar pagamento.');
      },
    });
  }

  async pagarCliente(cliente: Cliente): Promise<void> {
    const mensalidade = this.mensalidadePendente(cliente);
    if (!mensalidade) {
      alert('Nenhuma mensalidade pendente para registrar pagamento.');
      return;
    }

    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    if (this.pagando.has(mensalidade.id)) return;

    this.pagando.add(mensalidade.id);
    this.pagando = new Set(this.pagando);

    this.mensalidadeService.registrarPagamento(mensalidade.id, pagoEm).subscribe({
      next: (resultado) => {
        this.pagando.delete(mensalidade.id);
        this.pagando = new Set(this.pagando);

        oferecerMensagemRenovacao({
          telefone: cliente.telefone,
          nome: cliente.nome,
          referencia: mensalidade.referencia,
          valor: mensalidade.valor,
          novoVencimento: resultado.novoVencimento,
          empresa: this.configuracao?.nomeEmpresa ?? 'JPTV',
          templateRenovacao: this.configuracao?.mensagemRenovacao,
        });

        this.carregar(true);
      },
      error: (err) => {
        this.pagando.delete(mensalidade.id);
        this.pagando = new Set(this.pagando);
        alert(err.message ?? 'Erro ao registrar pagamento.');
      },
    });
  }

  podePagarCliente(cliente: Cliente): boolean {
    return !!this.mensalidadePendente(cliente);
  }

  rotuloPagarCliente(cliente: Cliente): string {
    const mensalidade = this.mensalidadePendente(cliente);
    if (!mensalidade) return 'Pagar';
    return this.estaPagando(mensalidade.id) ? 'Salvando...' : 'Pagar';
  }

  private dadosCobranca(
    cliente: Cliente
  ): { referencia: string; valor: number; vencimento: string } | null {
    const pendente = cliente.mensalidades?.find((m) => m.status === 'PENDENTE');
    if (pendente) {
      return {
        referencia: pendente.referencia,
        valor: pendente.valor,
        vencimento: pendente.vencimento,
      };
    }

    const pendenteGlobal = this.mensalidades.find(
      (m) => m.clienteId === cliente.id && m.status === 'PENDENTE'
    );
    if (pendenteGlobal) {
      return {
        referencia: pendenteGlobal.referencia,
        valor: pendenteGlobal.valor,
        vencimento: pendenteGlobal.vencimento,
      };
    }

    if (cliente.expiraEm) {
      const data = new Date(cliente.expiraEm);
      return {
        referencia: `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`,
        valor: cliente.valorMensal,
        vencimento: cliente.expiraEm,
      };
    }

    return null;
  }

  private montarMensagem(
    cliente: Cliente,
    dados: { referencia: string; valor: number; vencimento: string }
  ): string {
    const cfg = this.configuracao;
    const base = {
      nome: cliente.nome,
      referencia: dados.referencia,
      valor: dados.valor,
      vencimento: dados.vencimento,
      expiraEm: cliente.expiraEm ?? dados.vencimento,
      empresa: cfg?.nomeEmpresa ?? 'JPTV',
      pix: cfg?.chavePix ?? undefined,
      tipoPix: cfg?.tipoPix ?? undefined,
      favorecido: cfg?.favorecidoPix ?? undefined,
    };

    if (this.status(cliente) === 'INATIVO') {
      return montarMensagemBloqueio(base, cfg?.mensagemBloqueio);
    }

    return montarMensagemCobranca(
      { ...base, atrasado: calcularDias(dados.vencimento) < 0 },
      cfg?.mensagemCobranca
    );
  }

  fmtData = formatarData;
  fmtValor = formatarValor;
}
