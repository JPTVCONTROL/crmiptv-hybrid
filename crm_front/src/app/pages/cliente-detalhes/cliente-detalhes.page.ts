import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, AlertController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { RenovacaoMensalidadeService } from '../../core/services/renovacao-mensalidade.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import { copiarTexto } from '../../shared/utils/clipboard';
import { DispositivoService } from '../../core/services/dispositivo.service';
import { AplicativoService } from '../../core/services/aplicativo.service';
import { Cliente, Configuracao, Dispositivo, Mensalidade, Aplicativo } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { formatarValor, formatarData, resolverStatusCliente, StatusCliente } from '../../shared/utils/formatters';
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
import { clienteParticipaCobrancas, clienteEhCortesia } from '../../shared/utils/cobranca-diaria';
import { DispositivoCliente, parseDispositivos, resolverDispositivoCliente, resolverAplicativoCliente, rotuloDispositivo } from '../../shared/utils/dispositivos';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';
import { StatusBadgeTipo } from '../../components/status-badge/status-badge.component';

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
  alternandoAtividade = false;
  renovandoMensalidadeId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService,
    private dispositivoService: DispositivoService,
    private aplicativoService: AplicativoService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private renovacao: RenovacaoMensalidadeService,
    private modalCtrl: ModalController,
    private toast: ToastService,
    private confirmacao: ConfirmacaoService,
    private sync: DadosSyncService,
    private alertCtrl: AlertController
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

  get clienteEstaAtivo(): boolean {
    return this.cliente?.ativo !== false;
  }

  get participaCampanhas(): boolean {
    return this.cliente?.incluirCampanhas !== false;
  }

  async alternarAtividade(): Promise<void> {
    if (!this.cliente || this.alternandoAtividade) {
      return;
    }

    const marcarAtivo = !this.clienteEstaAtivo;

    if (!marcarAtivo) {
      const confirmado = await this.confirmacao.confirmar({
        header: 'Marcar como inativo',
        message:
          'O cliente sairá das cobranças automáticas (Cobrança Diária, lembretes e rotinas de WhatsApp).',
        confirmText: 'Continuar',
      });
      if (!confirmado) {
        return;
      }

      const incluirCampanhas = await this.perguntarParticipacaoCampanhas();
      if (incluirCampanhas === null) {
        return;
      }

      this.salvarAtividade(false, incluirCampanhas, false);
      return;
    }

    const confirmado = await this.confirmacao.confirmar({
      header: 'Marcar como ativo',
      message: 'O cliente voltará a poder participar de cobranças e campanhas.',
      confirmText: 'Continuar',
    });
    if (!confirmado) {
      return;
    }

    const incluirCampanhas = await this.perguntarParticipacaoCampanhas();
    if (incluirCampanhas === null) {
      return;
    }

    const incluirCobrancas = await this.confirmacao.confirmar({
      header: 'Incluir nas cobranças?',
      message:
        'Deseja incluir este cliente na Cobrança Diária e nas rotinas automáticas de WhatsApp?',
      confirmText: 'Incluir',
      cancelText: 'Não incluir',
    });

    this.salvarAtividade(true, incluirCampanhas, incluirCobrancas);
  }

  private salvarAtividade(
    ativo: boolean,
    incluirCampanhas: boolean,
    incluirCobrancas: boolean
  ): void {
    if (!this.cliente) {
      return;
    }

    this.alternandoAtividade = true;
    this.clienteService
      .definirAtividade(this.cliente.id, {
        ativo,
        incluirCampanhas,
        incluirCobrancas,
      })
      .subscribe({
        next: (cliente) => {
          this.cliente = cliente;
          this.alternandoAtividade = false;
          void this.toast.success(
            ativo ? 'Cliente marcado como ativo.' : 'Cliente marcado como inativo.'
          );
        },
        error: (err) => {
          this.alternandoAtividade = false;
          void this.toast.error(err.message);
        },
      });
  }

  private perguntarParticipacaoCampanhas(): Promise<boolean | null> {
    return new Promise((resolve) => {
      void this.montarAlertaCampanhas(resolve);
    });
  }

  private async montarAlertaCampanhas(
    resolve: (value: boolean | null) => void
  ): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Campanhas do Market',
      message:
        'Este cliente deve continuar recebendo campanhas promocionais e avisos manuais do Market?',
      cssClass: 'crm-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => resolve(null),
        },
        {
          text: 'Não participar',
          handler: () => {
            resolve(false);
            return true;
          },
        },
        {
          text: 'Participar',
          handler: () => {
            resolve(true);
            return true;
          },
        },
      ],
    });

    await alert.present();
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
    if (!this.cliente || this.renovandoMensalidadeId !== null) return;

    this.renovandoMensalidadeId = m.id;
    const ok = await this.renovacao.registrarRenovacaoCortesia({
      mensalidadeId: m.id,
      clienteId: this.cliente.id,
      telefone: this.cliente.telefone,
      nome: this.cliente.nome,
      referencia: m.referencia,
      planoIdAtual: this.cliente.planoId,
      nomePlanoAtual: this.cliente.plano?.nome,
    });
    this.renovandoMensalidadeId = null;
    if (ok) this.carregar(this.cliente.id);
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

  onBloqueioRegistrado(evento: {
    mensalidadeId: number;
    bloqueioEnviadoEm: string;
  }): void {
    if (!this.cliente?.mensalidades) {
      return;
    }

    this.cliente.mensalidades = this.cliente.mensalidades.map((m) =>
      m.id === evento.mensalidadeId
        ? {
            ...m,
            bloqueioEnviadoEm: evento.bloqueioEnviadoEm,
            ultimoContatoEm: evento.bloqueioEnviadoEm,
          }
        : m
    );
  }

  mensagemContaAtivada(): string {
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

  async renovar(m: Mensalidade): Promise<void> {
    if (!this.cliente || this.renovandoMensalidadeId !== null) return;

    if (this.ehCortesia) {
      await this.renovarCortesia(m);
      return;
    }

    this.renovandoMensalidadeId = m.id;
    const ok = await this.renovacao.registrarRenovacao({
      mensalidadeId: m.id,
      clienteId: this.cliente.id,
      telefone: this.cliente.telefone,
      nome: this.cliente.nome,
      referencia: m.referencia,
      valorFallback: m.valor,
      planoIdAtual: this.cliente.planoId,
      nomePlanoAtual: this.cliente.plano?.nome,
    });
    this.renovandoMensalidadeId = null;
    if (ok) this.carregar(this.cliente.id);
  }

  estaRenovando(m: Mensalidade): boolean {
    return this.renovandoMensalidadeId === m.id;
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
    return resolverStatusCliente(this.cliente ?? undefined);
  }

  get tipoStatusBadge(): StatusBadgeTipo {
    return this.status();
  }

  get iniciaisCliente(): string {
    if (!this.cliente?.nome) {
      return '?';
    }

    const partes = this.cliente.nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
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
