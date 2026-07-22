import type { AutomacaoConfig, Configuracao, Mensalidade } from '@prisma/client';
import { automacaoRepository } from '../repositories/automacaoRepository.js';
import { configuracaoRepository } from '../repositories/configuracaoRepository.js';
import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import {
  calcularDiasVencimento,
  clienteParticipaCobrancas,
  resolverDiasAntecedencia,
} from '../utils/helpers/cobrancaDiariaHelpers.js';
import {
  resolverPontoCobranca,
  resolverPontoLembrete,
  rotuloPontoDisparo,
  type PontoDisparoAutomacao,
} from '../utils/helpers/automacaoDisparoHelpers.js';
import {
  montarMensagemCobrancaAutomacao,
  parametrosTemplateWhatsApp,
  resolverValorMensalidade,
} from '../utils/helpers/mensagemWhatsAppHelpers.js';
import {
  enviarTemplateWhatsApp,
  obterPerfilWhatsApp,
  whatsappApiConfigurado,
} from '../utils/helpers/whatsappCloudHelpers.js';
import {
  estaNaJanelaManha,
  horarioAtualLocal,
  minutosAtuaisLocal,
  minutosDoHorario,
  montarDataAgendada,
  referenciaDiaLocal,
  sortearMinutosNaJanela,
  validarJanelaManha,
} from '../utils/helpers/automacaoJanelaHelpers.js';
import type { UpdateAutomacaoConfigDto } from '../models/index.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type TipoEnvioAutomacao = 'LEMBRETE' | 'COBRANCA';

export interface ResolucaoEnvioAutomacao {
  tipo: TipoEnvioAutomacao;
  pontoDisparo: PontoDisparoAutomacao;
}

export interface ResultadoExecucaoAutomacao {
  horario: string;
  enviados: number;
  falhas: number;
  ignorados: number;
  detalhes: Array<{
    mensalidadeId: number;
    clienteNome: string;
    tipo: TipoEnvioAutomacao;
    pontoDisparo?: PontoDisparoAutomacao;
    status: 'ENVIADO' | 'FALHA' | 'IGNORADO';
    erro?: string;
  }>;
}

export class AutomacaoService {
  async obterPainel() {
    const [config, configuracao, envios, whatsappPerfil] = await Promise.all([
      automacaoRepository.findOrCreateConfig(),
      configuracaoRepository.findOrCreate(),
      automacaoRepository.listarEnvios(30),
      obterPerfilWhatsApp(),
    ]);

    const simulacao = await this.simularElegiveis(config, configuracao);
    const envioComSucesso = envios.some((envio) => envio.status === 'ENVIADO');
    const templatesProntos =
      envioComSucesso || config.templatesMetaAtivos;

    const referenciaDia = referenciaDiaLocal();
    const filaHoje = await automacaoRepository.contagemFilaHoje(referenciaDia);
    const inicioManha = config.horarioInicioManha || '08:00';
    const fimManha = config.horarioFimManha || '09:00';

    return {
      config: this.serializarConfig(config),
      whatsappConfigurado: whatsappApiConfigurado(),
      whatsappPerfil,
      pixConfigurado: Boolean(configuracao.chavePix?.trim()),
      nomeEmpresa: configuracao.nomeEmpresa?.trim() || 'Sua empresa',
      envioComSucesso,
      templatesProntos,
      diasAntecedencia: resolverDiasAntecedencia(
        configuracao.diasAntecedenciaLembrete
      ),
      janelaManha: { inicio: inicioManha, fim: fimManha },
      filaHoje,
      simulacao,
      envios: envios.map((envio) => ({
        id: envio.id,
        mensalidadeId: envio.mensalidadeId,
        clienteId: envio.clienteId,
        clienteNome: envio.mensalidade?.cliente?.nome ?? 'Cliente',
        tipo: envio.tipo,
        pontoDisparo: envio.pontoDisparo,
        telefone: envio.telefone,
        status: envio.status,
        erro: envio.erro,
        mensagemPreview: envio.mensagemPreview,
        enviadoEm: envio.enviadoEm.toISOString(),
      })),
    };
  }

