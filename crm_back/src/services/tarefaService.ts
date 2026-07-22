import { tarefaRepository } from '../repositories/tarefaRepository.js';
import { clienteRepository } from '../repositories/clienteRepository.js';
import type { CreateTarefaDto, UpdateTarefaDto } from '../models/index.js';
import { parseDataSomenteDia } from '../utils/helpers/dateHelpers.js';

export class TarefaService {
  listar(filtro: { concluida?: boolean; clienteId?: number } = {}) {
    return tarefaRepository.findAll(filtro);
  }

  async buscarPorId(id: number) {
    const tarefa = await tarefaRepository.findById(id);
    if (!tarefa) {
      throw new TarefaNotFoundError();
    }
    return tarefa;
  }

  async criar(dados: CreateTarefaDto) {
    this.validarTitulo(dados.titulo);
    this.validarVencimento(dados.vencimentoEm);
    await this.validarCliente(dados.clienteId);

    return tarefaRepository.create(dados);
  }

  async atualizar(id: number, dados: UpdateTarefaDto) {
    await this.buscarPorId(id);

    if (dados.titulo !== undefined) {
      this.validarTitulo(dados.titulo);
    }

    if (dados.vencimentoEm !== undefined) {
      this.validarVencimento(dados.vencimentoEm);
    }

    if (dados.clienteId !== undefined) {
      await this.validarCliente(dados.clienteId);
    }

    return tarefaRepository.update(id, dados);
  }

  async concluir(id: number) {
    await this.buscarPorId(id);
    return tarefaRepository.marcarConcluida(id);
  }

  async reabrir(id: number) {
    await this.buscarPorId(id);
    return tarefaRepository.marcarPendente(id);
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    await tarefaRepository.delete(id);
  }

  private validarTitulo(titulo?: string) {
    if (!titulo?.trim()) {
      throw new ValidationError('O título da tarefa é obrigatório.');
    }
  }

  private validarVencimento(vencimentoEm?: string | Date) {
    if (!vencimentoEm) {
      throw new ValidationError('Informe a data do lembrete.');
    }

    parseDataSomenteDia(vencimentoEm);
  }

  private async validarCliente(clienteId?: number | null) {
    if (clienteId == null) {
      return;
    }

    const cliente = await clienteRepository.findById(clienteId);
    if (!cliente) {
      throw new ValidationError('Cliente não encontrado.');
    }
  }
}

export class TarefaNotFoundError extends Error {
  constructor() {
    super('Tarefa não encontrada.');
    this.name = 'TarefaNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const tarefaService = new TarefaService();
