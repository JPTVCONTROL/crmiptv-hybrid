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
import { vincularSincronizacaoPagina } from '../../shared/utils/page-sync.util';

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
  loading = true;
  salvando = false;
  executando = false;
  private readonly destroy$ = new Subject<void>();

  painel: AutomacaoPainel | null = null;
  form: AutomacaoConfig = this.formPadrao();
  horariosTexto = '09:00,18:00';
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
    this.carregar();
    vincularSincronizacaoPagina(
      this.sync,
      this.destroy$,
      ['clientes', 'mensalidades', 'configuracoes'],
      () => this.carregar(true)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get diasAntecedencia(): number {
    return this.painel?.diasAntecedencia ?? 5;
  }

  get whatsappConfigurado(): boolean {
    return this.painel?.whatsappConfigurado ?? false;
  }

  get envios(): EnvioAutomatico[] {
    return this.painel?.envios ?? [];
  }

  get simulacaoLeitura(): string {
    if (!this.painel) return '—';
    const { lembretes, cobrancas } = this.painel.simulacao;
    return `${lembretes} lembrete(s) · ${cobrancas} cobrança(s) elegíveis agora`;
  }

  get simulacaoTotal(): number {
    if (!this.painel?.simulacao) return 0;
    return this.painel.simulacao.lembretes + this.painel.simulacao.cobrancas;
  }

  get templatesProntos(): boolean {
    return this.painel?.envioComSucesso ?? false;
  }

  get aguardandoTemplatesMeta(): boolean {
    return this.whatsappConfigurado && !this.templatesProntos;
  }

  get automacoesAtivas(): boolean {
    return this.form.lembretesAtivos || this.form.cobrancaAtrasadosAtiva;
  }

  get passosChecklist(): PassoChecklist[] {
    return [
      {
        id: 'env',
        titulo: 'Credenciais no backend',
        descricao: 'WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no crm_back/.env.',
        concluido: this.whatsappConfigurado,
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
        descricao: this.aguardandoTemplatesMeta
          ? 'crm_lembrete e crm_cobranca em análise — aguarde status Ativo no Gerenciador do WhatsApp.'
          : 'crm_lembrete e crm_cobranca (Utility, pt_BR) com status Ativo.',
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
        this.horariosTexto = painel.horarios.join(', ');
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        void this.toast.error('Erro ao carregar automações.');
      },
    });
  }

  salvar(): void {
    this.salvando = true;
    const payload: Partial<AutomacaoConfig> = {
      ...this.form,
      horariosEnvio: this.horariosTexto,
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

  rotuloTipoEnvio(tipo: string): string {
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
      horariosEnvio: '09:00,18:00',
      intervaloAtrasadosDias: 3,
      templateLembreteNome: 'crm_lembrete',
      templateCobrancaNome: 'crm_cobranca',
      templateLinguagem: 'pt_BR',
    };
  }
}
