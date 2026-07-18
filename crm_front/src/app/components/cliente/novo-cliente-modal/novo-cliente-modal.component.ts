import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ClienteService } from '../../../core/services/cliente.service';
import { AplicativoService } from '../../../core/services/aplicativo.service';
import { Cliente, Aplicativo } from '../../../core/models';

@Component({
  selector: 'app-novo-cliente-modal',
  templateUrl: './novo-cliente-modal.component.html',
})
export class NovoClienteModalComponent implements OnInit {
  @Input() cliente: Cliente | null = null;

  aplicativos: Aplicativo[] = [];
  salvando = false;

  form = {
    nome: '',
    telefone: '',
    aplicativoId: null as number | null,
    servidor: '',
    usuario: '',
    senha: '',
    aparelho: '',
    modelo: '',
    macAddress: '',
    ativadoEm: '',
    expiraEm: '',
    vencimento: 10,
    valorMensal: 0,
    observacao: '',
  };

  constructor(
    private modalCtrl: ModalController,
    private clienteService: ClienteService,
    private aplicativoService: AplicativoService
  ) {}

  ngOnInit(): void {
    this.aplicativoService.listar().subscribe({
      next: (apps) => (this.aplicativos = apps),
    });

    if (this.cliente) {
      this.form = {
        nome: this.cliente.nome,
        telefone: this.cliente.telefone,
        aplicativoId: this.cliente.aplicativoId ?? null,
        servidor: this.cliente.servidor ?? '',
        usuario: this.cliente.usuario ?? '',
        senha: this.cliente.senha ?? '',
        aparelho: this.cliente.aparelho ?? '',
        modelo: this.cliente.modelo ?? '',
        macAddress: this.cliente.macAddress ?? '',
        ativadoEm: this.cliente.ativadoEm?.substring(0, 10) ?? '',
        expiraEm: this.cliente.expiraEm?.substring(0, 10) ?? '',
        vencimento: this.cliente.vencimento,
        valorMensal: this.cliente.valorMensal,
        observacao: this.cliente.observacao ?? '',
      };
    }
  }

  onExpiraEmChange(): void {
    if (this.form.expiraEm) {
      const data = new Date(this.form.expiraEm + 'T12:00:00');
      this.form.vencimento = data.getDate();
    }
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.nome.trim() || !this.form.telefone.trim()) {
      alert('Preencha nome e telefone.');
      return;
    }
    if (!this.form.valorMensal || this.form.valorMensal <= 0) {
      alert('Informe o valor mensal.');
      return;
    }

    this.salvando = true;
    const payload = { ...this.form };

    const req = this.cliente
      ? this.clienteService.atualizar(this.cliente.id, payload)
      : this.clienteService.criar(payload);

    req.subscribe({
      next: () => {
        this.salvando = false;
        this.modalCtrl.dismiss(true, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        alert(err.message ?? 'Erro ao salvar cliente.');
      },
    });
  }
}
