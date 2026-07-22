import prisma from '../config/database.js';
import { PAINEIS_CREDITO_PADRAO } from '../utils/helpers/painelCreditoHelpers.js';

export class PainelCreditoRepository {
  findAll() {
    return prisma.painelCredito.findMany({
      orderBy: { codigo: 'asc' },
    });
  }

  findByCodigo(codigo: string) {
    return prisma.painelCredito.findUnique({
      where: { codigo },
    });
  }

  findById(id: number) {
    return prisma.painelCredito.findUnique({
      where: { id },
    });
  }

  update(
    id: number,
    data: {
      nome?: string;
      custoUnitario?: number;
      urlPainel?: string | null;
      loginPainel?: string | null;
      senhaPainel?: string | null;
      ativo?: boolean;
    }
  ) {
    return prisma.painelCredito.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
        ...(data.custoUnitario !== undefined
          ? { custoUnitario: Number(data.custoUnitario) }
          : {}),
        ...(data.urlPainel !== undefined
          ? { urlPainel: data.urlPainel?.trim() || null }
          : {}),
        ...(data.loginPainel !== undefined
          ? { loginPainel: data.loginPainel?.trim() || null }
          : {}),
        ...(data.senhaPainel !== undefined
          ? { senhaPainel: data.senhaPainel?.trim() || null }
          : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
    });
  }

  create(data: {
    codigo: string;
    nome: string;
    custoUnitario?: number;
    urlPainel?: string | null;
    loginPainel?: string | null;
    senhaPainel?: string | null;
    ativo?: boolean;
  }) {
    return prisma.painelCredito.create({
      data: {
        codigo: data.codigo.trim().toUpperCase(),
        nome: data.nome.trim(),
        custoUnitario: data.custoUnitario ?? 0,
        saldo: 0,
        urlPainel: data.urlPainel?.trim() || null,
        loginPainel: data.loginPainel?.trim() || null,
        senhaPainel: data.senhaPainel?.trim() || null,
        ativo: data.ativo ?? true,
      },
    });
  }

  delete(id: number) {
    return prisma.painelCredito.delete({ where: { id } });
  }

  countClientesPorCodigo(codigo: string) {
    return prisma.cliente.count({
      where: {
        somenteContato: false,
        servidor: { contains: codigo },
      },
    });
  }

  async ensureDefaults() {
    for (const painel of PAINEIS_CREDITO_PADRAO) {
      await prisma.painelCredito.upsert({
        where: { codigo: painel.codigo },
        create: {
          codigo: painel.codigo,
          nome: painel.nome,
          custoUnitario: painel.custoUnitario,
          saldo: 0,
        },
        update: {},
      });
    }

    return this.findAll();
  }

  async definirSaldo(
    id: number,
    novoSaldo: number,
    movimento: {
      tipo: string;
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
      observacao?: string | null;
      clienteId?: number | null;
      mensalidadeId?: number | null;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const painel = await tx.painelCredito.update({
        where: { id },
        data: { saldo: novoSaldo },
      });

      await tx.movimentoCreditoPainel.create({
        data: {
          painelId: id,
          tipo: movimento.tipo,
          quantidade: movimento.quantidade,
          valorUnitario: movimento.valorUnitario,
          valorTotal: movimento.valorTotal,
          observacao: movimento.observacao ?? null,
          clienteId: movimento.clienteId ?? null,
          mensalidadeId: movimento.mensalidadeId ?? null,
        },
      });

      return painel;
    });
  }

  somarConsumoNoPeriodo(inicio: Date, fim: Date) {
    return prisma.movimentoCreditoPainel.aggregate({
      where: {
        tipo: 'CONSUMO',
        createdAt: { gte: inicio, lte: fim },
      },
      _sum: { valorTotal: true, quantidade: true },
    });
  }

  async consumoPorMesNoAno(ano: number): Promise<number[]> {
    const inicio = new Date(ano, 0, 1, 0, 0, 0, 0);
    const fim = new Date(ano, 11, 31, 23, 59, 59, 999);

    const movimentos = await prisma.movimentoCreditoPainel.findMany({
      where: {
        tipo: 'CONSUMO',
        createdAt: { gte: inicio, lte: fim },
      },
      select: { valorTotal: true, createdAt: true },
    });

    const porMes = Array.from({ length: 12 }, () => 0);
    for (const movimento of movimentos) {
      porMes[movimento.createdAt.getMonth()] += movimento.valorTotal;
    }

    return porMes.map((valor) => Math.round(valor * 100) / 100);
  }

  listarConsumosNoPeriodo(inicio: Date, fim: Date, limite = 200) {
    return prisma.movimentoCreditoPainel.findMany({
      where: {
        tipo: 'CONSUMO',
        createdAt: { gte: inicio, lte: fim },
      },
      include: {
        painel: {
          select: { codigo: true, nome: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
    });
  }
}

export const painelCreditoRepository = new PainelCreditoRepository();
