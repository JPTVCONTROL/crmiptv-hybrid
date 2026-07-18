import prisma from '../config/database.js';
import type { CreateClienteDto, UpdateClienteDto } from '../models/index.js';

export class ClienteRepository {
  findAll() {
    return prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' },
      include: { aplicativo: true, mensalidades: true },
    });
  }

  findById(id: number) {
    return prisma.cliente.findUnique({
      where: { id },
      include: {
        aplicativo: true,
        mensalidades: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  create(data: CreateClienteDto) {
    return prisma.cliente.create({
      data: {
        nome: data.nome,
        telefone: data.telefone,
        aplicativoId: data.aplicativoId ? Number(data.aplicativoId) : null,
        servidor: data.servidor,
        usuario: data.usuario,
        senha: data.senha,
        aparelho: data.aparelho,
        modelo: data.modelo,
        macAddress: data.macAddress,
        ativadoEm: data.ativadoEm ? new Date(data.ativadoEm) : null,
        expiraEm: data.expiraEm ? new Date(data.expiraEm) : null,
        vencimento: Number(data.vencimento),
        valorMensal: Number(data.valorMensal),
        observacao: data.observacao,
      },
      include: { aplicativo: true },
    });
  }

  update(id: number, data: UpdateClienteDto) {
    return prisma.cliente.update({
      where: { id },
      data: {
        nome: data.nome,
        telefone: data.telefone,
        aplicativoId: data.aplicativoId
          ? Number(data.aplicativoId)
          : data.aplicativoId === null
            ? null
            : undefined,
        servidor: data.servidor,
        usuario: data.usuario,
        senha: data.senha,
        aparelho: data.aparelho,
        modelo: data.modelo,
        macAddress: data.macAddress,
        ativadoEm: data.ativadoEm ? new Date(data.ativadoEm) : data.ativadoEm === null ? null : undefined,
        expiraEm: data.expiraEm ? new Date(data.expiraEm) : data.expiraEm === null ? null : undefined,
        vencimento: data.vencimento !== undefined ? Number(data.vencimento) : undefined,
        valorMensal: data.valorMensal !== undefined ? Number(data.valorMensal) : undefined,
        observacao: data.observacao,
      },
    });
  }

  delete(id: number) {
    return prisma.cliente.delete({ where: { id } });
  }

  updateExpiracao(id: number, expiraEm: Date, vencimento: number) {
    return prisma.cliente.update({
      where: { id },
      data: { expiraEm, vencimento },
    });
  }
}

export const clienteRepository = new ClienteRepository();
