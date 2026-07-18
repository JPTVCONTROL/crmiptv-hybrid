import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import {
  calcularNovoVencimento,
  formatReferencia,
} from '../utils/helpers/dateHelpers.js';

export class MensalidadeService {
  listar() {
    return mensalidadeRepository.findAll();
  }

  async registrarPagamento(id: number) {
    const mensalidade = await mensalidadeRepository.findById(id);

    if (!mensalidade) {
      throw new MensalidadeNotFoundError();
    }

    if (mensalidade.status === 'PAGO') {
      throw new ValidationError('Esta mensalidade já foi paga.');
    }

    const pagamento = new Date();
    const novoVencimento = calcularNovoVencimento(
      new Date(mensalidade.vencimento),
      pagamento
    );
    const referencia = formatReferencia(novoVencimento);

    await mensalidadeRepository.registrarPagamento(
      id,
      mensalidade.clienteId,
      novoVencimento,
      referencia,
      mensalidade.valor,
      pagamento
    );

    return novoVencimento;
  }
}

export class MensalidadeNotFoundError extends Error {
  constructor() {
    super('Mensalidade não encontrada');
    this.name = 'MensalidadeNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const mensalidadeService = new MensalidadeService();
