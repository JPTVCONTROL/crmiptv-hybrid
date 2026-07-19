import prisma from '../config/database.js';

export class MensalidadeRepository {
  findAll() {
    return prisma.mensalidade.findMany({
      orderBy: { vencimento: 'asc' },
      include: { cliente: true },
    });
  }

  findById(id: number) {
    return prisma.mensalidade.findUnique({
      where: { id },
      include: {
        cliente: {
          include: { plano: true },
        },
      },
    });
  }

  create(data: {
    clienteId: number;
    referencia: string;
    valor: number;
    vencimento: Date;
    status?: string;
  }) {
    return prisma.mensalidade.create({ data });
  }

  markAsPaid(id: number, pagoEm: Date) {
    return prisma.mensalidade.update({
      where: { id },
      data: { status: 'PAGO', pagoEm },
    });
  }

  async registrarPagamento(
    mensalidadeId: number,
    clienteId: number,
    novoVencimento: Date,
    referencia: string,
    valor: number,
    pagoEm: Date
  ) {
    return prisma.$transaction([
      prisma.mensalidade.update({
        where: { id: mensalidadeId },
        data: { status: 'PAGO', pagoEm },
      }),
      prisma.cliente.update({
        where: { id: clienteId },
        data: {
          expiraEm: novoVencimento,
          vencimento: novoVencimento.getDate(),
        },
      }),
      prisma.mensalidade.create({
        data: {
          clienteId,
          referencia,
          valor,
          vencimento: novoVencimento,
          status: 'PENDENTE',
        },
      }),
    ]);
  }
}

export const mensalidadeRepository = new MensalidadeRepository();
