import prisma from '../config/database.js';
import type { CreateClienteDto, UpdateClienteDto } from '../models/index.js';
import { parseDataSomenteDia, parseExpiraEm } from '../utils/helpers/dateHelpers.js';

export class ClienteRepository {
  findAll() {
    return prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' },
      include: { aplicativo: true, plano: true, mensalidades: true },
    });
  }

  findById(id: number) {
    return prisma.cliente.findUnique({
      where: { id },
      include: {
        aplicativo: true,
        plano: true,
        mensalidades: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  create(data: CreateClienteDto) {
    return prisma.cliente.create({
      data: {
        nome: data.nome,
        telefone: data.telefone,
        planoId: data.planoId ? Number(data.planoId) : null,
        aplicativoId: data.aplicativoId ? Number(data.aplicativoId) : null,
        servidor: data.servidor,
        usuario: data.usuario,
        senha: data.senha,
        aparelho: data.aparelho,
        modelo: data.modelo,
        macAddress: data.macAddress,
        qtdTelas: data.qtdTelas !== undefined ? Number(data.qtdTelas) : 1,
        dispositivos: data.dispositivos ?? null,
        ativadoEm: data.ativadoEm ? parseDataSomenteDia(data.ativadoEm) : null,
        expiraEm: data.expiraEm ? parseExpiraEm(data.expiraEm) : null,
        vencimento: Number(data.vencimento),
        valorMensal: Number(data.valorMensal),
        incluirCobrancas:
          data.incluirCobrancas !== undefined
            ? Boolean(data.incluirCobrancas)
            : true,
        observacao: data.observacao,
      },
      include: { aplicativo: true, plano: true },
    });
  }

  update(id: number, data: UpdateClienteDto) {
    return prisma.cliente.update({
      where: { id },
      data: {
        nome: data.nome,
        telefone: data.telefone,
        planoId: data.planoId
          ? Number(data.planoId)
          : data.planoId === null
            ? null
            : undefined,
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
        qtdTelas:
          data.qtdTelas !== undefined ? Number(data.qtdTelas) : undefined,
        dispositivos:
          data.dispositivos !== undefined ? data.dispositivos : undefined,
        ativadoEm: data.ativadoEm
          ? parseDataSomenteDia(data.ativadoEm)
          : data.ativadoEm === null
            ? null
            : undefined,
        expiraEm: data.expiraEm
          ? parseExpiraEm(data.expiraEm)
          : data.expiraEm === null
            ? null
            : undefined,
        vencimento: data.vencimento !== undefined ? Number(data.vencimento) : undefined,
        valorMensal: data.valorMensal !== undefined ? Number(data.valorMensal) : undefined,
        incluirCobrancas:
          data.incluirCobrancas !== undefined
            ? Boolean(data.incluirCobrancas)
            : undefined,
        observacao: data.observacao,
      },
      include: {
        aplicativo: true,
        plano: true,
        mensalidades: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  updateIncluirCobrancas(id: number, incluirCobrancas: boolean) {
    return prisma.cliente.update({
      where: { id },
      data: { incluirCobrancas },
      include: {
        aplicativo: true,
        plano: true,
        mensalidades: { orderBy: { createdAt: 'desc' } },
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
