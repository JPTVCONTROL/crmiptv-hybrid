import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { Cliente, Configuracao, Mensalidade } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { formatarValor, formatarData, calcularDias } from '../../shared/utils/formatters';
import { montarMensagemCobranca } from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-cliente-detalhes',
  templateUrl: './cliente-detalhes.page.html',
})
export class ClienteDetalhesPage implements OnInit {
  cliente: Cliente | null = null;
  configuracao: Configuracao | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService,
    private configuracaoService: ConfiguracaoService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.configuracaoService.carregar().subscribe({ next: (c) => (this.configuracao = c) });
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
    const cfg = this.configuracao;
    return montarMensagemCobranca(
      {
        nome: this.cliente?.nome ?? '',
        referencia: m.referencia,
        valor: m.valor,
        vencimento: m.vencimento,
        empresa: cfg?.nomeEmpresa ?? 'JPTV',
        atrasado: calcularDias(m.vencimento) < 0,
        pix: cfg?.chavePix ?? undefined,
        tipoPix: cfg?.tipoPix ?? undefined,
        favorecido: cfg?.favorecidoPix ?? undefined,
      },
      cfg?.mensagemCobranca
    );
  }

  pagar(m: Mensalidade): void {
    this.mensalidadeService.registrarPagamento(m.id).subscribe({
      next: () => this.carregar(this.cliente!.id),
      error: (err) => alert(err.message),
    });
  }

  async editar(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoClienteModalComponent,
      componentProps: { cliente: this.cliente },
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data && this.cliente) this.carregar(this.cliente.id);
  }

  excluir(): void {
    if (!this.cliente || !confirm('Excluir este cliente?')) return;
    this.clienteService.excluir(this.cliente.id).subscribe({
      next: () => this.router.navigate(['/clientes']),
      error: (err) => alert(err.message),
    });
  }

  fmtValor = formatarValor;
  fmtData = formatarData;
}
