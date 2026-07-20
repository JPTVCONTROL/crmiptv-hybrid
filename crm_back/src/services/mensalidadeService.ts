import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import {
  calcularNovoVencimento,
  formatReferencia,
  parseDataSomenteDia,
} from '../utils/helpers/dateHelpers.js';

type MensalidadeComCliente = NonNullable<
  Awaited<ReturnType<typeof mensalidadeRepository.findById>>
>;

export class MensalidadeService {
  listar() {
    return mensalidadeRepository.findAll();
  }

  async registrarPagamento(id: number, pagoEm?: string) {
    const pagamento = parseDataPagamento(pagoEm);
    const resultado = await this.executarPagamento(id, pagamento);
    return resultado;
  }

  async renovarCortesia(id: number) {
    const mensalidade = await mensalidadeRepository.findById(id);

    if (!mensalidade) {
      throw new MensalidadeNotFoundError();
    }

    if (!mensalidade.cliente.cortesia) {
      throw new ValidationError(
        'Renovação cortesia só está disponível para clientes marcados como cortesia.'
      );
    }

    if (mensalidade.status === 'PAGO') {
      throw new ValidationError('Esta mensalidade já foi renovada.');
    }

    const plano = mensalidade.cliente.plano ?? null;
    const renovacaoEm = new Date();
    const novoVencimento = calcularNovoVencimento(
      new Date(mensalidade.vencimento),
      renovacaoEm,
      plano
    );
    const referencia = formatReferencia(novoVencimento);

    await mensalidadeRepository.registrarPagamento(
      id,
      mensalidade.clienteId,
      novoVencimento,
      referencia,
      0,
      renovacaoEm
    );

    return {
      novoVencimento: novoVencimento.toISOString(),
    };
  }

  async registrarPagamentos(ids: number[], pagoEm?: string) {
    const unicos = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];

    if (unicos.length === 0) {
      throw new ValidationError('Informe ao menos uma mensalidade.');
    }

    const pagamento = parseDataPagamento(pagoEm);
    const sucesso: number[] = [];
    const erros: { id: number; mensagem: string }[] = [];

    for (const id of unicos) {
      try {
        await this.executarPagamento(id, pagamento);
        sucesso.push(id);
      } catch (error) {
        erros.push({
          id,
          mensagem:
            error instanceof Error ? error.message : 'Erro ao registrar pagamento.',
        });
      }
    }

    if (sucesso.length === 0) {
      throw new ValidationError(
        erros[0]?.mensagem ?? 'Nenhum pagamento foi registrado.'
      );
    }

    return {
      sucesso: sucesso.length,
      erros,
      pagoEm: pagamento.toISOString(),
    };
  }

  async registrarContato(id: number, contatoEm?: string) {
    const mensalidade = await mensalidadeRepository.findById(id);

    if (!mensalidade) {
      throw new MensalidadeNotFoundError();
    }

    if (mensalidade.status === 'PAGO') {
      throw new ValidationError('Não é possível registrar contato em mensalidade paga.');
    }

    const dataContato = parseDataContato(contatoEm);
    await mensalidadeRepository.registrarContato(id, dataContato);

    return dataContato;
  }

  async registrarContatos(ids: number[], contatoEm?: string) {
    const unicos = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];

    if (unicos.length === 0) {
      throw new ValidationError('Informe ao menos uma mensalidade.');
    }

    const dataContato = parseDataContato(contatoEm);
    const resultado = await mensalidadeRepository.registrarContatos(
      unicos,
      dataContato
    );

    return { atualizados: resultado.count, contatoEm: dataContato };
  }

  private async executarPagamento(id: number, pagamento: Date) {
    const mensalidade = await mensalidadeRepository.findById(id);

    if (!mensalidade) {
      throw new MensalidadeNotFoundError();
    }

    if (mensalidade.status === 'PAGO') {
      throw new ValidationError('Esta mensalidade já foi paga.');
    }

    if (mensalidade.cliente.cortesia) {
      throw new ValidationError(
        'Cliente cortesia: use a renovação cortesia em vez de registrar pagamento.'
      );
    }

    const plano = mensalidade.cliente.plano ?? null;
    const valorRenovacao = resolverValorRenovacao(mensalidade);
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
      valorRenovacao,
      pagamento
    );

    return {
      novoVencimento: novoVencimento.toISOString(),
      valorRenovacao,
    };
  }
}

function resolverValorRenovacao(mensalidade: MensalidadeComCliente): number {
  const { cliente } = mensalidade;

  if (cliente.valorMensal > 0) {
    return cliente.valorMensal;
  }

  if (cliente.plano?.valor && cliente.plano.valor > 0) {
    return cliente.plano.valor;
  }

  return mensalidade.valor;
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
  const pago = parseDataSomenteDia(data).getTime();
  const hoje = parseDataSomenteDia(new Date()).getTime();
  if (pago > hoje) {
    throw new ValidationError('A data do pagamento não pode ser futura.');
  }
}

function parseDataContato(valor?: string): Date {
  if (!valor?.trim()) {
    return new Date();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const data = new Date(`${valor}T12:00:00`);
    if (Number.isNaN(data.getTime())) {
      throw new ValidationError('Data de contato inválida.');
    }
    return data;
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new ValidationError('Data de contato inválida.');
  }

  return data;
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
