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
        mensagem: data.mensagem,
        requerMac: data.requerMac ?? false,
        requerDeviceKey: data.requerDeviceKey ?? false,
        requerCodigo: data.requerCodigo ?? false,
        ativo: data.ativo ?? true,
      },
    });
  }

  update(id: number, data: UpdateAplicativoDto) {
    return prisma.aplicativo.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        logo: data.logo,
        mensagem: data.mensagem,
        requerMac: data.requerMac,
        requerDeviceKey: data.requerDeviceKey,
        requerCodigo: data.requerCodigo,
        ativo: data.ativo,
      },
    });
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
