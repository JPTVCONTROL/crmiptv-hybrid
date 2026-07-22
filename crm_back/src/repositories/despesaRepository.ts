import prisma from '../config/database.js';
import type { CreateDespesaDto, UpdateDespesaDto } from '../models/index.js';

export class DespesaRepository {
  findAll() {
    return prisma.despesaMensal.findMany({
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    });
  }

  findById(id: number) {
    return prisma.despesaMensal.findUnique({ where: { id } });
  }

  create(data: CreateDespesaDto) {
    return prisma.despesaMensal.create({
      data: {
        nome: data.nome.trim(),
        valor: Number(data.valor),
        categoria: data.categoria?.trim() || 'OUTRO',
        ativo: data.ativo ?? true,
        observacao: data.observacao?.trim() || null,
      },
    });
  }

  update(id: number, data: UpdateDespesaDto) {
    return prisma.despesaMensal.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
        ...(data.valor !== undefined ? { valor: Number(data.valor) } : {}),
        ...(data.categoria !== undefined
          ? { categoria: data.categoria.trim() || 'OUTRO' }
          : {}),
        ...(data.ativo !== undefined ? { ativo: Boolean(data.ativo) } : {}),
        ...(data.observacao !== undefined
          ? { observacao: data.observacao?.trim() || null }
          : {}),
      },
    });
  }

  delete(id: number) {
    return prisma.despesaMensal.delete({ where: { id } });
  }
}

export const despesaRepository = new DespesaRepository();
