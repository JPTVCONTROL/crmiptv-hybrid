import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { copiarTexto } from '../../shared/utils/clipboard';
import { DispositivoService } from '../../core/services/dispositivo.service';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { Cliente, Configuracao, Dispositivo, Mensalidade, Aplicativo } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { formatarValor, formatarData, statusCliente as calcularStatusCliente, StatusCliente } from '../../shared/utils/formatters';
import { rotuloValidadePlano } from '../../shared/utils/planos';
import {
  mensalidadeEstaAtrasada,
  montarMensagemBloqueioMensalidade,
  montarMensagemCobrancaMensalidade,
} from '../../shared/utils/cobranca-lote';
import {
  montarMensagemBoasVindas,
  montarMensagemApp,
  temAppParaEnviar,
  resolverAplicativoDaTela,
} from '../../shared/utils/onboarding';
import { montarMensagemRecibo, oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';
import { clienteParticipaCobrancas, clienteEhCortesia } from '../../shared/utils/cobranca-diaria';
import { DispositivoCliente, parseDispositivos, resolverDispositivoCliente, resolverAplicativoCliente, rotuloDispositivo } from '../../shared/utils/dispositivos';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';

@Component({
  selector: 'app-cliente-detalhes',
  templateUrl: './cliente-detalhes.page.html',
})
export class ClienteDetalhesPage implements OnInit, OnDestroy {
  cliente: Cliente | null = null;
  private clienteId = 0;
  private readonly destroy$ = new Subject<void>();
  dispositivosCatalogo: Dispositivo[] = [];
  aplicativosCatalogo: Aplicativo[] = [];
  loading = true;
  alternandoCobrancas = false;
  alternandoCortesia = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService,
    private dispositivoService: DispositivoService,
    private aplicativoService: AplicativoService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService,
    private modalCtrl: ModalController,
    private toast: ToastService,
    private confirmacao: ConfirmacaoService,
    private sync: DadosSyncService
  ) {}

  mostrarSenhaIptv = false;

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      void this.router.navigate(['/clientes']);
      return;
    }

    this.clienteId = id;
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }
    this.carregarCatalogos();
    this.carregar(this.clienteId);
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades', 'catalogos'],
      () => {
        this.carregarCatalogos();
        if (this.clienteId) {
          this.carregar(this.clienteId, true);
        }
      }
    );
  }

  ionViewWillEnter(): void {
    if (this.clienteId && !this.loading) {
      this.carregar(this.clienteId, true);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarCatalogos(): void {
    this.dispositivoService.listar().subscribe({
      next: (items) => (this.dispositivosCatalogo = items),
    });
    this.aplicativoService.listar().subscribe({
      next: (items) => (this.aplicativosCatalogo = items),
    });
  }

  carregar(id: number, silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }
    this.clienteService.buscarPorId(id).subscribe({
      next: (cliente) => {
        this.cliente = cliente;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/clientes']);
      },
    });
  }

  mensalidadePendente(): Mensalidade | undefined {
    return this.cliente?.mensalidades?.find((m) => m.status === 'PENDENTE');
  }

  get incluirNasCobrancas(): boolean {
    return this.cliente?.incluirCobrancas !== false;
  }

  get participaCobrancas(): boolean {
    return clienteParticipaCobrancas(this.cliente);
  }

  get ehCortesia(): boolean {
    return clienteEhCortesia(this.cliente);
  }

  async alternarCortesia(): Promise<void> {
    if (!this.cliente || this.alternandoCortesia) {
      return;
    }

    const cortesia = !this.ehCortesia;
    const confirmado = await this.confirmacao.confirmar({
      header: cortesia ? 'Marcar como cortesia' : 'Remover cortesia',
      message: cortesia
        ? 'Este cliente continuará em Vencimentos, mas não receberá cobranças nem lembretes automáticos.'
        : 'Este cliente voltará ao fluxo normal de cobrança (se estiver incluído nas cobranças).',
      confirmText: cortesia ? 'Marcar cortesia' : 'Remover cortesia',
    });

    if (!confirmado) {
      return;
    }

    this.alternandoCortesia = true;
    this.clienteService.definirCortesia(this.cliente.id, cortesia).subscribe({
      next: (cliente) => {
        this.cliente = cliente;
        this.alternandoCortesia = false;
        void this.toast.success(
          cortesia ? 'Cliente marcado como cortesia.' : 'Cortesia removida.'
        );
      },
      error: (err) => {
        this.alternandoCortesia = false;
        void this.toast.error(err.message);
      },
    });
  }

  async renovarCortesia(m: Mensalidade): Promise<void> {
    if (!this.cliente) return;

    const confirmado = await this.confirmacao.confirmar({
      header: 'Renovar cortesia',
      message: 'Estender a validade do plano sem gerar cobrança?',
      confirmText: 'Renovar',
    });

    if (!confirmado) return;

    this.mensalidadeService.renovarCortesia(m.id).subscribe({
      next: () => {
        void this.toast.success('Cortesia renovada.');
        this.carregar(this.cliente!.id);
      },
      error: (err) => void this.toast.error(err.message),
    });
  }

  async alternarInclusaoCobrancas(): Promise<void> {
    if (!this.cliente || this.alternandoCobrancas) {
      return;
    }

    const incluir = !this.incluirNasCobrancas;
    const confirmado = await this.confirmacao.confirmar({
      header: incluir ? 'Incluir nas cobranças' : 'Não incluir nas cobranças',
      message: incluir
        ? 'Este cliente voltará a aparecer na Cobrança Diária e nas rotinas automáticas.'
        : 'Este cliente deixará de aparecer na Cobrança Diária e nas rotinas automáticas de WhatsApp.',
      confirmText: incluir ? 'Incluir' : 'Excluir das cobranças',
    });

    if (!confirmado) {
      return;
    }

    this.alternandoCobrancas = true;
    this.clienteService
      .definirInclusaoCobrancas(this.cliente.id, incluir)
      .subscribe({
        next: (cliente) => {
          this.cliente = cliente;
          this.alternandoCobrancas = false;
          void this.toast.success(
            incluir
              ? 'Cliente incluído nas cobranças.'
              : 'Cliente excluído das cobranças.'
          );
        },
        error: (err) => {
          this.alternandoCobrancas = false;
          void this.toast.error(err.message);
        },
      });
  }

  mensagemWhatsApp(m: Mensalidade): string {
    return montarMensagemCobrancaMensalidade(
      m,
      this.configuracao,
      undefined,
      undefined,
      this.cliente?.nome
    );
  }

  mensagemBloqueio(m: Mensalidade): string {
    return montarMensagemBloqueioMensalidade(
      m,
      this.configuracao,
      undefined,
      this.cliente?.nome
    );
  }

  mensalidadeAtrasada(m: Mensalidade): boolean {
    return mensalidadeEstaAtrasada(m.vencimento);
  }

  mensagemRecibo(m: Mensalidade): string {
    const cfg = this.configuracao;
    return montarMensagemRecibo(
      {
        nome: this.cliente?.nome ?? '',
        referencia: m.referencia,
        valor: m.valor,
        vencimento: m.vencimento,
        pagoEm: m.pagoEm ?? new Date().toISOString(),
        empresa: cfg?.nomeEmpresa ?? 'JPTV',
      },
      cfg?.mensagemRecibo
    );
  }

  mensagemBoasVindas(): string {
    if (!this.cliente) return '';
    return montarMensagemBoasVindas(this.cliente, this.configuracao);
  }

  mensagemAppTela(disp: DispositivoCliente): string {
    if (!this.cliente) return '';
    const app = resolverAplicativoDaTela(
      this.cliente,
      disp,
      this.aplicativosCatalogo
    );
    if (!app) return '';
    return montarMensagemApp(this.cliente, this.configuracao, app);
  }

  podeEnviarAppTela(disp: DispositivoCliente): boolean {
    if (!this.cliente) return false;
    const app = resolverAplicativoDaTela(
      this.cliente,
      disp,
      this.aplicativosCatalogo
    );
    return !!app && temAppParaEnviar(this.cliente, app);
  }

  async pagar(m: Mensalidade): Promise<void> {
    if (!this.cliente) return;

    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) return;

    this.mensalidadeService.registrarPagamento(m.id, pagoEm).subscribe({
      next: (resultado) => {
        void oferecerMensagemRenovacao({
          telefone: this.cliente!.telefone,
          nome: this.cliente!.nome,
          referencia: m.referencia,
          valor: resultado.valorRenovacao ?? m.valor,
          novoVencimento: resultado.novoVencimento,
          empresa: this.configuracao?.nomeEmpresa ?? 'JPTV',
          templateRenovacao: this.configuracao?.mensagemRenovacao,
        });
        this.carregar(this.cliente!.id);
      },
      error: (err) => void this.toast.error(err.message),
    });
  }

  async editar(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoClienteModalComponent,
      componentProps: { cliente: this.cliente },
      cssClass: 'crm-modal crm-modal-cliente',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data && this.cliente) this.carregar(this.cliente.id);
  }

  async excluir(): Promise<void> {
    if (!this.cliente) return;

    const confirmado = await this.confirmacao.confirmar({
      header: 'Excluir cliente',
      message: 'Excluir este cliente?',
      confirmText: 'Excluir',
    });
    if (!confirmado) return;

    this.clienteService.excluir(this.cliente.id).subscribe({
      next: () => this.router.navigate(['/clientes']),
      error: (err) => void this.toast.error(err.message),
    });
  }

  temCredenciais(): boolean {
    if (!this.cliente) return false;
    return !!(
      this.cliente.servidor?.trim() ||
      this.cliente.usuario?.trim() ||
      this.cliente.senha?.trim() ||
      this.cliente.aplicativo?.nome?.trim()
    );
  }

  temPix(): boolean {
    return !!this.configuracao?.chavePix?.trim();
  }

  alternarSenhaIptv(): void {
    this.mostrarSenhaIptv = !this.mostrarSenhaIptv;
  }

  async copiarPix(): Promise<void> {
    const cfg = this.configuracao;
    if (!cfg?.chavePix?.trim()) {
      void this.toast.warning('Nenhuma chave PIX cadastrada em Configurações.');
      return;
    }

    const tipo = cfg.tipoPix?.trim() ? ` (${cfg.tipoPix})` : '';
    const favorecido = cfg.favorecidoPix?.trim()
      ? `\nFavorecido: ${cfg.favorecidoPix}`
      : '';
    const texto = `PIX${tipo}: ${cfg.chavePix}${favorecido}`;
    const ok = await copiarTexto(texto);
    if (ok) {
      void this.toast.success('Chave PIX copiada.');
    } else {
      void this.toast.error('Não foi possível copiar. Tente novamente.');
    }
  }

  async copiarCredenciais(): Promise<void> {
    if (!this.cliente) return;

    const linhas = [
      this.cliente.servidor?.trim()
        ? `Servidor: ${this.cliente.servidor.trim()}`
        : '',
      this.cliente.usuario?.trim()
        ? `Usuário: ${this.cliente.usuario.trim()}`
        : '',
      this.cliente.senha?.trim() ? `Senha: ${this.cliente.senha.trim()}` : '',
      this.cliente.aplicativo?.nome?.trim()
        ? `App: ${this.cliente.aplicativo.nome.trim()}`
        : '',
    ].filter(Boolean);

    if (linhas.length === 0) {
      void this.toast.warning('Nenhuma credencial cadastrada para copiar.');
      return;
    }

    const ok = await copiarTexto(linhas.join('\n'));
    if (ok) {
      void this.toast.success('Credenciais copiadas.');
    } else {
      void this.toast.error('Não foi possível copiar. Tente novamente.');
    }
  }

  fmtValor = formatarValor;
  fmtData = formatarData;

  status(): StatusCliente {
    return calcularStatusCliente(this.cliente?.expiraEm);
  }

  rotuloValidadePlano = rotuloValidadePlano;

  dispositivos(): DispositivoCliente[] {
    return parseDispositivos(this.cliente ?? {});
  }

  qtdTelas(): number {
    return this.cliente?.qtdTelas ?? this.dispositivos().length;
  }

  rotuloAplicativoTela(item: DispositivoCliente): string {
    const app = resolverAplicativoCliente(item, this.aplicativosCatalogo);
    if (app?.nome) {
      return app.nome;
    }

    if (item.aplicativoId && this.cliente?.aplicativo?.id === item.aplicativoId) {
      return this.cliente.aplicativo.nome;
    }

    return '—';
  }

  rotuloAplicativoPrincipal(): string {
    const dispositivos = this.dispositivos();
    const apps = dispositivos
      .map((item) => this.rotuloAplicativoTela(item))
      .filter((nome) => nome !== '—');

    if (apps.length === 0) {
      return this.cliente?.aplicativo?.nome || '—';
    }

    const unicos = [...new Set(apps)];
    return unicos.join(' · ');
  }

  rotuloTela(item: DispositivoCliente, indice: number): string {
    const catalogo = resolverDispositivoCliente(item, this.dispositivosCatalogo);
    if (catalogo) {
      return rotuloDispositivo(catalogo);
    }

    if (indice === 0 && this.cliente?.aparelho) {
      return this.cliente.modelo
        ? `${this.cliente.aparelho} — ${this.cliente.modelo}`
        : this.cliente.aparelho;
    }

    return '—';
  }
}
