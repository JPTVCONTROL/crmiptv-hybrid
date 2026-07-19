import { aplicativoRepository } from '../repositories/aplicativoRepository.js';
import type { CreateAplicativoDto, UpdateAplicativoDto } from '../models/index.js';

export class AplicativoService {
  listar() {
    return aplicativoRepository.findAll();
  }

  async buscarPorId(id: number) {
    const aplicativo = await aplicativoRepository.findById(id);
    if (!aplicativo) {
      throw new AplicativoNotFoundError();
    }
    return aplicativo;
  }

  async listarClientes(id: number) {
    await this.buscarPorId(id);
    return aplicativoRepository.findClientesByAplicativoId(id);
  }

  async criar(dados: CreateAplicativoDto) {
    if (!dados.nome?.trim()) {
      throw new ValidationError('O nome do aplicativo é obrigatório.');
    }
    return aplicativoRepository.create(dados);
  }

  async atualizar(id: number, dados: UpdateAplicativoDto) {
    await this.buscarPorId(id);
    return aplicativoRepository.update(id, dados);
  }

  async excluir(id: number) {
    const aplicativo = await this.buscarPorId(id);
    if (aplicativo._count.clientes > 0) {
      throw new ValidationError(
        'Não é possível excluir um aplicativo com clientes vinculados.'
      );
    }
    await aplicativoRepository.delete(id);
  }
}

export class AplicativoNotFoundError extends Error {
  constructor() {
    super('Aplicativo não encontrado.');
    this.name = 'AplicativoNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const aplicativoService = new AplicativoService();
