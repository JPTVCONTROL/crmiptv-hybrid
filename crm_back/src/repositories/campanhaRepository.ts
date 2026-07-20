import prisma from '../config/database.js';
import type { CreateCampanhaDto, UpdateCampanhaDto } from '../models/index.js';

export class CampanhaRepository {
  findAll() {
    return prisma.campanha.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { envios: true } } },
    });
  }

  findById(id: number) {
    return prisma.campanha.findUnique({
      where: { id },
      include: {
        _count: { select: { envios: true } },
        envios: {
          select: { clienteId: true, enviadoEm: true },
          orderBy: { enviadoEm: 'desc' },
        },
      },
    });
  }

  create(data: CreateCampanhaDto) {
    return prisma.campanha.create({
      data: {
        titulo: data.titulo.trim(),
        tipo: data.tipo,
        mensagem: data.mensagem.trim(),
      },
      include: { _count: { select: { envios: true } } },
    });
  }

  update(id: number, data: UpdateCampanhaDto) {
    return prisma.campanha.update({
      where: { id },
      data: {
        titulo: data.titulo?.trim(),
        tipo: data.tipo,
        mensagem: data.mensagem?.trim(),
      },
      include: { _count: { select: { envios: true } } },
    });
  }

  delete(id: number) {
    return prisma.campanha.delete({ where: { id } });
  }

  async registrarEnvios(campanhaId: number, clienteIds: number[]) {
    const unicos = [...new Set(clienteIds.filter((id) => Number.isFinite(id) && id > 0))];
    if (unicos.length === 0) {
      return { registrados: 0, reenviados: 0 };
    }

    const existentes = await prisma.campanhaEnvio.findMany({
      where: {
        campanhaId,
        clienteId: { in: unicos },
      },
      select: { clienteId: true },
    });
    const idsExistentes = new Set(existentes.map((e) => e.clienteId));
    const novos = unicos.filter((id) => !idsExistentes.has(id));
    const reenvios = unicos.filter((id) => idsExistentes.has(id));

    if (novos.length > 0) {
      await prisma.campanhaEnvio.createMany({
        data: novos.map((clienteId) => ({ campanhaId, clienteId })),
      });
    }

    if (reenvios.length > 0) {
      await prisma.campanhaEnvio.updateMany({
        where: {
          campanhaId,
          clienteId: { in: reenvios },
        },
        data: { enviadoEm: new Date() },
      });
    }

    return {
      registrados: novos.length,
      reenviados: reenvios.length,
    };
  }
}

export const campanhaRepository = new CampanhaRepository();
