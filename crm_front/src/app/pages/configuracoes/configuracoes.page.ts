import { Component, OnInit } from '@angular/core';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Configuracao } from '../../core/models';

@Component({
  selector: 'app-configuracoes',
  templateUrl: './configuracoes.page.html',
})
export class ConfiguracoesPage implements OnInit {
  loading = true;
  salvando = false;
  alterandoSenha = false;
  senhaAtual = '';
  novaSenha = '';
  confirmarSenha = '';
  form: Configuracao = {
    nomeEmpresa: 'JPTV',
    whatsapp: '',
    email: '',
    site: '',
    instagram: '',
    chavePix: '',
    tipoPix: '',
    favorecidoPix: '',
    mensagemCobranca: '',
    mensagemRenovacao: '',
    mensagemRecibo: '',
    mensagemBloqueio: '',
  };

  readonly variaveisCobranca = [
    '{nome}',
    '{referencia}',
    '{valor}',
    '{vencimento}',
    '{empresa}',
    '{pix}',
    '{tipoPix}',
    '{favorecido}',
  ];

  readonly variaveisRenovacao = [
    '{nome}',
    '{referencia}',
    '{valor}',
    '{vencimento}',
    '{expiraEm}',
    '{empresa}',
  ];

  readonly variaveisRecibo = [
    '{nome}',
    '{referencia}',
    '{valor}',
    '{pagoEm}',
    '{empresa}',
  ];

  readonly variaveisBloqueio = [
    '{nome}',
    '{referencia}',
    '{valor}',
    '{vencimento}',
    '{empresa}',
    '{pix}',
    '{tipoPix}',
    '{favorecido}',
  ];

  constructor(
    private configuracaoService: ConfiguracaoService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.configuracaoService.carregar().subscribe({
      next: (dados) => {
        this.form = {
          nomeEmpresa: dados.nomeEmpresa ?? 'JPTV',
          whatsapp: dados.whatsapp ?? '',
          email: dados.email ?? '',
          site: dados.site ?? '',
          instagram: dados.instagram ?? '',
          chavePix: dados.chavePix ?? '',
          tipoPix: dados.tipoPix ?? '',
          favorecidoPix: dados.favorecidoPix ?? '',
          mensagemCobranca: dados.mensagemCobranca ?? '',
          mensagemRenovacao: dados.mensagemRenovacao ?? '',
          mensagemRecibo: dados.mensagemRecibo ?? '',
          mensagemBloqueio: dados.mensagemBloqueio ?? '',
        };
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  salvar(): void {
    this.salvando = true;
    this.configuracaoService.salvar(this.form).subscribe({
      next: () => {
        this.salvando = false;
        void this.toast.success('Configurações salvas com sucesso!');
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar.');
      },
    });
  }

  alterarSenha(): void {
    if (!this.senhaAtual || !this.novaSenha) {
      void this.toast.warning('Informe a senha atual e a nova senha.');
      return;
    }

    if (this.novaSenha.length < 6) {
      void this.toast.warning('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (this.novaSenha !== this.confirmarSenha) {
      void this.toast.warning('A confirmação da nova senha não confere.');
      return;
    }

    this.alterandoSenha = true;
    this.authService.alterarSenha(this.senhaAtual, this.novaSenha).subscribe({
      next: () => {
        this.alterandoSenha = false;
        this.senhaAtual = '';
        this.novaSenha = '';
        this.confirmarSenha = '';
        void this.toast.success('Senha alterada com sucesso!');
      },
      error: (err) => {
        this.alterandoSenha = false;
        void this.toast.error(err.message ?? 'Erro ao alterar senha.');
      },
    });
  }
}
