import prisma from '../config/database.js';
import type { UpdateConfiguracaoDto } from '../models/index.js';
import { CONFIGURACAO_CAMPOS_PERMITIDOS } from '../models/index.js';

export class ConfiguracaoRepository {
  async findOrCreate() {
    let configuracao = await prisma.configuracao.findFirst();
    if (!configuracao) {
      configuracao = await prisma.configuracao.create({ data: {} });
    }
    return configuracao;
  }

  async upsert(dados: UpdateConfiguracaoDto) {
    const existente = await prisma.configuracao.findFirst();
    const filtered: UpdateConfiguracaoDto = {};

    for (const campo of CONFIGURACAO_CAMPOS_PERMITIDOS) {
      if (Object.prototype.hasOwnProperty.call(dados, campo)) {
        (filtered as Record<string, unknown>)[campo] = dados[campo as keyof UpdateConfiguracaoDto];
      }
    }

    if (existente) {
      return prisma.configuracao.update({
        where: { id: existente.id },
        data: filtered,
      });
    }

    return prisma.configuracao.create({ data: filtered });
  }
}

export const configuracaoRepository = new ConfiguracaoRepository();
