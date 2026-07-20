import prisma from '../config/database.js';
import type { UpdateAutomacaoConfigDto } from '../models/index.js';
import { AUTOMACAO_CAMPOS_PERMITIDOS } from '../models/index.js';

export class AutomacaoRepository {
  async findOrCreateConfig() {
    let config = await prisma.automacaoConfig.findFirst();
    if (!config) {
      config = await prisma.automacaoConfig.create({ data: {} });
    }
    return config;
  }

  async upsertConfig(dados: UpdateAutomacaoConfigDto) {
    const existente = await prisma.automacaoConfig.findFirst();
    const filtered: UpdateAutomacaoConfigDto = {};

    for (const campo of AUTOMACAO_CAMPOS_PERMITIDOS) {
      if (Object.prototype.hasOwnProperty.call(dados, campo)) {
        (filtered as Record<string, unknown>)[campo] =
          dados[campo as keyof UpdateAutomacaoConfigDto];
      }
    }

    if (existente) {
      return prisma.automacaoConfig.update({
        where: { id: existente.id },
        data: filtered,
      });
    }

    return prisma.automacaoConfig.create({ data: filtered });
  }

  async registrarExecucao(horario: string) {
    const config = await this.findOrCreateConfig();
    return prisma.automacaoConfig.update({
      where: { id: config.id },
      data: {
        ultimaExecucaoEm: new Date(),
        ultimoHorarioExecutado: horario,
      },
    });
  }

  async criarEnvio(dados: {
    mensalidadeId: number;
    clienteId: number;
    tipo: string;
    telefone: string;
    status: string;
    mensagemPreview?: string;
    metaMessageId?: string;
    erro?: string;
  }) {
    return prisma.envioAutomatico.create({ data: dados });
  }

  async listarEnvios(limite = 50) {
    return prisma.envioAutomatico.findMany({
      orderBy: { enviadoEm: 'desc' },
      take: limite,
      include: {
        mensalidade: {
          include: { cliente: { select: { id: true, nome: true } } },
        },
      },
    });
  }

  async ultimoEnvioTipo(
    mensalidadeId: number,
    tipo: string
  ): Promise<Date | null> {
    const registro = await prisma.envioAutomatico.findFirst({
      where: { mensalidadeId, tipo, status: 'ENVIADO' },
      orderBy: { enviadoEm: 'desc' },
    });
    return registro?.enviadoEm ?? null;
  }

  async envioEnviadoHoje(mensalidadeId: number, tipo: string): Promise<boolean> {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    const registro = await prisma.envioAutomatico.findFirst({
      where: {
        mensalidadeId,
        tipo,
        status: 'ENVIADO',
        enviadoEm: { gte: inicio },
      },
    });

    return Boolean(registro);
  }
}

export const automacaoRepository = new AutomacaoRepository();
