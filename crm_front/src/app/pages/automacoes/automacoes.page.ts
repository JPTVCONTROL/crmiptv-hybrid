import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AutomacaoService } from '../../core/services/automacao.service';
import { DadosSyncService } from '../../core/services/dados-sync.service';
import {
  AutomacaoConfig,
  AutomacaoPainel,
  EnvioAutomatico,
  ResultadoExecucaoAutomacao,
} from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import {
  vincularSincronizacaoPagina,
  DOMINIOS_SYNC_OPERACAO,
} from '../../shared/utils/page-sync.util';
import {
  CRONOGRAMA_COBRANCAS_AUTOMACAO,
  CRONOGRAMA_LEMBRETES_AUTOMACAO,
  rotuloPontoDisparo,
} from '../../shared/utils/automacao-disparo';
import { AUTOMACAO_META_HABILITADA } from '../../shared/utils/automacao-meta';

interface PassoChecklist {
  id: string;
  titulo: string;
  descricao: string;
  concluido: boolean;
}

interface ModeloMeta {
  nome: string;
  corpo: string;
}

@Component({
  selector: 'app-automacoes',
  templateUrl: './automacoes.page.html',
})
export class AutomacoesPage implements OnInit, OnDestroy {
  readonly automacaoMetaHabilitada = AUTOMACAO_META_HABILITADA;
  loading = true;
  salvando = false;
  executando = false;
  private readonly destroy$ = new Subject<void>();

  painel: AutomacaoPainel | null = null;
  form: AutomacaoConfig = this.formPadrao();
  ultimoResultado: ResultadoExecucaoAutomacao | null = null;

  readonly fluxosAtuais = [
    {
      titulo: 'Cobrança Diária',
      descricao: 'Envio manual em lote quando quiser revisar antes.',
      rota: '/cobranca-diaria',
      rotuloLink: 'Abrir Cobrança Diária',
    },
    {
      titulo: 'Configurações',
      descricao: 'PIX, empresa e dias de antecedência dos lembretes.',
      rota: '/configuracoes',
      rotuloLink: 'Abrir Configurações',
    },
  ];

  get modelosMeta(): ModeloMeta[] {
    const empresa = this.painel?.nomeEmpresa?.trim() || 'Sua empresa';
    return [
      {
        nome: 'crm_lembrete',
        corpo: `Olá {{1}}! Passando para lembrar da mensalidade {{2}}, no valor de {{3}}, com vencimento em {{4}}.

{{5}}

— ${empresa}`,
      },
      {
        nome: 'crm_cobranca',
        corpo: `Olá {{1}}! Sua mensalidade referente a {{2}}, no valor de {{3}}, venceu em {{4}}. Por favor, regularize seu pagamento.

{{5}}

— ${empresa}`,
      },
    ];
  }

  readonly linkGerenciadorMeta =
    'https://business.facebook.com/wa/manage/message-templates/';

  constructor(
    private automacaoService: AutomacaoService,
    private toast: ToastService,
    private sync: DadosSyncService
  ) {}

  ngOnInit(): void {
    if (this.automacaoMetaHabilitada) {
      this.carregar();
    } else {
      this.loading = false;
    }
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      DOMINIOS_SYNC_OPERACAO,
      () => this.carregar(true)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    if (!this.loading) {
      this.carregar(true);
    }
  }

  readonly cronogramaLembretes = CRONOGRAMA_LEMBRETES_AUTOMACAO;
  readonly cronogramaCobrancas = CRONOGRAMA_COBRANCAS_AUTOMACAO;

  get diasAntecedencia(): number {
    return this.painel?.diasAntecedencia ?? 5;
  }

  get whatsappConfigurado(): boolean {
    return this.painel?.whatsappConfigurado ?? false;
  }

  get whatsappPerfil() {
    return this.painel?.whatsappPerfil ?? null;
  }

