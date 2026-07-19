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

    await this.sincronizarMensalidadesPendentes(id, dados, cliente);

    return aplicarStatusCliente(cliente);
  }

  private async sincronizarMensalidadesPendentes(
    clienteId: number,
    dados: UpdateClienteDto,
    cliente: Awaited<ReturnType<typeof clienteRepository.update>>
  ): Promise<void> {
    const expiraInformado = dados.expiraEm !== undefined && !!dados.expiraEm;
    const valorInformado = dados.valorMensal !== undefined;

    if (expiraInformado) {
      const vencimento = new Date(dados.expiraEm!);
      const valor = Number(dados.valorMensal ?? cliente.valorMensal);

      const resultado = await mensalidadeRepository.sincronizarPendentesDoCliente(
        clienteId,
        {
          vencimento,
          valor: valorInformado ? valor : undefined,
        }
      );

      if (resultado.count === 0 && valor > 0) {
        await mensalidadeRepository.create({
          clienteId,
          referencia: formatReferencia(vencimento),
          valor,
          vencimento,
          status: 'PENDENTE',
        });
      }

      return;
    }

    if (valorInformado) {
      await mensalidadeRepository.sincronizarPendentesDoCliente(clienteId, {
        valor: Number(dados.valorMensal),
      });
    }
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    await clienteRepository.delete(id);
  }

  async sincronizarCobrancasPendentes() {
    const clientes = await clienteRepository.findAll();
    let clientesAlinhados = 0;
    let mensalidadesAlinhadas = 0;

    for (const cliente of clientes) {
      if (!cliente.expiraEm || cliente.valorMensal <= 0) {
        continue;
      }

      const vencimento = new Date(cliente.expiraEm);
      const valor = Number(cliente.valorMensal);
      const resultado = await mensalidadeRepository.sincronizarPendentesDoCliente(
        cliente.id,
        { vencimento, valor }
      );

      if (resultado.count > 0) {
        clientesAlinhados += 1;
        mensalidadesAlinhadas += resultado.count;
        continue;
      }

      await mensalidadeRepository.create({
        clienteId: cliente.id,
        referencia: formatReferencia(vencimento),
        valor,
        vencimento,
        status: 'PENDENTE',
      });
      clientesAlinhados += 1;
      mensalidadesAlinhadas += 1;
    }

    return { clientes: clientesAlinhados, mensalidades: mensalidadesAlinhadas };
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
