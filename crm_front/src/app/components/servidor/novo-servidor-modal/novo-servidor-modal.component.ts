import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PainelCreditoService } from '../../../core/services/painel-credito.service';
import { ToastService } from '../../../core/services/toast.service';
import { PainelCredito } from '../../../core/models';
import { gerarCodigoServidor } from '../../../shared/utils/custo-credito.util';

@Component({
  selector: 'app-novo-servidor-modal',
  templateUrl: './novo-servidor-modal.component.html',
})
export class NovoServidorModalComponent implements OnInit {
  @Input() servidor: PainelCredito | null = null;

  salvando = false;
  form = {
    nome: '',
    codigo: '',
    custoUnitario: 0,
    ativo: true,
  };

  constructor(
    private modalCtrl: ModalController,
    private painelCreditoService: PainelCreditoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.servidor) {
      this.form = {
        nome: this.servidor.nome,
        codigo: this.servidor.codigo,
        custoUnitario: this.servidor.custoUnitario,
        ativo: this.servidor.ativo !== false,
      };
      return;
    }

    this.form.custoUnitario = 5;
  }

  onNomeChange(): void {
    if (!this.servidor && !this.form.codigo.trim()) {
      this.form.codigo = gerarCodigoServidor(this.form.nome);
    }
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      void this.toast.warning('Informe o nome do servidor.');
      return;
    }

    const codigo = (this.form.codigo.trim() || gerarCodigoServidor(this.form.nome)).toUpperCase();
    if (!/^[A-Z0-9_]+$/.test(codigo)) {
      void this.toast.warning('Código inválido. Use letras, números e underscore.');
      return;
    }

    if (this.form.custoUnitario < 0) {
      void this.toast.warning('Informe um custo por crédito válido.');
      return;
    }

    this.salvando = true;
    const payload = {
      nome: this.form.nome.trim(),
      codigo,
      custoUnitario: Number(this.form.custoUnitario),
      ativo: this.form.ativo,
    };

    const req = this.servidor
      ? this.painelCreditoService.atualizar(this.servidor.id, payload)
      : this.painelCreditoService.criar(payload);

    req.subscribe({
      next: () => {
        this.salvando = false;
        this.modalCtrl.dismiss(true, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar servidor.');
      },
    });
  }
}
