import { campanhaRepository } from '../repositories/campanhaRepository.js';
import type { CreateCampanhaDto, UpdateCampanhaDto } from '../models/index.js';

const TIPOS_VALIDOS = new Set(['AVISO', 'PROMOCAO', 'DATA_COMEMORATIVA']);

export class CampanhaService {
  listar() {
    return campanhaRepository.findAll();
  }

  async buscarPorId(id: number) {
    const campanha = await campanhaRepository.findById(id);
    if (!campanha) {
      throw new CampanhaNotFoundError();
    }
    return campanha;
  }

  async criar(dados: CreateCampanhaDto) {
    this.validarCampos(dados.titulo, dados.mensagem, dados.tipo);
    return campanhaRepository.create(dados);
  }

  async atualizar(id: number, dados: UpdateCampanhaDto) {
    await this.buscarPorId(id);
    if (dados.titulo !== undefined && !dados.titulo.trim()) {
      throw new ValidationError('O título da campanha é obrigatório.');
    }
    if (dados.mensagem !== undefined && !dados.mensagem.trim()) {
      throw new ValidationError('A mensagem da campanha é obrigatória.');
    }
    if (dados.tipo !== undefined && !TIPOS_VALIDOS.has(dados.tipo)) {
      throw new ValidationError('Tipo de campanha inválido.');
    }
    return campanhaRepository.update(id, dados);
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    await campanhaRepository.delete(id);
  }

  async registrarEnvios(id: number, clienteIds: number[]) {
    await this.buscarPorId(id);
    if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
      throw new ValidationError('Informe ao menos um cliente para registrar o envio.');
    }
    return campanhaRepository.registrarEnvios(id, clienteIds);
  }

  private validarCampos(titulo: string, mensagem: string, tipo: string) {
    if (!titulo?.trim()) {
      throw new ValidationError('O título da campanha é obrigatório.');
    }
    if (!mensagem?.trim()) {
      throw new ValidationError('A mensagem da campanha é obrigatória.');
    }
    if (!TIPOS_VALIDOS.has(tipo)) {
      throw new ValidationError('Tipo de campanha inválido.');
    }
  }
}

export class CampanhaNotFoundError extends Error {
  constructor() {
    super('Campanha não encontrada.');
    this.name = 'CampanhaNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const campanhaService = new CampanhaService();
