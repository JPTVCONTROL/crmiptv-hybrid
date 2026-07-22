import prisma from '../config/database.js';
import { formatReferencia } from '../utils/helpers/dateHelpers.js';

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

  registrarContato(id: number, contatoEm: Date) {
    return prisma.mensalidade.update({
      where: { id },
      data: { ultimoContatoEm: contatoEm },
    });
  }

  registrarBloqueio(id: number, bloqueioEm: Date) {
    return prisma.mensalidade.update({
      where: { id },
      data: {
        bloqueioEnviadoEm: bloqueioEm,
        ultimoContatoEm: bloqueioEm,
      },
    });
  }

  registrarContatos(ids: number[], contatoEm: Date) {
    if (ids.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return prisma.mensalidade.updateMany({
      where: { id: { in: ids } },
      data: { ultimoContatoEm: contatoEm },
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

  findPendentesByClienteId(clienteId: number) {
    return prisma.mensalidade.findMany({
      where: { clienteId, status: 'PENDENTE' },
      orderBy: { vencimento: 'asc' },
    });
  }

  removerPendentesDoCliente(clienteId: number) {
    return prisma.mensalidade.deleteMany({
      where: { clienteId, status: 'PENDENTE' },
    });
  }

  removerPendentesDeClientesSemCobranca() {
    return prisma.mensalidade.deleteMany({
      where: {
        status: 'PENDENTE',
        cliente: {
          OR: [
            { somenteContato: true },
            { cortesia: true },
            { incluirCobrancas: false },
            { ativo: false },
          ],
        },
      },
    });
  }

  sincronizarPendentesDoCliente(
    clienteId: number,
    opcoes: { vencimento?: Date; valor?: number }
  ) {
    const data: {
      vencimento?: Date;
      referencia?: string;
      valor?: number;
    } = {};

    if (opcoes.vencimento) {
      data.vencimento = opcoes.vencimento;
      data.referencia = formatReferencia(opcoes.vencimento);
    }

    if (opcoes.valor !== undefined) {
      data.valor = opcoes.valor;
    }

    if (Object.keys(data).length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return prisma.mensalidade.updateMany({
      where: { clienteId, status: 'PENDENTE' },
      data,
    });
  }
}

export const mensalidadeRepository = new MensalidadeRepository();
