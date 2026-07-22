import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DespesaService } from '../../../core/services/despesa.service';
import { ToastService } from '../../../core/services/toast.service';
import { CategoriaDespesa, DespesaMensal } from '../../../core/models';
import { CATEGORIAS_DESPESA } from '../../../shared/utils/despesa.util';

@Component({
  selector: 'app-nova-despesa-modal',
  templateUrl: './nova-despesa-modal.component.html',
})
export class NovaDespesaModalComponent implements OnInit {
  @Input() despesa: DespesaMensal | null = null;

  readonly categorias = CATEGORIAS_DESPESA;
  salvando = false;

  form = {
    nome: '',
    valor: 0,
    categoria: 'OUTRO' as CategoriaDespesa,
    ativo: true,
    observacao: '',
  };

  constructor(
    private modalCtrl: ModalController,
    private despesaService: DespesaService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.despesa) {
      this.form = {
        nome: this.despesa.nome,
        valor: this.despesa.valor,
        categoria: (this.despesa.categoria as CategoriaDespesa) || 'OUTRO',
        ativo: this.despesa.ativo,
        observacao: this.despesa.observacao ?? '',
      };
    }
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      void this.toast.warning('Informe o nome da despesa.');
      return;
    }

    if (!this.form.valor || this.form.valor < 0) {
      void this.toast.warning('Informe um valor válido.');
      return;
    }

    this.salvando = true;
    const payload = {
      nome: this.form.nome.trim(),
      valor: Number(this.form.valor),
      categoria: this.form.categoria,
      ativo: this.form.ativo,
      observacao: this.form.observacao.trim() || null,
    };

    const req = this.despesa
      ? this.despesaService.atualizar(this.despesa.id, payload)
      : this.despesaService.criar(payload);

    req.subscribe({
      next: () => {
        this.salvando = false;
        this.modalCtrl.dismiss(true, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar despesa.');
      },
    });
  }
}