  get whatsappResumoLinha(): string {
    const perfil = this.whatsappPerfil;
    if (!perfil) {
      return this.whatsappConfigurado
        ? 'Credenciais no .env detectadas.'
        : 'API não configurada.';
    }
    const partes: string[] = [];
    if (perfil.displayPhoneNumber) {
      partes.push(perfil.displayPhoneNumber);
    }
    partes.push(`ID ${perfil.phoneNumberId}`);
    if (perfil.verifiedName) {
      partes.push(perfil.verifiedName);
    }
    return partes.join(' · ');
  }

  get whatsappTokenOk(): boolean {
    return this.whatsappPerfil?.tokenValido === true;
  }

  get whatsappBadgeTexto(): string {
    if (!this.whatsappConfigurado) return 'API não configurada';
    if (this.whatsappPerfil && !this.whatsappTokenOk) return 'Token Meta expirado';
    return 'API configurada';
  }

  get whatsappBadgeOk(): boolean {
    return this.whatsappConfigurado && (this.whatsappTokenOk || !this.whatsappPerfil);
  }

  get envios(): EnvioAutomatico[] {
    return this.painel?.envios ?? [];
  }

  get simulacaoLeitura(): string {
    if (!this.painel) return '—';
    const { lembretes, cobrancas } = this.painel.simulacao;
    return `${lembretes} lembrete(s) · ${cobrancas} cobrança(s) no gatilho de hoje`;
  }

  contagemPonto(ponto: string): number {
    return this.painel?.simulacao?.porPonto?.[ponto] ?? 0;
  }

  get simulacaoTotal(): number {
    if (!this.painel?.simulacao) return 0;
    return this.painel.simulacao.lembretes + this.painel.simulacao.cobrancas;
  }

  get templatesProntos(): boolean {
    return (
      this.painel?.templatesProntos ??
      this.painel?.envioComSucesso ??
      this.form.templatesMetaAtivos ??
      false
    );
  }

  get aguardandoTemplatesMeta(): boolean {
    return this.whatsappConfigurado && !this.templatesProntos;
  }

  get templatesAprovadosNaMeta(): boolean {
    return this.form.templatesMetaAtivos === true;
  }

  get janelaManhaTexto(): string {
    const inicio =
      this.painel?.janelaManha?.inicio ??
      this.form.horarioInicioManha ??
      '08:00';
    const fim =
      this.painel?.janelaManha?.fim ?? this.form.horarioFimManha ?? '09:00';
    return `${inicio}–${fim}`;
  }

  get filaHojeResumo(): string {
    const fila = this.painel?.filaHoje;
    if (!fila) return '—';
    if (fila.pendentes + fila.enviados + fila.falhas === 0) {
      return 'Fila ainda não montada hoje';
    }
    return `${fila.pendentes} pendente(s) · ${fila.enviados} enviado(s) · ${fila.falhas} falha(s)`;
  }

  get automacoesAtivas(): boolean {
    return this.form.lembretesAtivos || this.form.cobrancaAtrasadosAtiva;
  }

  get passosChecklist(): PassoChecklist[] {
    return [
      {
        id: 'env',
        titulo: 'Credenciais no backend',
        descricao: this.whatsappPerfil
          ? `${this.whatsappResumoLinha}${this.whatsappTokenOk ? ' · token validado na Meta' : this.whatsappPerfil.erro ? ` · ${this.whatsappPerfil.erro}` : ''}`
          : 'WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no crm_back/.env.',
        concluido: this.whatsappConfigurado && this.whatsappTokenOk,
      },
      {
        id: 'pix',
        titulo: 'PIX e empresa no CRM',
        descricao: 'Configurações → dados da empresa e chave PIX (5ª variável do template).',
        concluido: this.painel?.pixConfigurado ?? false,
      },
      {
        id: 'templates',
        titulo: 'Templates Meta aprovados',
        descricao: this.templatesProntos
          ? 'crm_lembrete e crm_cobranca aprovados e liberados no CRM.'
          : 'crm_lembrete e crm_cobranca (Utility, pt_BR) — confirme após status Ativo na Meta.',
        concluido: this.templatesProntos,
      },
      {
        id: 'teste',
        titulo: 'Números de teste na Meta',
        descricao:
          'App não publicado: cadastre destinatários em Meta → WhatsApp → Teste (ex.: seu celular).',
        concluido: this.templatesProntos,
      },
    ];
  }

