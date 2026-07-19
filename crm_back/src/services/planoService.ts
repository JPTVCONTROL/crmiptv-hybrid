import { planoRepository } from '../repositories/planoRepository.js';
import type { CreatePlanoDto, UpdatePlanoDto } from '../models/index.js';

export class PlanoService {
  listar() {
    return planoRepository.findAll();
  }

  async buscarPorId(id: number) {
    const plano = await planoRepository.findById(id);
    if (!plano) {
      throw new PlanoNotFoundError();
    }
    return plano;
  }

  async criar(dados: CreatePlanoDto) {
    if (!dados.nome?.trim()) {
      throw new ValidationError('O nome do plano é obrigatório.');
    }
    if (!dados.valor || Number(dados.valor) <= 0) {
      throw new ValidationError('Informe um valor válido para o plano.');
    }
    if (!dados.diasValidade || Number(dados.diasValidade) <= 0) {
      throw new ValidationError('Informe os dias de validade do plano.');
    }
    return planoRepository.create(dados);
  }

  async atualizar(id: number, dados: UpdatePlanoDto) {
    await this.buscarPorId(id);
    return planoRepository.update(id, dados);
  }

  async excluir(id: number) {
    const plano = await this.buscarPorId(id);
    if (plano._count.clientes > 0) {
      throw new ValidationError(
        'Não é possível excluir um plano com clientes vinculados.'
      );
    }
    await planoRepository.delete(id);
  }
}

export class PlanoNotFoundError extends Error {
  constructor() {
    super('Plano não encontrado.');
    this.name = 'PlanoNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const planoService = new PlanoService();
