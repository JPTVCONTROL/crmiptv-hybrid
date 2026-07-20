import type { AutomacaoConfig, Configuracao, Mensalidade } from '@prisma/client';
import { automacaoRepository } from '../repositories/automacaoRepository.js';
import { configuracaoRepository } from '../repositories/configuracaoRepository.js';
import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import {
  calcularDiasVencimento,
  clienteParticipaCobrancas,
  elegivelCobrancaDiaria,
  resolverDiasAntecedencia,
} from '../utils/helpers/cobrancaDiariaHelpers.js';
import { contatoRegistradoHoje } from '../utils/helpers/contatoHelpers.js';
import {
  montarMensagemCobrancaAutomacao,
  parametrosTemplateWhatsApp,
} from '../utils/helpers/mensagemWhatsAppHelpers.js';
import {
  enviarTemplateWhatsApp,
  whatsappApiConfigurado,
} from '../utils/helpers/whatsappCloudHelpers.js';
import type { UpdateAutomacaoConfigDto } from '../models/index.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type TipoEnvioAutomacao = 'LEMBRETE' | 'COBRANCA';

export interface ResultadoExecucaoAutomacao {
  horario: string;
  enviados: number;
  falhas: number;
  ignorados: number;
  detalhes: Array<{
    mensalidadeId: number;
    clienteNome: string;
    tipo: TipoEnvioAutomacao;
    status: 'ENVIADO' | 'FALHA' | 'IGNORADO';
    erro?: string;
  }>;
}

function parseHorarios(valor: string): string[] {
  return valor
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^\d{2}:\d{2}$/.test(item));
}

