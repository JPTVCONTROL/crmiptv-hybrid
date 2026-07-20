import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CampanhaService } from '../../core/services/campanha.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { ToastService } from '../../core/services/toast.service';
import { Campanha, TipoCampanha } from '../../core/models';
import {
  MENSAGEM_CAMPANHA_PADRAO,
  montarMensagemCampanha,
  rotuloTipoCampanha,
} from '../../shared/utils/campanha';

@Component({
  selector: 'app-campanha-form-modal',
  templateUrl: './campanha-form-modal.component.html',
})
export class CampanhaFormModalComponent implements OnInit {
  @Input() campanha: Campanha | null = null;

  salvando = false;
  formTitulo = '';
  formTipo: TipoCampanha = 'AVISO';
  formMensagem = MENSAGEM_CAMPANHA_PADRAO;

  readonly tiposCampanha: TipoCampanha[] = ['AVISO', 'PROMOCAO', 'DATA_COMEMORATIVA'];
  readonly rotuloTipoCampanha = rotuloTipoCampanha;

  constructor(
    private modalCtrl: ModalController,
    private campanhaService: CampanhaService,
    private configuracaoService: ConfiguracaoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.campanha) {
      this.formTitulo = this.campanha.titulo;
      this.formTipo = this.campanha.tipo;
      this.formMensagem = this.campanha.mensagem;
    }
  }

  get empresa(): string {
    return this.configuracaoService.getSnapshot()?.nomeEmpresa?.trim() || 'JPTV';
  }

  get previewMensagem(): string {
    return montarMensagemCampanha(
      this.formMensagem.trim() || MENSAGEM_CAMPANHA_PADRAO,
      'João'
    );
  }

  fechar(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    const titulo = this.formTitulo.trim();
    const mensagem = this.formMensagem.trim();

    if (!titulo || !mensagem) {
      void this.toast.warning('Preencha título e mensagem da campanha.');
      return;
    }

    this.salvando = true;
    const payload = { titulo, tipo: this.formTipo, mensagem };
    const req = this.campanha
      ? this.campanhaService.atualizar(this.campanha.id, payload)
      : this.campanhaService.criar(payload);

    req.subscribe({
      next: (campanha) => {
        this.salvando = false;
        void this.toast.success(
          this.campanha ? 'Campanha atualizada.' : 'Campanha criada.'
        );
        void this.modalCtrl.dismiss(campanha, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar campanha.');
      },
    });
  }
}
