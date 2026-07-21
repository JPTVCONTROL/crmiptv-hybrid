import { Cliente, Configuracao, Mensalidade } from '../../core/models';
import {
  montarMensagemBloqueioMensalidade,
  montarMensagemCobrancaMensalidade,
} from './cobranca-lote';
import { clienteParticipaCobrancas } from './cobranca-diaria';
import { resolverStatusCliente, StatusCliente } from './formatters';
import { CobrancaLoteItem, telefoneValidoParaWhatsApp } from './whatsapp';

export function mensalidadePendenteCliente(
  cliente: Cliente
): Mensalidade | undefined {
  return cliente.mensalidades?.find((m) => m.status === 'PENDENTE');
}

export function formatReferenciaCliente(dataIso: string): string {
  const trimmed = dataIso.trim();
  const base = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T12:00:00`
    : trimmed;
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${year}`;
}

export function mensalidadeParaCobrancaCliente(cliente: Cliente): Mensalidade | null {
  const pendente = mensalidadePendenteCliente(cliente);
  if (pendente) {
    return pendente;
  }

  if (!cliente.expiraEm?.trim()) {
    return null;
  }

  const valor =
    cliente.valorMensal > 0
      ? cliente.valorMensal
      : cliente.plano?.valor && cliente.plano.valor > 0
        ? cliente.plano.valor
        : 0;

  if (valor <= 0) {
    return null;
  }

  const vencimento = cliente.expiraEm.includes('T')
    ? cliente.expiraEm.split('T')[0]
    : cliente.expiraEm;

  return {
    id: -cliente.id,
    clienteId: cliente.id,
    referencia: formatReferenciaCliente(vencimento),
    valor,
    vencimento,
    status: 'PENDENTE',
  };
}

export function statusClienteParaCobranca(cliente: Cliente): StatusCliente {
  return resolverStatusCliente(cliente);
}

export function clienteElegivelCobranca(cliente: Cliente): boolean {
  if (!clienteParticipaCobrancas(cliente)) {
    return false;
  }

  const status = statusClienteParaCobranca(cliente);
  if (status !== 'ATRASADO' && status !== 'INATIVO') {
    return false;
  }

  if (!telefoneValidoParaWhatsApp(cliente.telefone)) {
    return false;
  }

  return mensalidadeParaCobrancaCliente(cliente) !== null;
}

export function montarItemCobrancaCliente(
  cliente: Cliente,
  configuracao: Configuracao | null
): CobrancaLoteItem | null {
  const mensalidade = mensalidadeParaCobrancaCliente(cliente);
  if (!mensalidade) {
    return null;
  }

  const status = statusClienteParaCobranca(cliente);
  const mensagem =
    status === 'INATIVO'
      ? montarMensagemBloqueioMensalidade(
          mensalidade,
          configuracao,
          undefined,
          cliente.nome
        )
      : montarMensagemCobrancaMensalidade(
          mensalidade,
          configuracao,
          undefined,
          true,
          cliente.nome
        );

  const mensalidadeId =
    mensalidade.id > 0 ? mensalidade.id : mensalidadePendenteCliente(cliente)?.id;

  return {
    id: mensalidadeId ?? cliente.id,
    nome: cliente.nome,
    telefone: cliente.telefone,
    mensagem,
  };
}

export function montarItensCobrancaClientes(
  clientes: Cliente[],
  idsSelecionados: Set<number>,
  configuracao: Configuracao | null
): CobrancaLoteItem[] {
  return clientes
    .filter((cliente) => idsSelecionados.has(cliente.id))
    .map((cliente) => montarItemCobrancaCliente(cliente, configuracao))
    .filter((item): item is CobrancaLoteItem => item !== null);
}
