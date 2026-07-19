import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import {
  calcularNovoVencimento,
  formatReferencia,
  stripTime,
} from '../utils/helpers/dateHelpers.js';

export class MensalidadeService {
  listar() {
    return mensalidadeRepository.findAll();
  }

  async registrarPagamento(id: number, pagoEm?: string) {
    const mensalidade = await mensalidadeRepository.findById(id);

    if (!mensalidade) {
      throw new MensalidadeNotFoundError();
    }

    if (mensalidade.status === 'PAGO') {
      throw new ValidationError('Esta mensalidade já foi paga.');
    }

    const pagamento = parseDataPagamento(pagoEm);
    const plano = mensalidade.cliente.plano ?? null;
    const novoVencimento = calcularNovoVencimento(
      new Date(mensalidade.vencimento),
      pagamento,
      plano
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

function parseDataPagamento(valor?: string): Date {
  if (!valor?.trim()) {
    return new Date();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const data = new Date(`${valor}T12:00:00`);
    if (Number.isNaN(data.getTime())) {
      throw new ValidationError('Data de pagamento inválida.');
    }
    validarDataPagamento(data);
    return data;
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new ValidationError('Data de pagamento inválida.');
  }

  validarDataPagamento(data);
  return data;
}

function validarDataPagamento(data: Date): void {
  if (stripTime(data).getTime() > stripTime(new Date()).getTime()) {
    throw new ValidationError('A data do pagamento não pode ser futura.');
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
