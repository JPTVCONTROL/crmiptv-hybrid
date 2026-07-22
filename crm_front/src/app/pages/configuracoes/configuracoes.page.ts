import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { SistemaService } from '../../core/services/sistema.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { AuthService } from '../../core/services/auth.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
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
import {
  META_NOVOS_CLIENTES_DIAS_PADRAO,
  META_NOVOS_CLIENTES_QTD_PADRAO,
  dataIsoParaInput,
  formatarDataCurta,
  metaNovosClientesPadrao,
  normalizarMetaNovosClientesFimEm,
  normalizarMetaNovosClientesInicioEm,
  normalizarMetaNovosClientesQtd,
  rotuloJanelaMetaNovosClientes,
  rotuloPrazoMetaNovosClientes,
  formatarDataInput,
} from '../../shared/utils/meta-novos-clientes.util';
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';
import {
  lerSessionJson,
  salvarSessionJson,
} from '../../shared/utils/session-persist.util';
import { AUTOMACAO_META_HABILITADA } from '../../shared/utils/automacao-meta';

type AbaConfiguracao = 'conta' | 'empresa' | 'metas' | 'mensagens' | 'sistema';
type SubAbaMensagens = 'manual' | 'automatico';

const CHAVE_ABA_CONFIG = 'crm.config.abaAtiva';
const CHAVE_SUB_ABA_MENSAGENS = 'crm.config.subAbaMensagens';
const ABAS_VALIDAS = new Set<AbaConfiguracao>([
  'conta',
  'empresa',
  'metas',
  'mensagens',
  'sistema',
]);
const SUB_ABAS_MENSAGENS_VALIDAS = new Set<SubAbaMensagens>([
  'manual',
  'automatico',
]);

@Component({
  selector: 'app-configuracoes',
  templateUrl: './configuracoes.page.html',
})
export class ConfiguracoesPage implements OnInit, OnDestroy {
  readonly automacaoMetaHabilitada = AUTOMACAO_META_HABILITADA;
  loading = true;
  abaAtiva: AbaConfiguracao = 'empresa';
  subAbaMensagens: SubAbaMensagens = 'manual';
  private readonly destroy$ = new Subject<void>();
  salvando = false;
  salvandoMeta = false;
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
    metaNovosClientesQtd: META_NOVOS_CLIENTES_QTD_PADRAO,
    metaNovosClientesDias: META_NOVOS_CLIENTES_DIAS_PADRAO,
    metaNovosClientesInicioEm: metaNovosClientesPadrao().inicioEm,
    metaNovosClientesFimEm: metaNovosClientesPadrao().fimEm,
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

  readonly abas: { id: AbaConfiguracao; rotulo: string; subtitulo: string }[] = [
    {
      id: 'conta',
      rotulo: 'Conta',
      subtitulo: 'Senha de acesso ao CRM.',
    },
    {
      id: 'empresa',
      rotulo: 'Empresa',
      subtitulo: 'Dados da empresa e PIX.',
    },
    {
      id: 'metas',
      rotulo: 'Metas',
      subtitulo: 'Meta da base comercial (sem cortesia e somente cadastro).',
    },
    {
      id: 'mensagens',
      rotulo: 'Mensagens',
      subtitulo: AUTOMACAO_META_HABILITADA
        ? 'Templates do WhatsApp manual e da API oficial (Meta).'
        : 'Templates do WhatsApp manual (WhatsApp Web).',
    },
    {
      id: 'sistema',
      rotulo: 'Sistema',
      subtitulo: 'Aparência, backup e sincronização.',
    },
  ];

  readonly subAbasMensagens: {
    id: SubAbaMensagens;
    rotulo: string;
    descricao: string;
  }[] = [
    {
      id: 'manual',
      rotulo: 'Manual (WhatsApp Web)',
      descricao:
        'Textos abertos ao clicar em Cobrar, Conta ativada, Renovar, Bloqueio etc. Abre o WhatsApp no navegador com a mensagem pronta.',
    },
    {
      id: 'automatico',
      rotulo: 'Automático (API Meta)',
      descricao:
        'Textos usados pelo envio automático (Automações). Devem estar alinhados com os modelos aprovados crm_lembrete e crm_cobranca na Meta.',
    },
  ];

  get subAbasMensagensVisiveis(): typeof this.subAbasMensagens {
    return AUTOMACAO_META_HABILITADA
      ? this.subAbasMensagens
      : this.subAbasMensagens.filter((s) => s.id === 'manual');
  }

  get metaPreviewRotulo(): string {
    return rotuloJanelaMetaNovosClientes(
      this.form.metaNovosClientesInicioEm,
      this.form.metaNovosClientesFimEm
    );
  }

  get metaPreviewPrazo(): string {
    const fim = this.form.metaNovosClientesFimEm;
    if (!fim) {
      return 'Defina a data final da meta';
    }

    const hoje = formatarDataInput(new Date());
    const encerrada = fim < hoje;

    return rotuloPrazoMetaNovosClientes(fim, encerrada, encerrada ? 0 : 1);
  }