  async salvar(dados: UpdateAutomacaoConfigDto) {
    const atual = await automacaoRepository.findOrCreateConfig();
    const inicio =
      dados.horarioInicioManha?.trim() ?? atual.horarioInicioManha ?? '08:00';
    const fim = dados.horarioFimManha?.trim() ?? atual.horarioFimManha ?? '09:00';

    if (
      dados.horarioInicioManha !== undefined ||
      dados.horarioFimManha !== undefined
    ) {
      try {
        validarJanelaManha(inicio, fim);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Janela matinal inválida.'
        );
      }
      dados.horarioInicioManha = inicio;
      dados.horarioFimManha = fim;
      dados.horariosEnvio = inicio;
    }

    const config = await automacaoRepository.upsertConfig(dados);
    return this.serializarConfig(config);
  }

  deveProcessarRotinaManha(config: AutomacaoConfig): boolean {
    if (!config.lembretesAtivos && !config.cobrancaAtrasadosAtiva) {
      return false;
    }

    const inicio = config.horarioInicioManha || '08:00';
    const fim = config.horarioFimManha || '09:00';
    const minutos = minutosAtuaisLocal();
    const inicioMin = minutosDoHorario(inicio);
    const fimMin = minutosDoHorario(fim);

    return minutos >= inicioMin && minutos < fimMin + 15;
  }

  async processarRotinaManha(): Promise<ResultadoExecucaoAutomacao | null> {
    const config = await automacaoRepository.findOrCreateConfig();

    if (!this.deveProcessarRotinaManha(config)) {
      return null;
    }

    if (!whatsappApiConfigurado()) {
      return null;
    }

    const inicio = config.horarioInicioManha || '08:00';
    const fim = config.horarioFimManha || '09:00';
    const referenciaDia = referenciaDiaLocal();

    if (estaNaJanelaManha(inicio, fim)) {
      await this.montarFilaManha(config, referenciaDia, inicio, fim);
    }

    return this.processarFilaPendente(config, referenciaDia);
  }

  /** Execução manual imediata (teste) — ignora fila e janela matinal. */
  async executar(forcar = false): Promise<ResultadoExecucaoAutomacao> {
    const config = await automacaoRepository.findOrCreateConfig();
    const horario = horarioAtualLocal();

    if (!forcar) {
      throw new ValidationError(
        'Use o agendador matinal ou Executar agora para teste manual.'
      );
    }

    if (!whatsappApiConfigurado()) {
      throw new ValidationError(
        'Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no .env do backend.'
      );
    }

    const configuracao = await configuracaoRepository.findOrCreate();
    const mensalidades = await mensalidadeRepository.findAll();
    const pendentes = mensalidades.filter((m) => m.status === 'PENDENTE');

    const resultado: ResultadoExecucaoAutomacao = {
      horario,
      enviados: 0,
      falhas: 0,
      ignorados: 0,
      detalhes: [],
    };

    for (const mensalidade of pendentes) {
      const resolucao = await this.resolverTipoEnvio(mensalidade, config, {
        ignorarToggles: true,
      });
      if (!resolucao) {
        resultado.ignorados++;
        continue;
      }

      const detalhe = await this.enviarMensalidadeAutomacao(
        mensalidade,
        resolucao,
        config,
        configuracao
      );

      if (detalhe.status === 'ENVIADO') {
        resultado.enviados++;
      } else {
        resultado.falhas++;
      }
      resultado.detalhes.push(detalhe);
    }

    await automacaoRepository.registrarExecucao(horario);
    return resultado;
  }

  private async montarFilaManha(
    config: AutomacaoConfig,
    referenciaDia: string,
    inicio: string,
    fim: string
  ): Promise<void> {
    if (await automacaoRepository.filaMontadaHoje(referenciaDia)) {
      return;
    }

    const mensalidades = await mensalidadeRepository.findAll();
    const elegiveis: Array<{
      mensalidade: (typeof mensalidades)[number];
      resolucao: ResolucaoEnvioAutomacao;
    }> = [];

    for (const mensalidade of mensalidades) {
      if (mensalidade.status !== 'PENDENTE') continue;
      const resolucao = await this.resolverTipoEnvio(mensalidade, config);
      if (!resolucao) continue;
      elegiveis.push({ mensalidade, resolucao });
    }

    if (elegiveis.length === 0) {
      return;
    }

    const minutos = sortearMinutosNaJanela(elegiveis.length, inicio, fim);
    const hoje = new Date();

    await automacaoRepository.criarItensFila(
      elegiveis.map(({ mensalidade, resolucao }, indice) => ({
        mensalidadeId: mensalidade.id,
        clienteId: mensalidade.cliente.id,
        tipo: resolucao.tipo,
        pontoDisparo: resolucao.pontoDisparo,
        referenciaDia,
        agendadoPara: montarDataAgendada(minutos[indice], hoje),
      }))
    );
  }

  private async processarFilaPendente(
    config: AutomacaoConfig,
    referenciaDia: string
  ): Promise<ResultadoExecucaoAutomacao> {
    const configuracao = await configuracaoRepository.findOrCreate();
    const pendentes = await automacaoRepository.listarFilaPendenteAte(
      referenciaDia,
      10
    );

    const resultado: ResultadoExecucaoAutomacao = {
      horario: horarioAtualLocal(),
      enviados: 0,
      falhas: 0,
      ignorados: 0,
      detalhes: [],
    };

    if (pendentes.length === 0) {
      return resultado;
    }

    const mensalidades = await mensalidadeRepository.findAll();
    const porId = new Map(mensalidades.map((m) => [m.id, m]));

    for (const item of pendentes) {
      const mensalidade = porId.get(item.mensalidadeId);
      if (!mensalidade) {
        await automacaoRepository.marcarFilaFalha(item.id, 'Mensalidade não encontrada.');
        resultado.falhas++;
        continue;
      }

      const resolucao: ResolucaoEnvioAutomacao = {
        tipo: item.tipo as TipoEnvioAutomacao,
        pontoDisparo: item.pontoDisparo as PontoDisparoAutomacao,
      };

      const detalhe = await this.enviarMensalidadeAutomacao(
        mensalidade,
        resolucao,
        config,
        configuracao
      );

      if (detalhe.status === 'ENVIADO') {
        await automacaoRepository.marcarFilaEnviada(item.id);
        resultado.enviados++;
      } else {
        await automacaoRepository.marcarFilaFalha(
          item.id,
          detalhe.erro ?? 'Falha ao enviar.'
        );
        resultado.falhas++;
      }

      resultado.detalhes.push(detalhe);
    }

    if (resultado.enviados > 0 || resultado.falhas > 0) {
      await automacaoRepository.registrarExecucao(resultado.horario);
    }

    return resultado;
  }

  private async enviarMensalidadeAutomacao(
    mensalidade: Mensalidade & {
      cliente: {
        id: number;
        nome: string;
        telefone: string;
        incluirCobrancas: boolean;
        valorMensal: number;
      };
    },
    resolucao: ResolucaoEnvioAutomacao,
    config: AutomacaoConfig,
    configuracao: Configuracao
  ): Promise<ResultadoExecucaoAutomacao['detalhes'][number]> {
    const { tipo, pontoDisparo } = resolucao;
    const cliente = mensalidade.cliente;
    const valorCobranca = resolverValorMensalidade(mensalidade);
    const preview = montarMensagemCobrancaAutomacao(
      {
        nome: cliente.nome,
        referencia: mensalidade.referencia,
        valor: valorCobranca,
        vencimento: mensalidade.vencimento,
        empresa: configuracao.nomeEmpresa,
        atrasado: tipo === 'COBRANCA',
        pix: configuracao.chavePix,
        tipoPix: configuracao.tipoPix,
        favorecido: configuracao.favorecidoPix,
      },
      configuracao,
      pontoDisparo
    );

    try {
      const parametros = parametrosTemplateWhatsApp({
        nome: cliente.nome,
        referencia: mensalidade.referencia,
        valor: valorCobranca,
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
        pontoDisparo,
        telefone: cliente.telefone,
        status: 'ENVIADO',
        mensagemPreview: preview.slice(0, 500),
        metaMessageId: envio.messageId,
      });

      return {
        mensalidadeId: mensalidade.id,
        clienteNome: cliente.nome,
        tipo,
        pontoDisparo,
        status: 'ENVIADO',
      };
    } catch (error) {
      const erroMsg =
        error instanceof Error ? error.message : 'Erro ao enviar mensagem.';

      await automacaoRepository.criarEnvio({
        mensalidadeId: mensalidade.id,
        clienteId: cliente.id,
        tipo,
        pontoDisparo,
        telefone: cliente.telefone,
        status: 'FALHA',
        mensagemPreview: preview.slice(0, 500),
        erro: erroMsg,
      });

      return {
        mensalidadeId: mensalidade.id,
        clienteNome: cliente.nome,
        tipo,
        pontoDisparo,
        status: 'FALHA',
        erro: erroMsg,
      };
    }
  }

  /** @deprecated Substituído por processarRotinaManha. */
  deveExecutarAgora(_config: AutomacaoConfig): string | null {
    return null;
  }

  private async resolverTipoEnvio(
    mensalidade: Mensalidade & {
      cliente: {
        id: number;
        nome: string;
        telefone: string;
        incluirCobrancas: boolean;
        valorMensal: number;
      };
    },
    config: AutomacaoConfig,
    opcoes?: { ignorarToggles?: boolean }
  ): Promise<ResolucaoEnvioAutomacao | null> {
    if (!clienteParticipaCobrancas(mensalidade.cliente)) {
      return null;
    }

    const dias = calcularDiasVencimento(mensalidade.vencimento);
    const cobrancaAtiva =
      opcoes?.ignorarToggles || config.cobrancaAtrasadosAtiva;
    const lembretesAtivos = opcoes?.ignorarToggles || config.lembretesAtivos;

    if (cobrancaAtiva && dias < 0) {
      const pontoDisparo = resolverPontoCobranca(dias);
      if (!pontoDisparo) {
        return null;
      }
      if (
        await automacaoRepository.envioJaDisparado(mensalidade.id, pontoDisparo)
      ) {
        return null;
      }
      return { tipo: 'COBRANCA', pontoDisparo };
    }

    if (lembretesAtivos && dias >= 0) {
      const pontoDisparo = resolverPontoLembrete(dias);
      if (!pontoDisparo) {
        return null;
      }
      if (
        await automacaoRepository.envioJaDisparado(mensalidade.id, pontoDisparo)
      ) {
        return null;
      }
      return { tipo: 'LEMBRETE', pontoDisparo };
    }

    return null;
  }

  private async simularElegiveis(
    config: AutomacaoConfig,
    _configuracao: Configuracao
  ) {
    const mensalidades = await mensalidadeRepository.findAll();
    let lembretes = 0;
    let cobrancas = 0;
    const porPonto: Record<string, number> = {};

    for (const mensalidade of mensalidades) {
      if (mensalidade.status !== 'PENDENTE') continue;
      const resolucao = await this.resolverTipoEnvio(mensalidade, config, {
        ignorarToggles: true,
      });
      if (!resolucao) continue;

      porPonto[resolucao.pontoDisparo] =
        (porPonto[resolucao.pontoDisparo] ?? 0) + 1;

      if (resolucao.tipo === 'LEMBRETE') lembretes++;
      if (resolucao.tipo === 'COBRANCA') cobrancas++;
    }

    return { lembretes, cobrancas, porPonto };
  }

  private serializarConfig(config: AutomacaoConfig) {
    return {
      id: config.id,
      lembretesAtivos: config.lembretesAtivos,
      cobrancaAtrasadosAtiva: config.cobrancaAtrasadosAtiva,
      horariosEnvio: config.horariosEnvio,
      horarioInicioManha: config.horarioInicioManha,
      horarioFimManha: config.horarioFimManha,
      intervaloAtrasadosDias: config.intervaloAtrasadosDias,
      templateLembreteNome: config.templateLembreteNome,
      templateCobrancaNome: config.templateCobrancaNome,
      templateLinguagem: config.templateLinguagem,
      templatesMetaAtivos: config.templatesMetaAtivos,
      ultimaExecucaoEm: config.ultimaExecucaoEm?.toISOString() ?? null,
      ultimoHorarioExecutado: config.ultimoHorarioExecutado,
    };
  }
}

export { rotuloPontoDisparo };
export const automacaoService = new AutomacaoService();
