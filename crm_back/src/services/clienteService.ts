import { clienteRepository } from '../repositories/clienteRepository.js';
import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import type { CreateClienteDto, UpdateClienteDto } from '../models/index.js';
import { formatReferencia } from '../utils/helpers/dateHelpers.js';
import { aplicarStatusCliente } from '../utils/helpers/clienteStatus.js';

export class ClienteService {
  async listar() {
    const clientes = await clienteRepository.findAll();
    return clientes.map(aplicarStatusCliente);
  }

  async buscarPorId(id: number) {
    const cliente = await clienteRepository.findById(id);
    if (!cliente) {
      throw new ClienteNotFoundError();
    }
    return aplicarStatusCliente(cliente);
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

    return aplicarStatusCliente(cliente);
  }

  async atualizar(id: number, dados: UpdateClienteDto) {
    await this.buscarPorId(id);
    const cliente = await clienteRepository.update(id, dados);
    return aplicarStatusCliente(cliente);
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
