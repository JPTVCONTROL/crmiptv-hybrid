import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PlanoService } from '../../../core/services/plano.service';
import { ToastService } from '../../../core/services/toast.service';
import { Plano } from '../../../core/models';

@Component({
  selector: 'app-novo-plano-modal',
  templateUrl: './novo-plano-modal.component.html',
})
export class NovoPlanoModalComponent implements OnInit {
  @Input() plano: Plano | null = null;

  salvando = false;
  form = {
    nome: '',
    valor: 0,
    diasValidade: 30,
    ativo: true,
  };

  constructor(
    private modalCtrl: ModalController,
    private planoService: PlanoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.plano) {
      this.form = {
        nome: this.plano.nome,
        valor: this.plano.valor,
        diasValidade: this.plano.diasValidade,
        ativo: this.plano.ativo,
      };
    }
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      void this.toast.warning('Informe o nome do plano.');
      return;
    }
    if (!this.form.valor || this.form.valor <= 0) {
      void this.toast.warning('Informe um valor válido.');
      return;
    }
    if (!this.form.diasValidade || this.form.diasValidade <= 0) {
      void this.toast.warning('Informe os dias de validade.');
      return;
    }

    this.salvando = true;
    const req = this.plano
      ? this.planoService.atualizar(this.plano.id, this.form)
      : this.planoService.criar(this.form);

    req.subscribe({
      next: () => {
        this.salvando = false;
        this.modalCtrl.dismiss(true, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar plano.');
      },
    });
  }
}
