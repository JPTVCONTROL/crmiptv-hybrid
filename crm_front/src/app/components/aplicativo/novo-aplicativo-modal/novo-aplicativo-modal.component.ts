import { ModalController } from '@ionic/angular';
import { AplicativoService } from '../../../core/services/aplicativo.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-novo-aplicativo-modal',
  templateUrl: './novo-aplicativo-modal.component.html',
})
export class NovoAplicativoModalComponent {
  salvando = false;
  form = {
    nome: '',
    descricao: '',
    logo: '',
    android: '',
    androidTv: '',
    ios: '',
    windows: '',
    mac: '',
    tutorial: '',
    mensagem: '',
    ativo: true,
  };

  constructor(
    private modalCtrl: ModalController,
    private aplicativoService: AplicativoService
  ) {}

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      alert('Informe o nome do aplicativo.');
      return;
    }

    this.salvando = true;
    this.aplicativoService.criar(this.form).subscribe({
      next: () => {
        this.salvando = false;
        this.modalCtrl.dismiss(true, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        alert(err.message ?? 'Erro ao salvar aplicativo.');
      },
    });
  }
}
