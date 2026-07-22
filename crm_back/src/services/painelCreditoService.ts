import prisma from '../config/database.js';
import { painelCreditoRepository } from '../repositories/painelCreditoRepository.js';
import {
  normalizarCodigoPainel,
  resolverCustoCreditoPorServidor,
  gerarCodigoServidor,
} from '../utils/helpers/painelCreditoHelpers.js';

function limitesMes(ano: number, mes: number) {
  return {
    inicio: new Date(ano, mes - 1, 1, 0, 0, 0, 0),
    fim: new Date(ano, mes, 0, 23, 59, 59, 999),
  };
}

function periodoAtual() {
  const hoje = new Date();
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
}

function parsePeriodo(periodo: string) {
  const [ano, mes] = periodo.split('-').map(Number);
  return { ano, mes };
}

export class PainelCreditoService {
  async listar() {
    return painelCreditoRepository.ensureDefaults();
  }

  async buscarPorId(id: number) {
    await painelCreditoRepository.ensureDefaults();
    const painel = await painelCreditoRepository.findById(id);
    if (!painel) {
      throw new PainelCreditoNotFoundError();
    }
    return painel;
  }

  async definirSaldo(id: number, saldo: number, observacao?: string | null) {
    const painel = await this.buscarPorId(id);

    if (!Number.isInteger(saldo) || saldo < 0) {
      throw new ValidationError('Informe um saldo válido (número inteiro ≥ 0).');
    }

    const diferenca = saldo - painel.saldo;
    if (diferenca === 0) {
      return painel;
    }

    return painelCreditoRepository.definirSaldo(id, saldo, {
      tipo: 'AJUSTE',
      quantidade: Math.abs(diferenca),
      valorUnitario: painel.custoUnitario,
      valorTotal: Math.abs(diferenca) * painel.custoUnitario,
      observacao:
        observacao?.trim() ||
        (diferenca > 0
          ? `Ajuste manual (+${diferenca})`
          : `Ajuste manual (${diferenca})`),
    });
  }

  async adicionarCreditos(
    id: number,
    quantidade: number,
    observacao?: string | null
  ) {
    const painel = await this.buscarPorId(id);

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new ValidationError('Informe uma quantidade válida de créditos.');
    }

    const novoSaldo = painel.saldo + quantidade;

