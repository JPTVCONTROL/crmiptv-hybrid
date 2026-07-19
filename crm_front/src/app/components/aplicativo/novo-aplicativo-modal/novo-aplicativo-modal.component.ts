import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AplicativoService } from '../../../core/services/aplicativo.service';
import { ToastService } from '../../../core/services/toast.service';
import { Aplicativo } from '../../../core/models';

@Component({
  selector: 'app-novo-aplicativo-modal',
  templateUrl: './novo-aplicativo-modal.component.html',
})
export class NovoAplicativoModalComponent implements OnInit {
  @Input() aplicativo: Aplicativo | null = null;

  salvando = false;
  logoErro = false;
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
    requerMac: false,
    requerDeviceKey: false,
    requerCodigo: false,
    ativo: true,
  };

  constructor(
    private modalCtrl: ModalController,
    private aplicativoService: AplicativoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.aplicativo) {
      this.form = {
        nome: this.aplicativo.nome,
        descricao: this.aplicativo.descricao ?? '',
        logo: this.aplicativo.logo ?? '',
        android: this.aplicativo.android ?? '',
        androidTv: this.aplicativo.androidTv ?? '',
        ios: this.aplicativo.ios ?? '',
        windows: this.aplicativo.windows ?? '',
        mac: this.aplicativo.mac ?? '',
        tutorial: this.aplicativo.tutorial ?? '',
        mensagem: this.aplicativo.mensagem ?? '',
        requerMac: this.aplicativo.requerMac,
        requerDeviceKey: this.aplicativo.requerDeviceKey,
        requerCodigo: this.aplicativo.requerCodigo,
        ativo: this.aplicativo.ativo,
      };
    }
  }

  get logoPreview(): string | null {
    return this.form.logo.trim() || null;
  }

  onLogoUrlChange(): void {
    this.logoErro = false;
  }

  onLogoErro(): void {
    this.logoErro = true;
  }

  onLogoArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      void this.toast.warning('Selecione um arquivo de imagem (PNG, JPG, WEBP...).');
      input.value = '';
      return;
    }

    if (file.size > 500_000) {
      void this.toast.warning('Imagem muito grande. Use até 500 KB ou informe uma URL.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.form.logo = reader.result as string;
      this.logoErro = false;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removerLogo(): void {
    this.form.logo = '';
    this.logoErro = false;
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      void this.toast.warning('Informe o nome do aplicativo.');
      return;
    }

    this.salvando = true;
    const req = this.aplicativo
      ? this.aplicativoService.atualizar(this.aplicativo.id, this.form)
      : this.aplicativoService.criar(this.form);

    req.subscribe({
      next: () => {
        this.salvando = false;
        this.modalCtrl.dismiss(true, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar aplicativo.');
      },
    });
  }
}
