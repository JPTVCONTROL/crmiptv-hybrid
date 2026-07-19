import prisma from '../config/database.js';
import type { CreateDispositivoDto, UpdateDispositivoDto } from '../models/index.js';
import { contarClientesPorDispositivo } from '../utils/helpers/dispositivoHelpers.js';

export class DispositivoRepository {
  async findAll() {
    const [dispositivos, clientes] = await Promise.all([
      prisma.dispositivo.findMany({ orderBy: { nome: 'asc' } }),
      prisma.cliente.findMany({ select: { dispositivos: true } }),
    ]);

    return dispositivos.map((dispositivo) => ({
      ...dispositivo,
      _count: {
        clientes: contarClientesPorDispositivo(clientes, dispositivo.id),
      },
    }));
  }

  async findById(id: number) {
    const dispositivo = await prisma.dispositivo.findUnique({ where: { id } });
    if (!dispositivo) return null;

    const clientes = await prisma.cliente.findMany({ select: { dispositivos: true } });

    return {
      ...dispositivo,
      _count: {
        clientes: contarClientesPorDispositivo(clientes, dispositivo.id),
      },
    };
  }

  create(data: CreateDispositivoDto) {
    return prisma.dispositivo.create({
      data: {
        nome: data.nome.trim(),
        modelo: data.modelo?.trim() || null,
        descricao: data.descricao?.trim() || null,
        ativo: data.ativo ?? true,
      },
    });
  }

  update(id: number, data: UpdateDispositivoDto) {
    return prisma.dispositivo.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
        ...(data.modelo !== undefined ? { modelo: data.modelo?.trim() || null } : {}),
        ...(data.descricao !== undefined ? { descricao: data.descricao?.trim() || null } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
    });
  }

  delete(id: number) {
    return prisma.dispositivo.delete({ where: { id } });
  }
}

export const dispositivoRepository = new DispositivoRepository();
