import { Component, OnInit } from '@angular/core';
import { SistemaService } from '../../core/services/sistema.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TemaService } from '../../core/services/tema.service';
import { Configuracao } from '../../core/models';
import { COR_TEMA_PADRAO, normalizarCorHex } from '../../shared/utils/cor-tema';
import {
  CampoMensagemConfig,
  MENSAGENS_PADRAO,
  resolverTextoMensagem,
} from '../../shared/utils/mensagens-padrao';
import { DIAS_ANTECEDENCIA_LEMBRETE_PADRAO } from '../../shared/utils/cobranca-diaria';

@Component({
  selector: 'app-configuracoes',
  templateUrl: './configuracoes.page.html',
})
export class ConfiguracoesPage implements OnInit {
  loading = true;
  salvando = false;
  baixandoBackup = false;
  sincronizandoCobrancas = false;
  ultimaSincronizacao = '';
  alterandoSenha = false;
  mostrarFormSenha = false;
  senhaAtual = '';
  novaSenha = '';
  confirmarSenha = '';
  corSalva = COR_TEMA_PADRAO;
  form: Configuracao = {
    nomeEmpresa: 'JPTV',
    whatsapp: '',
    email: '',
    site: '',
    instagram: '',
    chavePix: '',
    tipoPix: '',
    favorecidoPix: '',
    corPrincipal: COR_TEMA_PADRAO,
    diasAntecedenciaLembrete: DIAS_ANTECEDENCIA_LEMBRETE_PADRAO,
    mensagemBoasVindas: MENSAGENS_PADRAO.mensagemBoasVindas,
    mensagemCobranca: MENSAGENS_PADRAO.mensagemCobranca,
    mensagemLembrete: MENSAGENS_PADRAO.mensagemLembrete,
    mensagemRenovacao: MENSAGENS_PADRAO.mensagemRenovacao,
    mensagemRecibo: MENSAGENS_PADRAO.mensagemRecibo,
    mensagemBloqueio: MENSAGENS_PADRAO.mensagemBloqueio,
  };

  readonly coresSugeridas = [
    '#7C3AED',
    '#2563EB',
    '#059669',
    '#DC2626',
    '#EA580C',
    '#DB2777',
  ];

  readonly variaveisBoasVindas = [
    '{nome}',
    '{empresa}',
    '{servidor}',
    '{usuario}',
    '{senha}',
    '{app}',
    '{expiraEm}',
    '{valor}',
    '{pix}',
    '{tipoPix}',
    '{favorecido}',
  ];

  readonly variaveisLembrete = [
    '{nome}',
    '{referencia}',
    '{valor}',
    '{vencimento}',
    '{empresa}',
    '{pix}',
    '{tipoPix}',
    '{favorecido}',
  ];

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
    private sistemaService: SistemaService,
    private authService: AuthService,
    private tema: TemaService,
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
          corPrincipal: dados.corPrincipal ?? COR_TEMA_PADRAO,
          diasAntecedenciaLembrete:
            dados.diasAntecedenciaLembrete ?? DIAS_ANTECEDENCIA_LEMBRETE_PADRAO,
          mensagemBoasVindas: resolverTextoMensagem(
            dados.mensagemBoasVindas,
            MENSAGENS_PADRAO.mensagemBoasVindas
          ),
          mensagemCobranca: resolverTextoMensagem(
            dados.mensagemCobranca,
            MENSAGENS_PADRAO.mensagemCobranca
          ),
          mensagemLembrete: resolverTextoMensagem(
            dados.mensagemLembrete,
            MENSAGENS_PADRAO.mensagemLembrete
          ),
          mensagemRenovacao: resolverTextoMensagem(
            dados.mensagemRenovacao,
            MENSAGENS_PADRAO.mensagemRenovacao
          ),
          mensagemRecibo: resolverTextoMensagem(
            dados.mensagemRecibo,
            MENSAGENS_PADRAO.mensagemRecibo
          ),
          mensagemBloqueio: resolverTextoMensagem(
            dados.mensagemBloqueio,
            MENSAGENS_PADRAO.mensagemBloqueio
          ),
        };
        this.corSalva = this.form.corPrincipal ?? COR_TEMA_PADRAO;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  definirCorSugerida(cor: string): void {
    this.form.corPrincipal = cor;
  }

  preVisualizarCor(): void {
    const cor = normalizarCorHex(this.form.corPrincipal);
    this.form.corPrincipal = cor;
    this.tema.aplicar(cor);
    void this.toast.info('Pré-visualização aplicada. Salve para manter.');
  }

  restaurarMensagem(campo: CampoMensagemConfig): void {
    this.form[campo] = MENSAGENS_PADRAO[campo];
    void this.toast.info('Mensagem padrão restaurada. Salve para manter.');
  }

  ionViewWillLeave(): void {
    if ((this.form.corPrincipal ?? COR_TEMA_PADRAO) !== this.corSalva) {
      this.tema.aplicar(this.corSalva);
    }
  }

  salvar(): void {
    this.salvando = true;
    this.configuracaoService.salvar(this.form).subscribe({
      next: () => {
        this.salvando = false;
        this.corSalva = normalizarCorHex(this.form.corPrincipal);
        void this.toast.success('Configurações salvas com sucesso!');
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar.');
      },
    });
  }

  baixarBackup(): void {
    this.baixandoBackup = true;
    this.sistemaService.baixarBackup().subscribe({
      next: async (blob) => {
        try {
          if (blob.type.includes('json') || blob.type.includes('text')) {
            const texto = await blob.text();
            const erro = JSON.parse(texto) as { message?: string };
            throw new Error(erro.message ?? 'Erro ao baixar backup.');
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const data = new Date().toISOString().slice(0, 10);
          link.href = url;
          link.download = `crm-jptv-backup-${data}.db`;
          link.click();
          URL.revokeObjectURL(url);
          void this.toast.success('Backup baixado com sucesso.');
        } catch (err) {
          void this.toast.error(
            err instanceof Error ? err.message : 'Erro ao baixar backup.'
          );
        } finally {
          this.baixandoBackup = false;
        }
      },
      error: (err) => {
        this.baixandoBackup = false;
        void this.toast.error(err.message ?? 'Erro ao baixar backup.');
      },
    });
  }

  sincronizarCobrancas(): void {
    this.sincronizandoCobrancas = true;
    this.sistemaService.sincronizarCobrancas().subscribe({
      next: (resultado) => {
        this.sincronizandoCobrancas = false;
        const hora = new Date().toLocaleString('pt-BR');
        this.ultimaSincronizacao = `Última sync: ${hora} — ${resultado.clientes} cliente(s), ${resultado.mensalidades} mensalidade(s) alinhada(s).`;
        void this.toast.success('Cobranças sincronizadas com sucesso.');
      },
      error: (err) => {
        this.sincronizandoCobrancas = false;
        void this.toast.error(err.message ?? 'Erro ao sincronizar cobranças.');
      },
    });
  }

  abrirFormSenha(): void {
    this.mostrarFormSenha = true;
  }

  cancelarAlteracaoSenha(): void {
    this.mostrarFormSenha = false;
    this.senhaAtual = '';
    this.novaSenha = '';
    this.confirmarSenha = '';
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
        this.cancelarAlteracaoSenha();
        void this.toast.success('Senha alterada com sucesso!');
      },
      error: (err) => {
        this.alterandoSenha = false;
        void this.toast.error(err.message ?? 'Erro ao alterar senha.');
      },
    });
  }
}