function horarioAtual(): string {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function diasDesde(data: Date): number {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
}

export class AutomacaoService {
  async obterPainel() {
    const [config, configuracao, envios] = await Promise.all([
      automacaoRepository.findOrCreateConfig(),
      configuracaoRepository.findOrCreate(),
      automacaoRepository.listarEnvios(30),
    ]);

    const simulacao = await this.simularElegiveis(config, configuracao);
    const envioComSucesso = envios.some((envio) => envio.status === 'ENVIADO');

    return {
      config: this.serializarConfig(config),
      whatsappConfigurado: whatsappApiConfigurado(),
      pixConfigurado: Boolean(configuracao.chavePix?.trim()),
      nomeEmpresa: configuracao.nomeEmpresa?.trim() || 'Sua empresa',
      envioComSucesso,
      diasAntecedencia: resolverDiasAntecedencia(
        configuracao.diasAntecedenciaLembrete
      ),
      horarios: parseHorarios(config.horariosEnvio),
      simulacao,
      envios: envios.map((envio) => ({
        id: envio.id,
        mensalidadeId: envio.mensalidadeId,
        clienteId: envio.clienteId,
        clienteNome: envio.mensalidade?.cliente?.nome ?? 'Cliente',
        tipo: envio.tipo,
        telefone: envio.telefone,
        status: envio.status,
        erro: envio.erro,
        mensagemPreview: envio.mensagemPreview,
        enviadoEm: envio.enviadoEm.toISOString(),
      })),
    };
  }

  async salvar(dados: UpdateAutomacaoConfigDto) {
    if (dados.horariosEnvio !== undefined) {
      const horarios = parseHorarios(String(dados.horariosEnvio));
      if (horarios.length === 0) {
        throw new ValidationError(
          'Informe ao menos um horário válido (HH:MM), separados por vírgula.'
        );
      }
      dados.horariosEnvio = horarios.join(',');
    }

    if (dados.intervaloAtrasadosDias !== undefined) {
      const intervalo = Number(dados.intervaloAtrasadosDias);
      if (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 30) {
        throw new ValidationError(
          'Intervalo de cobrança de atrasados deve ser entre 1 e 30 dias.'
        );
      }
    }

    const config = await automacaoRepository.upsertConfig(dados);
    return this.serializarConfig(config);
  }

  deveExecutarAgora(config: AutomacaoConfig): string | null {
    if (!config.lembretesAtivos && !config.cobrancaAtrasadosAtiva) {
      return null;
    }

    const agora = horarioAtual();
    const horarios = parseHorarios(config.horariosEnvio);
    if (!horarios.includes(agora)) {
      return null;
    }

    if (
      config.ultimoHorarioExecutado === agora &&
      config.ultimaExecucaoEm &&
      config.ultimaExecucaoEm.getTime() > Date.now() - 55_000
    ) {
      return null;
    }

    return agora;
  }

  async executar(forcar = false): Promise<ResultadoExecucaoAutomacao> {
    const config = await automacaoRepository.findOrCreateConfig();
    const horario = forcar ? horarioAtual() : this.deveExecutarAgora(config);

    if (!horario) {
      throw new ValidationError(
        forcar
          ? 'Não foi possível iniciar a execução manual.'
          : 'Fora do horário de envio ou automações desativadas.'
      );
    }

    if (
      !forcar &&
      !config.lembretesAtivos &&
      !config.cobrancaAtrasadosAtiva
    ) {
      throw new ValidationError('Ative lembretes ou cobrança de atrasados.');
    }

    if (!whatsappApiConfigurado()) {
      throw new ValidationError(
        'Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no .env do backend.'
      );
    }

    const configuracao = await configuracaoRepository.findOrCreate();
    const mensalidades = await mensalidadeRepository.findAll();
    const pendentes = mensalidades.filter((m) => m.status === 'PENDENTE');
    const ignorarToggles = forcar;

    const resultado: ResultadoExecucaoAutomacao = {
      horario,
      enviados: 0,
      falhas: 0,
      ignorados: 0,
      detalhes: [],
    };

    for (const mensalidade of pendentes) {
      const tipo = await this.resolverTipoEnvio(
        mensalidade,
        config,
        configuracao,
        { ignorarToggles }
      );
      if (!tipo) {
        resultado.ignorados++;
        continue;
      }

      const cliente = mensalidade.cliente;
      const preview = montarMensagemCobrancaAutomacao(
        {
          nome: cliente.nome,
          referencia: mensalidade.referencia,
          valor: mensalidade.valor,
          vencimento: mensalidade.vencimento,
          empresa: configuracao.nomeEmpresa,
          atrasado: tipo === 'COBRANCA',
          pix: configuracao.chavePix,
          tipoPix: configuracao.tipoPix,
          favorecido: configuracao.favorecidoPix,
        },
        configuracao
      );

      try {
        const parametros = parametrosTemplateWhatsApp({
          nome: cliente.nome,
          referencia: mensalidade.referencia,
          valor: mensalidade.valor,
          vencimento: mensalidade.vencimento,
          empresa: configuracao.nomeEmpresa,
          atrasado: tipo === 'COBRANCA',
          pix: configuracao.chavePix,
          tipoPix: configuracao.tipoPix,
          favorecido: configuracao.favorecidoPix,
        });

        const templateNome =
          tipo === 'COBRANCA'
            ? config.templateCobrancaNome
            : config.templateLembreteNome;

        const envio = await enviarTemplateWhatsApp(
          cliente.telefone,
          templateNome,
          config.templateLinguagem,
          parametros
        );

        await mensalidadeRepository.registrarContato(mensalidade.id, new Date());

        await automacaoRepository.criarEnvio({
          mensalidadeId: mensalidade.id,
          clienteId: cliente.id,
          tipo,
          telefone: cliente.telefone,
          status: 'ENVIADO',
          mensagemPreview: preview.slice(0, 500),
          metaMessageId: envio.messageId,
        });

        resultado.enviados++;
        resultado.detalhes.push({
          mensalidadeId: mensalidade.id,
          clienteNome: cliente.nome,
          tipo,
          status: 'ENVIADO',
        });
      } catch (error) {
        const erro =
          error instanceof Error ? error.message : 'Erro ao enviar mensagem.';

        await automacaoRepository.criarEnvio({
          mensalidadeId: mensalidade.id,
          clienteId: cliente.id,
          tipo,
          telefone: cliente.telefone,
          status: 'FALHA',
          mensagemPreview: preview.slice(0, 500),
          erro,
        });

        resultado.falhas++;
        resultado.detalhes.push({
          mensalidadeId: mensalidade.id,
          clienteNome: cliente.nome,
          tipo,
          status: 'FALHA',
          erro,
        });
      }
    }

    await automacaoRepository.registrarExecucao(horario);
    return resultado;
  }

  private async resolverTipoEnvio(
    mensalidade: Mensalidade & { cliente: { id: number; nome: string; telefone: string; incluirCobrancas: boolean } },
    config: AutomacaoConfig,
    configuracao: Configuracao,
    opcoes?: { ignorarToggles?: boolean }
  ): Promise<TipoEnvioAutomacao | null> {
    if (!clienteParticipaCobrancas(mensalidade.cliente)) {
      return null;
    }

    const dias = calcularDiasVencimento(mensalidade.vencimento);
    const diasAntecedencia = resolverDiasAntecedencia(
      configuracao.diasAntecedenciaLembrete
    );
    const cobrancaAtiva =
      opcoes?.ignorarToggles || config.cobrancaAtrasadosAtiva;
    const lembretesAtivos = opcoes?.ignorarToggles || config.lembretesAtivos;

    if (
      cobrancaAtiva &&
      dias < 0 &&
      !contatoRegistradoHoje(mensalidade.ultimoContatoEm)
    ) {
      const ultimo = await automacaoRepository.ultimoEnvioTipo(
        mensalidade.id,
        'COBRANCA'
      );
      if (ultimo && diasDesde(ultimo) < config.intervaloAtrasadosDias) {
        return null;
      }
      return 'COBRANCA';
    }

    if (
      lembretesAtivos &&
      dias >= 0 &&
      elegivelCobrancaDiaria(mensalidade.vencimento, diasAntecedencia) &&
      !contatoRegistradoHoje(mensalidade.ultimoContatoEm)
    ) {
      const jaEnviouHoje = await automacaoRepository.envioEnviadoHoje(
        mensalidade.id,
        'LEMBRETE'
      );
      if (jaEnviouHoje) {
        return null;
      }
      return 'LEMBRETE';
    }

    return null;
  }

  private async simularElegiveis(
    config: AutomacaoConfig,
    configuracao: Configuracao
  ) {
    const mensalidades = await mensalidadeRepository.findAll();
    let lembretes = 0;
    let cobrancas = 0;

    for (const mensalidade of mensalidades) {
      if (mensalidade.status !== 'PENDENTE') continue;
      const tipo = await this.resolverTipoEnvio(mensalidade, config, configuracao, {
        ignorarToggles: true,
      });
      if (tipo === 'LEMBRETE') lembretes++;
      if (tipo === 'COBRANCA') cobrancas++;
    }

    return { lembretes, cobrancas };
  }

  private serializarConfig(config: AutomacaoConfig) {
    return {
      id: config.id,
      lembretesAtivos: config.lembretesAtivos,
      cobrancaAtrasadosAtiva: config.cobrancaAtrasadosAtiva,
      horariosEnvio: config.horariosEnvio,
      intervaloAtrasadosDias: config.intervaloAtrasadosDias,
      templateLembreteNome: config.templateLembreteNome,
      templateCobrancaNome: config.templateCobrancaNome,
      templateLinguagem: config.templateLinguagem,
      ultimaExecucaoEm: config.ultimaExecucaoEm?.toISOString() ?? null,
      ultimoHorarioExecutado: config.ultimoHorarioExecutado,
    };
  }
}

export const automacaoService = new AutomacaoService();
