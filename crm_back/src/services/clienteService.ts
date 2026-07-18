import { clienteRepository } from '../repositories/clienteRepository.js';
import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import type { CreateClienteDto, UpdateClienteDto } from '../models/index.js';
import { formatReferencia } from '../utils/helpers/dateHelpers.js';

export class ClienteService {
  listar() {
    return clienteRepository.findAll();
  }

  async buscarPorId(id: number) {
    const cliente = await clienteRepository.findById(id);
    if (!cliente) {
      throw new ClienteNotFoundError();
    }
    return cliente;
  }

  async criar(dados: CreateClienteDto) {
    if (!dados.valorMensal || Number(dados.valorMensal) <= 0) {
      throw new ValidationError('Informe o valor mensal do cliente.');
    }

    const cliente = await clienteRepository.create(dados);

    if (dados.expiraEm) {
      const dataVencimento = new Date(dados.expiraEm);
      await mensalidadeRepository.create({
        clienteId: cliente.id,
        referencia: formatReferencia(dataVencimento),
        valor: Number(dados.valorMensal),
        vencimento: dataVencimento,
        status: 'PENDENTE',
      });
    }

    return cliente;
  }

  async atualizar(id: number, dados: UpdateClienteDto) {
    await this.buscarPorId(id);
    return clienteRepository.update(id, dados);
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    await clienteRepository.delete(id);
  }
}

export class ClienteNotFoundError extends Error {
  constructor() {
    super('Cliente não encontrado');
    this.name = 'ClienteNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const clienteService = new ClienteService();
