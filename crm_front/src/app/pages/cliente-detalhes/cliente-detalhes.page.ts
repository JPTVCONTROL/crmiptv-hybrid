import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { PagamentoUiService } from '../../core/services/pagamento-ui.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ToastService } from '../../core/services/toast.service';
import { copiarTexto } from '../../shared/utils/clipboard';
import { DispositivoService } from '../../core/services/dispositivo.service';
import { Cliente, Configuracao, Dispositivo, Mensalidade } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { formatarValor, formatarData, statusCliente as calcularStatusCliente, StatusCliente } from '../../shared/utils/formatters';
import { rotuloValidadePlano } from '../../shared/utils/planos';
import {
  mensalidadeEstaAtrasada,
  montarMensagemBloqueioMensalidade,
  montarMensagemCobrancaMensalidade,
} from '../../shared/utils/cobranca-lote';
import { montarMensagemRecibo, oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';
import { DispositivoCliente, parseDispositivos, resolverDispositivoCliente, rotuloDispositivo } from '../../shared/utils/dispositivos';

@Component({
  selector: 'app-cliente-detalhes',
  templateUrl: './cliente-detalhes.page.html',
})
export class ClienteDetalhesPage implements OnInit {
  cliente: Cliente | null = null;
  dispositivosCatalogo: Dispositivo[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService,
    private dispositivoService: DispositivoService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private pagamentoUi: PagamentoUiService,
    private modalCtrl: ModalController,
    private toast: ToastService,
    private confirmacao: ConfirmacaoService
  ) {}

  mostrarSenhaIptv = false;

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe();
    }
    this.dispositivoService.listar().subscribe({
      next: (items) => (this.dispositivosCatalogo = items),
    });
    this.carregar(id);
  }

  carregar(id: number): void {
    this.loading = true;
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
          valor: m.valor,
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
