import { clienteRepository } from '../repositories/clienteRepository.js';
import { mensalidadeRepository } from '../repositories/mensalidadeRepository.js';
import type { CreateClienteDto, UpdateClienteDto } from '../models/index.js';
import { formatReferencia, parseExpiraEm } from '../utils/helpers/dateHelpers.js';
import { aplicarStatusCliente } from '../utils/helpers/clienteStatus.js';
import {
  normalizarTelefoneComparacao,
  parseCsvClientes,
} from '../utils/helpers/clienteImportHelpers.js';
import { calcularLimitesDashboard } from '../utils/helpers/dashboardStatusLimits.js';
import { clienteElegivelMensalidadePendente } from '../utils/helpers/cobrancaDiariaHelpers.js';
import {
  painelCreditoService,
  SaldoInsuficienteError,
} from './painelCreditoService.js';
import { normalizarCodigoPainel } from '../utils/helpers/painelCreditoHelpers.js';

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

    const custoCredito = await this.resolverCustoCreditoCliente(
      dados.servidor,
      dados.custoCredito
    );

    if (this.deveConsumirCredito(somenteContato, dados.expiraEm, dados.servidor)) {
      await this.validarSaldoPainel(dados.servidor);
    }

    const cliente = await clienteRepository.create({
      ...dados,
      cortesia,
      somenteContato,
      custoCredito,
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

      await this.consumirCreditoCliente(
        cliente.id,
        dados.servidor,
        'Ativação de novo cliente'
      );
    }

    return aplicarStatusCliente(cliente);
  }

  async atualizar(id: number, dados: UpdateClienteDto) {
    const anterior = await this.buscarPorId(id);

    if (dados.telefone !== undefined) {
      await this.assertTelefoneUnico(dados.telefone, id);
    }

    const somenteContatoNovo = Boolean(
      dados.somenteContato ?? anterior.somenteContato
    );
    const expiraEmNovo =
      dados.expiraEm !== undefined ? dados.expiraEm : anterior.expiraEm;
    const servidorNovo =
      dados.servidor !== undefined ? dados.servidor : anterior.servidor;

    const ativandoPlano =
      !somenteContatoNovo &&
      !!expiraEmNovo &&
      (anterior.somenteContato || !anterior.expiraEm);

    if (ativandoPlano) {
      await this.validarSaldoPainel(servidorNovo);
    }

    const custoCredito =
      dados.custoCredito !== undefined
        ? Number(dados.custoCredito)
        : dados.servidor !== undefined
          ? await this.resolverCustoCreditoCliente(
              servidorNovo,
              anterior.custoCredito
            )
          : undefined;

    const cliente = await clienteRepository.update(id, {
      ...dados,
      ...(custoCredito !== undefined ? { custoCredito } : {}),
    });

    const somenteContato = Boolean(dados.somenteContato ?? cliente.somenteContato);

    if (somenteContato) {
      await mensalidadeRepository.removerPendentesDoCliente(id);
    } else {
      await this.sincronizarMensalidadesPendentes(id, dados, cliente);
    }

    if (dados.cortesia !== undefined) {
      await this.sincronizarValorMensalidadeCortesia(id, Boolean(cliente.cortesia));
    }

    if (ativandoPlano) {
      await this.consumirCreditoCliente(
        id,
        servidorNovo,
        'Ativação de plano do cliente'
      );
    }

    return aplicarStatusCliente(cliente);
  }

  private async resolverCustoCreditoCliente(
    servidor?: string | null,
    custoInformado?: number | null
  ): Promise<number> {
    if (custoInformado !== undefined && custoInformado !== null && custoInformado > 0) {
      return Number(custoInformado);
    }

    const automatico = await painelCreditoService.resolverCustoCredito(servidor);
    if (automatico > 0) {
      return automatico;
    }

    return Number(custoInformado ?? 0);
  }

  private deveConsumirCredito(
    somenteContato: boolean,
    expiraEm?: string | null,
    servidor?: string | null
  ): boolean {
    return !somenteContato && !!expiraEm && !!servidor?.trim();
  }

  private async validarSaldoPainel(servidor?: string | null): Promise<void> {
    const codigo = normalizarCodigoPainel(servidor);
    if (!codigo) {
      return;
    }

    const paineis = await painelCreditoService.listar();
    const painel = paineis.find((item) => item.codigo === codigo);

    if (painel && painel.saldo <= 0) {
      throw new SaldoInsuficienteError(
        `Saldo insuficiente no ${painel.nome}. Disponível: ${painel.saldo} crédito(s).`
      );
    }
  }

  private async consumirCreditoCliente(
    clienteId: number,
    servidor?: string | null,
    motivo?: string,
    mensalidadeId?: number | null
  ): Promise<void> {
    await painelCreditoService.consumirPorServidor({
      servidor,
      clienteId,
      mensalidadeId,
      motivo: motivo ?? 'Consumo de crédito',
    });
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
    if (!clienteElegivelMensalidadePendente(cliente)) {
      await mensalidadeRepository.removerPendentesDoCliente(clienteId);
      return;
    }

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

      await this.deduplicarMensalidadesPendentes(clienteId);
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

    if (!incluirCobrancas) {
      await mensalidadeRepository.removerPendentesDoCliente(id);
    } else {
      await this.alinharMensalidadePendenteDoCliente(cliente);
    }

    return aplicarStatusCliente(cliente);
  }

  async definirCortesia(id: number, cortesia: boolean) {
    await this.buscarPorId(id);
    const cliente = await clienteRepository.updateCortesia(id, cortesia);
    await this.sincronizarValorMensalidadeCortesia(id, cortesia);
    const atualizado = await clienteRepository.findById(id);
    if (atualizado) {
      await this.alinharMensalidadePendenteDoCliente(atualizado);
    }
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

    if (!ativo || !incluirCobrancas) {
      await mensalidadeRepository.removerPendentesDoCliente(id);
    } else {
      await this.alinharMensalidadePendenteDoCliente(cliente);
    }

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
    const arquivados = await this.arquivarClientesAtrasoCritico();
    const limpeza = await mensalidadeRepository.removerPendentesDeClientesSemCobranca();

    const clientes = await clienteRepository.findAll();
    let clientesAlinhados = 0;
    let mensalidadesAlinhadas = 0;
    let removidasInelegiveis = 0;

    for (const cliente of clientes) {
      if (!clienteElegivelMensalidadePendente(cliente)) {
        const removidas = await mensalidadeRepository.removerPendentesDoCliente(
          cliente.id
        );
        removidasInelegiveis += removidas.count;
        continue;
      }

      const alinhamento = await this.alinharMensalidadePendenteDoCliente(cliente);
      if (alinhamento.alinhada) {
        clientesAlinhados += 1;
        mensalidadesAlinhadas += alinhamento.mensalidades;
      }
    }

    return {
      clientes: clientesAlinhados,
      mensalidades: mensalidadesAlinhadas,
      removidas: limpeza.count + removidasInelegiveis,
      arquivados,
    };
  }

  private async alinharMensalidadePendenteDoCliente(
    cliente: Awaited<ReturnType<typeof clienteRepository.findById>>
  ): Promise<{ alinhada: boolean; mensalidades: number }> {
    if (!cliente || !clienteElegivelMensalidadePendente(cliente)) {
      return { alinhada: false, mensalidades: 0 };
    }

    const vencimento = parseExpiraEm(cliente.expiraEm!);
    const valor = cliente.cortesia ? 0 : Number(cliente.valorMensal);
    const resultado = await mensalidadeRepository.sincronizarPendentesDoCliente(
      cliente.id,
      { vencimento, valor }
    );

    let mensalidades = resultado.count;

    if (resultado.count === 0) {
      await mensalidadeRepository.create({
        clienteId: cliente.id,
        referencia: formatReferencia(vencimento),
        valor,
        vencimento,
        status: 'PENDENTE',
      });
      mensalidades = 1;
    }

    await this.deduplicarMensalidadesPendentes(cliente.id);

    return { alinhada: true, mensalidades };
  }

  private async deduplicarMensalidadesPendentes(clienteId: number): Promise<void> {
    const pendentes = await mensalidadeRepository.findPendentesByClienteId(clienteId);
    if (pendentes.length <= 1) {
      return;
    }

    const [, ...extras] = pendentes;
    for (const mensalidade of extras) {
      await mensalidadeRepository.deleteById(mensalidade.id);
    }
  }

  /** Após 7 dias de atraso: inativo + somente contato, sem cobranças pendentes. */
  async arquivarClientesAtrasoCritico(): Promise<number> {
    const limites = calcularLimitesDashboard();
    const candidatos = await clienteRepository.findIdsParaArquivarPorAtraso(
      limites.inicioAtrasado
    );

    let arquivados = 0;
    for (const { id } of candidatos) {
      await mensalidadeRepository.removerPendentesDoCliente(id);
      await clienteRepository.arquivarSomenteContato(id);
      arquivados += 1;
    }

    return arquivados;
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