  get passosConcluidos(): number {
    return this.passosChecklist.filter((p) => p.concluido).length;
  }

  carregar(silencioso = false): void {
    if (!silencioso) {
      this.loading = true;
    }
    this.automacaoService.obterPainel().subscribe({
      next: (painel) => {
        this.painel = painel;
        this.form = { ...painel.config };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        void this.toast.error('Erro ao carregar automações.');
      },
    });
  }

  confirmarTemplatesAprovados(): void {
    this.salvando = true;
    this.automacaoService.salvar({ templatesMetaAtivos: true }).subscribe({
      next: (config) => {
        this.form = { ...this.form, ...config };
        this.salvando = false;
        void this.toast.success(
          'Modelos crm_lembrete e crm_cobranca marcados como aprovados. Você já pode ativar o envio automático.'
        );
        this.carregar(true);
      },
      error: (err: Error) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar.');
      },
    });
  }

  salvar(): void {
    this.salvando = true;
    const payload: Partial<AutomacaoConfig> = {
      ...this.form,
    };

    this.automacaoService.salvar(payload).subscribe({
      next: (config) => {
        this.form = { ...config };
        this.salvando = false;
        void this.toast.success('Automações salvas.');
        this.carregar();
      },
      error: (err: Error) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar.');
      },
    });
  }

  executarAgora(): void {
    this.executando = true;
    this.ultimoResultado = null;
    this.automacaoService.executar().subscribe({
      next: (resultado) => {
        this.executando = false;
        this.ultimoResultado = resultado;
        void this.toast.success(
          `Rotina concluída: ${resultado.enviados} enviado(s), ${resultado.falhas} falha(s), ${resultado.ignorados} ignorado(s).`
        );
        this.carregar();
      },
      error: (err: Error) => {
        this.executando = false;
        void this.toast.error(err.message ?? 'Erro ao executar.');
      },
    });
  }

  async copiarTexto(texto: string, rotulo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      void this.toast.success(`${rotulo} copiado.`);
    } catch {
      void this.toast.error('Não foi possível copiar.');
    }
  }

  rotuloStatusEnvio(status: string): string {
    if (status === 'ENVIADO') return 'Enviado';
    if (status === 'FALHA') return 'Falha';
    if (status === 'PENDENTE') return 'Pendente';
    return status;
  }

  rotuloTipoEnvio(tipo: string, pontoDisparo?: string | null): string {
    if (pontoDisparo) {
      return rotuloPontoDisparo(pontoDisparo);
    }
    if (tipo === 'LEMBRETE') return 'Lembrete';
    if (tipo === 'COBRANCA') return 'Cobrança';
    return tipo;
  }

  classesStatusEnvio(status: string): Record<string, boolean> {
    if (status === 'ENVIADO') return { 'crm-badge-ativo': true };
    if (status === 'FALHA') return { 'crm-badge-inativo': true };
    return { 'crm-badge-neutral': true };
  }

  fmtDataHora(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR');
  }

  private formPadrao(): AutomacaoConfig {
    return {
      lembretesAtivos: false,
      cobrancaAtrasadosAtiva: false,
      horariosEnvio: '08:00',
      horarioInicioManha: '08:00',
      horarioFimManha: '09:00',
      intervaloAtrasadosDias: 3,
      templateLembreteNome: 'crm_lembrete',
      templateCobrancaNome: 'crm_cobranca',
      templateLinguagem: 'pt_BR',
      templatesMetaAtivos: false,
    };
  }
}
