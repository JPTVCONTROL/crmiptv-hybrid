import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PainelCreditoService } from '../../../core/services/painel-credito.service';
import { ToastService } from '../../../core/services/toast.service';
import { PainelCredito } from '../../../core/models';

@Component({
  selector: 'app-editar-servidor-config-modal',
  templateUrl: './editar-servidor-config-modal.component.html',
})
export class EditarServidorConfigModalComponent implements OnInit {
  @Input() servidor!: PainelCredito;

  salvando = false;
  mostrarSenha = false;
  form = {
    nome: '',
    custoUnitario: 0,
    saldo: 0,
    creditosAdicionar: 0,
    urlPainel: '',
    loginPainel: '',
    senhaPainel: '',
    ativo: true,
  };

  constructor(
    private modalCtrl: ModalController,
    private painelCreditoService: PainelCreditoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.form = {
      nome: this.servidor.nome,
      custoUnitario: this.servidor.custoUnitario,
      saldo: this.servidor.saldo,
      creditosAdicionar: 0,
      urlPainel: this.servidor.urlPainel ?? '',
      loginPainel: this.servidor.loginPainel ?? '',
      senhaPainel: this.servidor.senhaPainel ?? '',
      ativo: this.servidor.ativo !== false,
    };
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      void this.toast.warning('Informe o nome do servidor/painel.');
      return;
    }

    if (this.form.custoUnitario < 0) {
      void this.toast.warning('Informe um valor válido por crédito.');
      return;
    }

    if (!Number.isInteger(this.form.saldo) || this.form.saldo < 0) {
      void this.toast.warning('Informe um saldo válido de créditos.');
      return;
    }

    this.salvando = true;

    this.painelCreditoService
      .atualizar(this.servidor.id, {
        nome: this.form.nome.trim(),
        custoUnitario: Number(this.form.custoUnitario),
        saldo: this.form.saldo,
        urlPainel: this.form.urlPainel.trim() || null,
        loginPainel: this.form.loginPainel.trim() || null,
        senhaPainel: this.form.senhaPainel.trim() || null,
        ativo: this.form.ativo,
      })
      .subscribe({
        next: (painelAtualizado) => {
          const adicionar = Number(this.form.creditosAdicionar) || 0;
          if (adicionar > 0) {
            this.painelCreditoService
              .adicionarCreditos(this.servidor.id, adicionar)
              .subscribe({
                next: (painelComCreditos) => {
                  this.finalizar(painelComCreditos);
                },
                error: (err) => {
                  this.salvando = false;
                  void this.toast.error(
                    err.message ?? 'Salvo, mas falhou ao adicionar créditos.'
                  );
                  this.modalCtrl.dismiss(painelAtualizado, 'partial');
                },
              });
            return;
          }

          this.finalizar(painelAtualizado);
        },
        error: (err) => {
          this.salvando = false;
          void this.toast.error(err.message ?? 'Erro ao salvar servidor.');
        },
      });
  }

  private finalizar(painel: PainelCredito): void {
    this.salvando = false;
    void this.toast.success('Servidor atualizado.');
    this.modalCtrl.dismiss(painel, 'confirm');
  }
}
