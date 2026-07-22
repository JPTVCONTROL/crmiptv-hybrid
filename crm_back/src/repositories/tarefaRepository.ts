import prisma from '../config/database.js';
import type { CreateTarefaDto, UpdateTarefaDto } from '../models/index.js';
import { parseDataSomenteDia } from '../utils/helpers/dateHelpers.js';
import { inicioDiaUtc } from '../utils/helpers/tarefaHelpers.js';

const includeCliente = {
  cliente: {
    select: {
      id: true,
      nome: true,
      telefone: true,
    },
  },
} as const;

export interface ListarTarefasFiltro {
  concluida?: boolean;
  clienteId?: number;
}

export class TarefaRepository {
  findAll(filtro: ListarTarefasFiltro = {}) {
    return prisma.tarefa.findMany({
      where: {
        ...(filtro.concluida !== undefined ? { concluida: filtro.concluida } : {}),
        ...(filtro.clienteId !== undefined ? { clienteId: filtro.clienteId } : {}),
      },
      include: includeCliente,
      orderBy: [{ concluida: 'asc' }, { vencimentoEm: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: number) {
    return prisma.tarefa.findUnique({
      where: { id },
      include: includeCliente,
    });
  }

  async findPendentesResumo(limite = 8) {
    const hoje = inicioDiaUtc();

    return prisma.tarefa.findMany({
      where: { concluida: false },
      include: includeCliente,
      orderBy: [{ vencimentoEm: 'asc' }, { id: 'asc' }],
      take: limite,
    });
  }

  async contarPendentes() {
    const hoje = inicioDiaUtc();
    const [pendentes, hojeQtd, atrasadas] = await Promise.all([
      prisma.tarefa.count({ where: { concluida: false } }),
      prisma.tarefa.count({
        where: {
          concluida: false,
          vencimentoEm: hoje,
        },
      }),
      prisma.tarefa.count({
        where: {
          concluida: false,
          vencimentoEm: { lt: hoje },
        },
      }),
    ]);

    return { pendentes, hoje: hojeQtd, atrasadas };
  }

  create(data: CreateTarefaDto) {
    return prisma.tarefa.create({
      data: {
        titulo: data.titulo.trim(),
        descricao: data.descricao?.trim() || null,
        clienteId: data.clienteId ?? null,
        vencimentoEm: parseDataSomenteDia(data.vencimentoEm),
        concluida: false,
      },
      include: includeCliente,
    });
  }

  update(id: number, data: UpdateTarefaDto) {
    return prisma.tarefa.update({
      where: { id },
      data: {
        ...(data.titulo !== undefined ? { titulo: data.titulo.trim() } : {}),
        ...(data.descricao !== undefined
          ? { descricao: data.descricao?.trim() || null }
          : {}),
        ...(data.clienteId !== undefined ? { clienteId: data.clienteId } : {}),
        ...(data.vencimentoEm !== undefined
          ? { vencimentoEm: parseDataSomenteDia(data.vencimentoEm) }
          : {}),
        ...(data.concluida !== undefined
          ? {
              concluida: data.concluida,
              concluidaEm: data.concluida ? new Date() : null,
            }
          : {}),
      },
      include: includeCliente,
    });
  }

  marcarConcluida(id: number) {
    return prisma.tarefa.update({
      where: { id },
      data: {
        concluida: true,
        concluidaEm: new Date(),
      },
      include: includeCliente,
    });
  }

  marcarPendente(id: number) {
    return prisma.tarefa.update({
      where: { id },
      data: {
        concluida: false,
        concluidaEm: null,
      },
      include: includeCliente,
    });
  }

  delete(id: number) {
    return prisma.tarefa.delete({ where: { id } });
  }
}

export const tarefaRepository = new TarefaRepository();
