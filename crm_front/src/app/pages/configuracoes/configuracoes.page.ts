import { Component, OnInit } from '@angular/core';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { Configuracao } from '../../core/models';

@Component({
  selector: 'app-configuracoes',
  templateUrl: './configuracoes.page.html',
})
export class ConfiguracoesPage implements OnInit {
  loading = true;
  salvando = false;
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

  constructor(private configuracaoService: ConfiguracaoService) {}

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
        alert('Configurações salvas com sucesso!');
      },
      error: (err) => {
        this.salvando = false;
        alert(err.message ?? 'Erro ao salvar.');
      },
    });
  }
}
