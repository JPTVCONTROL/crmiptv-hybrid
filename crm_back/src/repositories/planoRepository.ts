import prisma from '../config/database.js';
import type { CreatePlanoDto, UpdatePlanoDto } from '../models/index.js';

export class PlanoRepository {
  findAll() {
    return prisma.plano.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { clientes: true } } },
    });
  }

  findById(id: number) {
    return prisma.plano.findUnique({
      where: { id },
      include: { _count: { select: { clientes: true } } },
    });
  }

  create(data: CreatePlanoDto) {
    return prisma.plano.create({
      data: {
        nome: data.nome,
        valor: Number(data.valor),
        diasValidade: Number(data.diasValidade),
        ativo: data.ativo ?? true,
      },
    });
  }

  update(id: number, data: UpdatePlanoDto) {
    return prisma.plano.update({
      where: { id },
      data: {
        nome: data.nome,
        valor: data.valor !== undefined ? Number(data.valor) : undefined,
        diasValidade:
          data.diasValidade !== undefined
            ? Number(data.diasValidade)
            : undefined,
        ativo: data.ativo,
      },
    });
  }

  delete(id: number) {
    return prisma.plano.delete({ where: { id } });
  }

  findClientesByPlanoId(planoId: number) {
    return prisma.cliente.findMany({
      where: { planoId },
      select: {
        id: true,
        nome: true,
        telefone: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async reajustarValorClientes(planoId: number, valor: number) {
    const clientes = await prisma.cliente.findMany({
      where: { planoId },
      select: { id: true },
    });
    const clienteIds = clientes.map((cliente) => cliente.id);

    const clientesAtualizados = await prisma.cliente.updateMany({
      where: { planoId },
      data: { valorMensal: valor },
    });

    let mensalidadesAtualizadas = 0;
    if (clienteIds.length > 0) {
      const resultado = await prisma.mensalidade.updateMany({
        where: {
          clienteId: { in: clienteIds },
          status: 'PENDENTE',
        },
        data: { valor },
      });
      mensalidadesAtualizadas = resultado.count;
    }

    return {
      clientes: clientesAtualizados.count,
      mensalidades: mensalidadesAtualizadas,
    };
  }
}

export const planoRepository = new PlanoRepository();
