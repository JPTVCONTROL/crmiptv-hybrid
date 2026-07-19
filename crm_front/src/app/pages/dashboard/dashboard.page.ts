import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Configuracao,
  DashboardResumo,
  Mensalidade,
} from '../../core/models';
import {
  calcularDias,
  formatarData,
  formatarValor,
} from '../../shared/utils/formatters';
import {
  montarItemCobrancaLote,
} from '../../shared/utils/cobranca-lote';
import {
  abrirWhatsAppCobranca,
  oferecerMensagemRenovacao,
  telefoneValidoParaWhatsApp,
} from '../../shared/utils/whatsapp';
import { DadoFaturamento } from '../../components/dashboard/faturamento-chart.component';
import { resolverDiasAntecedencia } from '../../shared/utils/cobranca-diaria';
import { rotuloUltimoContato } from '../../shared/utils/contato';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';

type ProximoVencimentoResumo = DashboardResumo['proximosVencimentos'][number];
type ClienteAtencaoResumo = DashboardResumo['clientesAtencao'][number];

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit, OnDestroy {
  loading = true;
  resumo: DashboardResumo | null = null;
  private readonly destroy$ = new Subject<void>();

  totalClientes = 0;
  qtdAtivos = 0;
  qtdAtrasados = 0;
  qtdInativos = 0;
  recebidoMes = '';
  aReceberEsteMes = '';
  qtdEsteMes = 0;
  aReceberProximosMeses = '';
  qtdProximosMeses = 0;
  vencemHoje = 0;
  faturamentoMensal: DadoFaturamento[] = [];
  proximosVencimentos: ProximoVencimentoResumo[] = [];
  clientesAtencao: ClienteAtencaoResumo[] = [];
  pagando = new Set<number>();

  subtituloPagina = '';

  get diasAntecedencia(): number {
    return resolverDiasAntecedencia(this.configuracao);
  }

  constructor(
    private dashboardService: DashboardService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService,
    private toast: ToastService,
    private sync: DadosSyncService
  ) {}

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  ngOnInit(): void {
    this.subtituloPagina = this.montarSubtitulo();
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades', 'dashboard'],
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

    this.dashboardService.obterResumo().subscribe({
      next: (resumo) => {
        this.resumo = resumo;
        this.aplicarResumo(resumo);
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private aplicarResumo(resumo: DashboardResumo): void {
    this.totalClientes = resumo.clientes.total;
    this.qtdAtivos = resumo.clientes.ativos;
    this.qtdAtrasados = resumo.clientes.atrasados;
    this.qtdInativos = resumo.clientes.inativos;
    this.recebidoMes = formatarValor(resumo.financeiro.recebidoMes);
    this.aReceberEsteMes = formatarValor(resumo.financeiro.aReceberEsteMes);
    this.qtdEsteMes = resumo.financeiro.qtdEsteMes;
    this.aReceberProximosMeses = formatarValor(
      resumo.financeiro.aReceberProximosMeses
    );
    this.qtdProximosMeses = resumo.financeiro.qtdProximosMeses;
    this.vencemHoje = resumo.financeiro.vencemHoje;
    this.faturamentoMensal = resumo.faturamentoMensal;
    this.proximosVencimentos = resumo.proximosVencimentos;
    this.clientesAtencao = resumo.clientesAtencao;
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

  rotuloContato(ultimoContatoEm?: string | null): string {
    return rotuloUltimoContato(ultimoContatoEm);
  }

  podeCobrarAtencao(cliente: ClienteAtencaoResumo): boolean {
    return (
      telefoneValidoParaWhatsApp(cliente.telefone) &&
      !!cliente.mensalidadePendenteId
    );
  }

  cobrarAtencao(cliente: ClienteAtencaoResumo): void {
    if (!cliente.mensalidadePendenteId) {
      void this.toast.warning('Nenhuma cobrança pendente encontrada para este cliente.');
      return;
    }

    const mensalidade = this.mensalidadeDeAtencao(cliente);
    this.cobrarMensalidade(mensalidade);
  }

  podeCobrarProximo(item: ProximoVencimentoResumo): boolean {
    return telefoneValidoParaWhatsApp(item.telefone);
  }

  cobrarProximo(item: ProximoVencimentoResumo): void {
    this.cobrarMensalidade(this.mensalidadeDeProximo(item));
  }

  cobrarMensalidade(m: Mensalidade): void {
    const telefones = new Map<number, string>([[m.clienteId, m.cliente?.telefone ?? '']]);
    const nomes = new Map<number, string>([[m.clienteId, m.cliente?.nome ?? 'Cliente']]);
    const item = montarItemCobrancaLote(
      m,
      telefones,
      this.configuracao,
      nomes
    );
    abrirWhatsAppCobranca(item.telefone, item.mensagem);
    this.registrarContato(m.id);
  }

  estaPagando(id: number): boolean {
    return this.pagando.has(id);
  }

  async pagarProximo(item: ProximoVencimentoResumo): Promise<void> {
    await this.pagarMensalidadeId(item.id, item.telefone, item.clienteNome, item.referencia, item.valor);
  }

  async pagarAtencao(cliente: ClienteAtencaoResumo): Promise<void> {
    if (!cliente.mensalidadePendenteId) {
      void this.toast.warning('Nenhuma mensalidade pendente para registrar pagamento.');
      return;
    }

    await this.pagarMensalidadeId(
      cliente.mensalidadePendenteId,
      cliente.telefone,
      cliente.nome,
      cliente.mensalidadeReferencia ?? '',
      cliente.mensalidadeValor ?? 0
    );
  }

  rotuloPagarAtencao(cliente: ClienteAtencaoResumo): string {
    if (!cliente.mensalidadePendenteId) return 'Pagar';
    return this.estaPagando(cliente.mensalidadePendenteId) ? 'Salvando...' : 'Pagar';
  }

  private async pagarMensalidadeId(
    mensalidadeId: number,
    telefone: string,
    nome: string,
    referencia: string,
    valor: number
  ): Promise<void> {
    if (this.pagando.has(mensalidadeId)) return;

    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    this.pagando.add(mensalidadeId);
    this.pagando = new Set(this.pagando);

    this.mensalidadeService.registrarPagamento(mensalidadeId, pagoEm).subscribe({
      next: (resultado) => {
        this.pagando.delete(mensalidadeId);
        this.pagando = new Set(this.pagando);

        void oferecerMensagemRenovacao({
          telefone,
          nome,
          referencia,
          valor: resultado.valorRenovacao ?? valor,
          novoVencimento: resultado.novoVencimento,
          empresa: this.configuracao?.nomeEmpresa ?? 'JPTV',
          templateRenovacao: this.configuracao?.mensagemRenovacao,
        });

        this.carregar(true);
      },
      error: (err) => {
        this.pagando.delete(mensalidadeId);
        this.pagando = new Set(this.pagando);
        void this.toast.error(err.message ?? 'Erro ao registrar pagamento.');
      },
    });
  }

  private mensalidadeDeProximo(item: ProximoVencimentoResumo): Mensalidade {
    return {
      id: item.id,
      clienteId: item.clienteId,
      referencia: item.referencia,
      valor: item.valor,
      vencimento: item.vencimento,
      status: 'PENDENTE',
      ultimoContatoEm: item.ultimoContatoEm,
      cliente: {
        id: item.clienteId,
        nome: item.clienteNome,
        telefone: item.telefone,
      } as Mensalidade['cliente'],
    };
  }

  private mensalidadeDeAtencao(cliente: ClienteAtencaoResumo): Mensalidade {
    return {
      id: cliente.mensalidadePendenteId!,
      clienteId: cliente.id,
      referencia: cliente.mensalidadeReferencia ?? '',
      valor: cliente.mensalidadeValor ?? 0,
      vencimento:
        cliente.mensalidadeVencimento ??
        cliente.expiraEm ??
        new Date().toISOString(),
      status: 'PENDENTE',
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        expiraEm: cliente.expiraEm,
      } as Mensalidade['cliente'],
    };
  }

  private registrarContato(mensalidadeId: number): void {
    this.mensalidadeService.registrarContato(mensalidadeId).subscribe({
      next: () => this.carregar(true),
      error: () => {
        void this.toast.warning('WhatsApp aberto, mas o contato não foi salvo.');
      },
    });
  }

  fmtData = formatarData;
  fmtValor = formatarValor;
}