    return painelCreditoRepository.definirSaldo(id, novoSaldo, {
      tipo: 'COMPRA',
      quantidade,
      valorUnitario: painel.custoUnitario,
      valorTotal: quantidade * painel.custoUnitario,
      observacao: observacao?.trim() || `Compra de ${quantidade} crédito(s)`,
    });
  }

  async criar(dados: {
    nome: string;
    codigo?: string;
    custoUnitario?: number;
    urlPainel?: string | null;
    loginPainel?: string | null;
    senhaPainel?: string | null;
    ativo?: boolean;
  }) {
    if (!dados.nome?.trim()) {
      throw new ValidationError('Informe o nome do servidor/painel.');
    }

    const codigo = (dados.codigo?.trim() || gerarCodigoServidor(dados.nome)).toUpperCase();
    if (!/^[A-Z0-9_]+$/.test(codigo)) {
      throw new ValidationError(
        'Código inválido. Use apenas letras, números e underscore.'
      );
    }

    const existente = await painelCreditoRepository.findByCodigo(codigo);
    if (existente) {
      throw new ValidationError(`Já existe um servidor com o código ${codigo}.`);
    }

    if (dados.custoUnitario !== undefined) {
      const custo = Number(dados.custoUnitario);
      if (Number.isNaN(custo) || custo < 0) {
        throw new ValidationError('Informe um valor válido por crédito.');
      }
    }

    return painelCreditoRepository.create({
      codigo,
      nome: dados.nome.trim(),
      custoUnitario: dados.custoUnitario,
      urlPainel: dados.urlPainel,
      loginPainel: dados.loginPainel,
      senhaPainel: dados.senhaPainel,
      ativo: dados.ativo,
    });
  }

  async excluir(id: number) {
    const painel = await this.buscarPorId(id);
    const clientes = await painelCreditoRepository.countClientesPorCodigo(painel.codigo);
    if (clientes > 0) {
      throw new ValidationError(
        `Não é possível excluir: ${clientes} cliente(s) vinculado(s) a este servidor.`
      );
    }

    await painelCreditoRepository.delete(id);
    return { id };
  }

  async atualizar(
    id: number,
    dados: {
      nome?: string;
      custoUnitario?: number;
      saldo?: number;
      urlPainel?: string | null;
      loginPainel?: string | null;
      senhaPainel?: string | null;
      ativo?: boolean;
    }
  ) {
    const painel = await this.buscarPorId(id);

    if (dados.custoUnitario !== undefined) {
      const custo = Number(dados.custoUnitario);
      if (Number.isNaN(custo) || custo < 0) {
        throw new ValidationError('Informe um valor válido por crédito.');
      }
    }

    if (dados.nome !== undefined && !dados.nome.trim()) {
      throw new ValidationError('Informe o nome do servidor/painel.');
    }

    let atualizado = painel;
    let custoUnitarioAlterado = false;

    if (dados.nome !== undefined || dados.custoUnitario !== undefined ||
        dados.urlPainel !== undefined || dados.loginPainel !== undefined ||
        dados.senhaPainel !== undefined || dados.ativo !== undefined) {
      custoUnitarioAlterado =
        dados.custoUnitario !== undefined &&
        Number(dados.custoUnitario) !== painel.custoUnitario;
      atualizado = await painelCreditoRepository.update(id, {
        nome: dados.nome,
        custoUnitario: dados.custoUnitario,
        urlPainel: dados.urlPainel,
        loginPainel: dados.loginPainel,
        senhaPainel: dados.senhaPainel,
        ativo: dados.ativo,
      });
    }

    if (custoUnitarioAlterado) {
      await this.sincronizarCustoCreditoClientes(
        atualizado.codigo,
        atualizado.custoUnitario
      );
    }

    if (dados.saldo !== undefined && dados.saldo !== painel.saldo) {
      atualizado = await this.definirSaldo(
        id,
        dados.saldo,
        'Atualização em Configurações'
      );
    }

    return atualizado;
  }

  async sincronizarCustoCreditoClientes(
    codigo: string,
    custoUnitario: number
  ): Promise<number> {
    const clientes = await prisma.cliente.findMany({
      where: { somenteContato: false },
      select: { id: true, servidor: true },
    });

    const ids = clientes
      .filter((cliente) => normalizarCodigoPainel(cliente.servidor) === codigo)
      .map((cliente) => cliente.id);

    if (ids.length === 0) {
      return 0;
    }

    await prisma.cliente.updateMany({
      where: { id: { in: ids } },
      data: { custoCredito: custoUnitario },
    });

    return ids.length;
  }

  async resolverCustoCredito(servidor?: string | null): Promise<number> {
    await painelCreditoRepository.ensureDefaults();
    const paineis = await painelCreditoRepository.findAll();
    const mapa = Object.fromEntries(
      paineis.map((painel) => [painel.codigo, painel.custoUnitario])
    ) as Record<string, number>;

    return resolverCustoCreditoPorServidor(servidor, mapa);
  }

  async consumirPorServidor(params: {
    servidor?: string | null;
    clienteId: number;
    mensalidadeId?: number | null;
    motivo: string;
  }) {
    const codigo = normalizarCodigoPainel(params.servidor);
    if (!codigo) {
      return null;
    }

    await painelCreditoRepository.ensureDefaults();
    const painel = await painelCreditoRepository.findByCodigo(codigo);
    if (!painel) {
      throw new ValidationError(`Painel ${codigo} não configurado.`);
    }

    if (painel.saldo <= 0) {
      throw new SaldoInsuficienteError(
        `Saldo insuficiente no ${painel.nome}. Disponível: ${painel.saldo} crédito(s).`
      );
    }

    const novoSaldo = painel.saldo - 1;

    await painelCreditoRepository.definirSaldo(painel.id, novoSaldo, {
      tipo: 'CONSUMO',
      quantidade: 1,
      valorUnitario: painel.custoUnitario,
      valorTotal: painel.custoUnitario,
      clienteId: params.clienteId,
      mensalidadeId: params.mensalidadeId ?? null,
      observacao: params.motivo,
    });

    return {
      codigo: painel.codigo,
      custoUnitario: painel.custoUnitario,
      saldoRestante: novoSaldo,
    };
  }

  async obterCustoConsumidoNoPeriodo(inicio: Date, fim: Date) {
    const agg = await painelCreditoRepository.somarConsumoNoPeriodo(inicio, fim);
    return {
      valor: Math.round((agg._sum.valorTotal ?? 0) * 100) / 100,
      quantidade: agg._sum.quantidade ?? 0,
    };
  }

  obterConsumoPorMesNoAno(ano: number) {
    return painelCreditoRepository.consumoPorMesNoAno(ano);
  }

  async listarConsumos(periodo?: string) {
    const referencia = periodo ? parsePeriodo(periodo) : periodoAtual();
    const { inicio, fim } = limitesMes(referencia.ano, referencia.mes);

    const [movimentos, agg] = await Promise.all([
      painelCreditoRepository.listarConsumosNoPeriodo(inicio, fim),
      painelCreditoRepository.somarConsumoNoPeriodo(inicio, fim),
    ]);

    const clienteIds = [
      ...new Set(
        movimentos
          .map((item) => item.clienteId)
          .filter((id): id is number => id != null)
      ),
    ];

    const clientes =
      clienteIds.length > 0
        ? await prisma.cliente.findMany({
            where: { id: { in: clienteIds } },
            select: { id: true, nome: true },
          })
        : [];

    const nomesClientes = new Map(clientes.map((c) => [c.id, c.nome]));

    const itens = movimentos.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      clienteId: item.clienteId,
      clienteNome: item.clienteId
        ? nomesClientes.get(item.clienteId) ?? 'Cliente'
        : null,
      painelCodigo: item.painel.codigo,
      painelNome: item.painel.nome,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      observacao: item.observacao,
    }));

    return {
      periodo: `${referencia.ano}-${String(referencia.mes).padStart(2, '0')}`,
      resumo: {
        total: Math.round((agg._sum.valorTotal ?? 0) * 100) / 100,
        quantidade: agg._sum.quantidade ?? 0,
      },
      itens,
    };
  }
}

export class PainelCreditoNotFoundError extends Error {
  constructor() {
    super('Painel de crédito não encontrado.');
    this.name = 'PainelCreditoNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SaldoInsuficienteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaldoInsuficienteError';
  }
}

export const painelCreditoService = new PainelCreditoService();
