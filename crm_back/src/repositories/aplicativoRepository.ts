import prisma from '../config/database.js';
import type { CreateAplicativoDto, UpdateAplicativoDto } from '../models/index.js';

export class AplicativoRepository {
  findAll() {
    return prisma.aplicativo.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { clientes: true } } },
    });
  }

  findById(id: number) {
    return prisma.aplicativo.findUnique({
      where: { id },
      include: { _count: { select: { clientes: true } } },
    });
  }

  create(data: CreateAplicativoDto) {
    return prisma.aplicativo.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        logo: data.logo,
        android: data.android,
        androidTv: data.androidTv,
        ios: data.ios,
        windows: data.windows,
        mac: data.mac,
        tutorial: data.tutorial,
        mensagem: data.mensagem,
        ativo: data.ativo ?? true,
      },
    });
  }

  update(id: number, data: UpdateAplicativoDto) {
    return prisma.aplicativo.update({ where: { id }, data });
  }

  delete(id: number) {
    return prisma.aplicativo.delete({ where: { id } });
  }

  findClientesByAplicativoId(aplicativoId: number) {
    return prisma.cliente.findMany({
      where: { aplicativoId },
      select: {
        id: true,
        nome: true,
        telefone: true,
      },
      orderBy: { nome: 'asc' },
    });
  }
}

export const aplicativoRepository = new AplicativoRepository();
