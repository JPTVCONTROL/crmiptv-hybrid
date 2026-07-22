import prisma from '../config/database.js';
import { despesaRepository } from '../repositories/despesaRepository.js';
import type { CreateDespesaDto, UpdateDespesaDto } from '../models/index.js';
import { montarResumoCustos } from '../utils/helpers/custoHelpers.js';

export class DespesaService {
  listar() {
    return despesaRepository.findAll();
  }

  async buscarPorId(id: number) {
    const despesa = await despesaRepository.findById(id);
    if (!despesa) {
      throw new DespesaNotFoundError();
    }
    return despesa;
  }

  async criar(dados: CreateDespesaDto) {
    this.validar(dados.nome, dados.valor);
    return despesaRepository.create(dados);
  }

  async atualizar(id: number, dados: UpdateDespesaDto) {
    await this.buscarPorId(id);

    if (dados.nome !== undefined || dados.valor !== undefined) {
      const atual = await despesaRepository.findById(id);
      this.validar(
        dados.nome ?? atual?.nome,
        dados.valor ?? atual?.valor
      );
    }

    return despesaRepository.update(id, dados);
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    await despesaRepository.delete(id);
  }

  async obterResumoCustos() {
    const [clientes, despesas] = await Promise.all([
      prisma.cliente.findMany({
        select: {
          id: true,
          nome: true,
          valorMensal: true,
          custoCredito: true,
          cortesia: true,
          somenteContato: true,
          ativo: true,
          expiraEm: true,
        },
        orderBy: { nome: 'asc' },
      }),
      despesaRepository.findAll(),
    ]);

    const resumo = montarResumoCustos(clientes, despesas);

    return {
      ...resumo,
      despesas,
    };
  }

  private validar(nome?: string, valor?: number) {
    if (!nome?.trim()) {
      throw new ValidationError('Informe o nome da despesa.');
    }

    if (valor === undefined || Number.isNaN(Number(valor)) || Number(valor) < 0) {
      throw new ValidationError('Informe um valor válido para a despesa.');
    }
  }
}

export class DespesaNotFoundError extends Error {
  constructor() {
    super('Despesa não encontrada.');
    this.name = 'DespesaNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const despesaService = new DespesaService();
