import { dispositivoRepository } from '../repositories/dispositivoRepository.js';
import type { CreateDispositivoDto, UpdateDispositivoDto } from '../models/index.js';

export class DispositivoService {
  listar() {
    return dispositivoRepository.findAll();
  }

  async buscarPorId(id: number) {
    const dispositivo = await dispositivoRepository.findById(id);
    if (!dispositivo) {
      throw new DispositivoNotFoundError();
    }
    return dispositivo;
  }

  async criar(dados: CreateDispositivoDto) {
    if (!dados.nome?.trim()) {
      throw new ValidationError('O nome do dispositivo é obrigatório.');
    }
    return dispositivoRepository.create(dados);
  }

  async atualizar(id: number, dados: UpdateDispositivoDto) {
    await this.buscarPorId(id);
    return dispositivoRepository.update(id, dados);
  }

  async excluir(id: number) {
    const dispositivo = await this.buscarPorId(id);
    if (dispositivo._count.clientes > 0) {
      throw new ValidationError(
        'Não é possível excluir um dispositivo com clientes vinculados.'
      );
    }
    await dispositivoRepository.delete(id);
  }
}

export class DispositivoNotFoundError extends Error {
  constructor() {
    super('Dispositivo não encontrado.');
    this.name = 'DispositivoNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const dispositivoService = new DispositivoService();
