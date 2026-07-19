import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DispositivoService } from '../../../core/services/dispositivo.service';
import { Dispositivo } from '../../../core/models';

@Component({
  selector: 'app-novo-dispositivo-modal',
  templateUrl: './novo-dispositivo-modal.component.html',
})
export class NovoDispositivoModalComponent implements OnInit {
  @Input() dispositivo: Dispositivo | null = null;

  salvando = false;
  form = {
    nome: '',
    modelo: '',
    descricao: '',
    ativo: true,
  };

  constructor(
    private modalCtrl: ModalController,
    private dispositivoService: DispositivoService
  ) {}

  ngOnInit(): void {
    if (this.dispositivo) {
      this.form = {
        nome: this.dispositivo.nome,
        modelo: this.dispositivo.modelo ?? '',
        descricao: this.dispositivo.descricao ?? '',
        ativo: this.dispositivo.ativo,
      };
    }
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      alert('Informe o nome do dispositivo.');
      return;
    }

    this.salvando = true;
    const req = this.dispositivo
      ? this.dispositivoService.atualizar(this.dispositivo.id, this.form)
      : this.dispositivoService.criar(this.form);

    req.subscribe({
      next: () => {
        this.salvando = false;
        this.modalCtrl.dismiss(true, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        alert(err.message ?? 'Erro ao salvar dispositivo.');
      },
    });
  }
}