  readonly variaveisContaAtivada = [
    '{nome}',
    '{empresa}',
    '{expiraEm}',
    '{proximaRenovacao}',
    '{servidor}',
    '{usuario}',
    '{senha}',
    '{app}',
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
    '{linhaPix}',
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
    '{linhaPix}',
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

  formatarDataCurta = formatarDataCurta;
  formatarDataInput = formatarDataInput;

  constructor(
    private configuracaoService: ConfiguracaoService,
    private sistemaService: SistemaService,
    private authService: AuthService,
    private tema: TemaService,
    private toast: ToastService,
    private sync: DadosSyncService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.restaurarAba();
    this.restaurarSubAbaMensagens();
    this.route.queryParamMap.subscribe((params) => {
      const aba = params.get('aba');
      if (aba && ABAS_VALIDAS.has(aba as AbaConfiguracao)) {
        this.definirAba(aba as AbaConfiguracao, false);
      }
    });
    this.carregarConfig();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['configuracoes'],
      () => this.carregarConfig(true)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregarConfig(true);
    }
  }

  private carregarConfig(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }
    this.configuracaoService.carregar().subscribe({
      next: (dados) => {
        const metaPadrao = metaNovosClientesPadrao();
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
          metaNovosClientesQtd: normalizarMetaNovosClientesQtd(
            dados.metaNovosClientesQtd
          ),
          metaNovosClientesDias:
            dados.metaNovosClientesDias ?? META_NOVOS_CLIENTES_DIAS_PADRAO,
          metaNovosClientesInicioEm:
            dataIsoParaInput(dados.metaNovosClientesInicioEm) ||
            metaPadrao.inicioEm,
          metaNovosClientesFimEm:
            dataIsoParaInput(dados.metaNovosClientesFimEm) || metaPadrao.fimEm,
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
    this.tema.aplicar(cor);
  }

  definirAba(aba: AbaConfiguracao, persistir = true): void {
    this.abaAtiva = aba;
    if (persistir) {
      salvarSessionJson(CHAVE_ABA_CONFIG, aba);
    }
  }

  definirSubAbaMensagens(subAba: SubAbaMensagens): void {
    this.subAbaMensagens = subAba;
    salvarSessionJson(CHAVE_SUB_ABA_MENSAGENS, subAba);
  }

  private restaurarAba(): void {
    const salva = lerSessionJson<string>(CHAVE_ABA_CONFIG);
    if (salva && ABAS_VALIDAS.has(salva as AbaConfiguracao)) {
      this.abaAtiva = salva as AbaConfiguracao;
    }
  }

  private restaurarSubAbaMensagens(): void {
    if (!AUTOMACAO_META_HABILITADA) {
      this.subAbaMensagens = 'manual';
      return;
    }

    const salva = lerSessionJson<string>(CHAVE_SUB_ABA_MENSAGENS);
    if (salva && SUB_ABAS_MENSAGENS_VALIDAS.has(salva as SubAbaMensagens)) {
      this.subAbaMensagens = salva as SubAbaMensagens;
    }
  }

  classesSubAbaMensagens(subAba: SubAbaMensagens): string {
    return subAba === this.subAbaMensagens
      ? 'crm-filter-chip crm-filter-chip--selected-violet'
      : 'crm-filter-chip crm-filter-chip--idle';
  }

  classesAba(aba: AbaConfiguracao): string {
    return aba === this.abaAtiva
      ? 'crm-filter-chip crm-filter-chip--selected-violet'
      : 'crm-filter-chip crm-filter-chip--idle';
  }

  preVisualizarCor(): void {
    const cor = normalizarCorHex(this.form.corPrincipal);
    this.form.corPrincipal = cor;
    this.tema.aplicar(cor);
    void this.toast.info('Pré-visualização aplicada. Salve para manter.');
  }

  aplicarCorPreview(cor?: string | null): void {
    this.tema.aplicar(cor);
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
    if (this.abaAtiva === 'metas') {
      this.salvarMeta();
      return;
    }

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

  private normalizarFormMeta(): void {
    this.form.metaNovosClientesQtd = normalizarMetaNovosClientesQtd(
      this.form.metaNovosClientesQtd
    );
    this.form.metaNovosClientesInicioEm = normalizarMetaNovosClientesInicioEm(
      this.form.metaNovosClientesInicioEm
    );
    this.form.metaNovosClientesFimEm = normalizarMetaNovosClientesFimEm(
      this.form.metaNovosClientesFimEm,
      this.form.metaNovosClientesInicioEm
    );
  }

  salvarMeta(): void {
    this.normalizarFormMeta();
    this.salvandoMeta = true;

    this.configuracaoService
      .salvar({
        metaNovosClientesQtd: this.form.metaNovosClientesQtd,
        metaNovosClientesInicioEm: this.form.metaNovosClientesInicioEm,
        metaNovosClientesFimEm: this.form.metaNovosClientesFimEm,
      })
      .subscribe({
        next: () => {
          this.salvandoMeta = false;
          void this.toast.success('Meta de clientes salva!');
        },
        error: (err) => {
          this.salvandoMeta = false;
          void this.toast.error(err.message ?? 'Erro ao salvar meta.');
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
