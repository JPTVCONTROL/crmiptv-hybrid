import { clienteRepository } from '../repositories/clienteRepository.js';
import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import type { CreateClienteDto, UpdateClienteDto } from '../models/index.js';
import { formatReferencia, parseExpiraEm } from '../utils/helpers/dateHelpers.js';
import { aplicarStatusCliente } from '../utils/helpers/clienteStatus.js';
import {
  normalizarTelefoneComparacao,
  parseCsvClientes,
} from '../utils/helpers/clienteImportHelpers.js';

export interface ImportacaoClientesResultado {
  importados: number;
  ignorados: number;
  erros: Array<{ linha: number; motivo: string }>;
}

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
    const somenteContato = Boolean(dados.somenteContato);
    const cortesia = Boolean(dados.cortesia);

    if (
      !somenteContato &&
      !cortesia &&
      (!dados.valorMensal || Number(dados.valorMensal) <= 0)
    ) {
      throw new ValidationError('Informe o valor mensal do cliente.');
    }

    await this.assertTelefoneUnico(dados.telefone);

    const cliente = await clienteRepository.create({
      ...dados,
      cortesia,
      somenteContato,
      incluirCobrancas: somenteContato
        ? false
        : dados.incluirCobrancas !== undefined
          ? Boolean(dados.incluirCobrancas)
          : true,
      valorMensal: somenteContato || cortesia ? 0 : Number(dados.valorMensal),
      expiraEm: somenteContato ? null : dados.expiraEm,
      planoId: somenteContato ? null : dados.planoId,
    });

    if (!somenteContato && dados.expiraEm) {
      const dataVencimento = parseExpiraEm(dados.expiraEm);
      await mensalidadeRepository.create({
        clienteId: cliente.id,
        referencia: formatReferencia(dataVencimento),
        valor: cortesia ? 0 : Number(dados.valorMensal),
        vencimento: dataVencimento,
        status: 'PENDENTE',
      });
    }

    return aplicarStatusCliente(cliente);
  }

  async atualizar(id: number, dados: UpdateClienteDto) {
    await this.buscarPorId(id);

    if (dados.telefone !== undefined) {
      await this.assertTelefoneUnico(dados.telefone, id);
    }

    const cliente = await clienteRepository.update(id, dados);

    const somenteContato = Boolean(dados.somenteContato ?? cliente.somenteContato);

    if (!somenteContato) {
      await this.sincronizarMensalidadesPendentes(id, dados, cliente);
    }

    if (dados.cortesia !== undefined) {
      await this.sincronizarValorMensalidadeCortesia(id, Boolean(cliente.cortesia));
    }

    return aplicarStatusCliente(cliente);
  }

  private async sincronizarValorMensalidadeCortesia(
    clienteId: number,
    cortesia: boolean
  ): Promise<void> {
    const cliente = await clienteRepository.findById(clienteId);
    if (!cliente) {
      return;
    }

    const valor = cortesia
      ? 0
      : cliente.valorMensal > 0
        ? cliente.valorMensal
        : cliente.plano?.valor ?? 0;

    if (valor > 0 || cortesia) {
      await mensalidadeRepository.sincronizarPendentesDoCliente(clienteId, {
        valor,
      });
    }
  }

  private async sincronizarMensalidadesPendentes(
    clienteId: number,
    dados: UpdateClienteDto,
    cliente: Awaited<ReturnType<typeof clienteRepository.update>>
  ): Promise<void> {
    const expiraInformado = dados.expiraEm !== undefined && !!dados.expiraEm;
    const valorInformado = dados.valorMensal !== undefined;

    if (expiraInformado) {
      const vencimento = parseExpiraEm(dados.expiraEm!);
      const cortesia = Boolean(dados.cortesia ?? cliente.cortesia);
      const valorBase = Number(dados.valorMensal ?? cliente.valorMensal);
      const valor = cortesia ? 0 : valorBase;

      const resultado = await mensalidadeRepository.sincronizarPendentesDoCliente(
        clienteId,
        {
          vencimento,
          valor: valorInformado || cortesia ? valor : undefined,
        }
      );

      if (resultado.count === 0 && (valor > 0 || cortesia)) {
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
      const cortesia = Boolean(dados.cortesia ?? cliente.cortesia);
      const valor = cortesia ? 0 : Number(dados.valorMensal);
      await mensalidadeRepository.sincronizarPendentesDoCliente(clienteId, {
        valor,
      });
    }
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    await clienteRepository.delete(id);
  }

  async definirInclusaoCobrancas(id: number, incluirCobrancas: boolean) {
    await this.buscarPorId(id);
    const cliente = await clienteRepository.updateIncluirCobrancas(
      id,
      incluirCobrancas
    );
    return aplicarStatusCliente(cliente);
  }

  async definirCortesia(id: number, cortesia: boolean) {
    await this.buscarPorId(id);
    const cliente = await clienteRepository.updateCortesia(id, cortesia);
    await this.sincronizarValorMensalidadeCortesia(id, cortesia);
    return aplicarStatusCliente(cliente);
  }

  async definirAtividade(
    id: number,
    ativo: boolean,
    incluirCampanhas: boolean,
    incluirCobrancas: boolean
  ) {
    await this.buscarPorId(id);
    const cliente = await clienteRepository.updateAtividade(id, {
      ativo,
      incluirCampanhas,
      incluirCobrancas,
    });
    return aplicarStatusCliente(cliente);
  }

  async importarCsv(
    conteudo: string,
    somenteContato = false
  ): Promise<ImportacaoClientesResultado> {
    if (!conteudo?.trim()) {
      throw new ValidationError('Envie um arquivo CSV com nome e telefone.');
    }

    const parseado = parseCsvClientes(conteudo);

    if (parseado.linhas.length === 0 && parseado.erros.length === 0) {
      throw new ValidationError('Nenhuma linha válida encontrada no arquivo.');
    }

    const clientesExistentes = await clienteRepository.findAll();
    const telefonesExistentes = new Set(
      clientesExistentes.map((cliente) =>
        normalizarTelefoneComparacao(cliente.telefone)
      )
    );
    const telefonesImportados = new Set<string>();

    let importados = 0;
    let ignorados = 0;
    const erros = [...parseado.erros];

    for (const linha of parseado.linhas) {
      const chave = normalizarTelefoneComparacao(linha.telefone);

      if (telefonesExistentes.has(chave) || telefonesImportados.has(chave)) {
        ignorados += 1;
        continue;
      }

      await clienteRepository.create({
        nome: linha.nome,
        telefone: linha.telefone,
        vencimento: 1,
        valorMensal: 0,
        somenteContato,
        incluirCobrancas: !somenteContato,
      });

      telefonesImportados.add(chave);
      importados += 1;
    }

    return { importados, ignorados, erros };
  }

  private async assertTelefoneUnico(
    telefone: string,
    ignorarClienteId?: number
  ): Promise<void> {
    const chave = normalizarTelefoneComparacao(telefone);
    if (!chave) {
      return;
    }

    const clientes = await clienteRepository.findTelefonesResumo();
    const duplicado = clientes.find((cliente) => {
      if (ignorarClienteId && cliente.id === ignorarClienteId) {
        return false;
      }

      return normalizarTelefoneComparacao(cliente.telefone) === chave;
    });

    if (duplicado) {
      throw new ValidationError(
        `Telefone já cadastrado para ${duplicado.nome}.`
      );
    }
  }

  async sincronizarCobrancasPendentes() {
    const clientes = await clienteRepository.findAll();
    let clientesAlinhados = 0;
    let mensalidadesAlinhadas = 0;

    for (const cliente of clientes) {
      if (
        cliente.somenteContato ||
        cliente.cortesia ||
        !cliente.expiraEm ||
        cliente.valorMensal <= 0
      ) {
        continue;
      }

      const vencimento = parseExpiraEm(cliente.expiraEm);
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
