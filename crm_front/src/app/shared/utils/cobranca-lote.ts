import { Configuracao, Mensalidade } from '../../core/models';
import {
  CobrancaLoteItem,
  executarCobrancaEmLote,
  montarMensagemBloqueio,
  montarMensagemCobranca,
} from './whatsapp';
import {
  resolverTelefoneCliente,
  statusFinanceiro,
} from './formatters';
import { StatusFinanceiro } from '../../core/models';

export function nomeClienteMensalidade(
  mensalidade: Pick<Mensalidade, 'clienteId' | 'cliente'>,
  nomes?: Map<number, string>
): string {
  return (
    mensalidade.cliente?.nome?.trim() ||
    nomes?.get(mensalidade.clienteId) ||
    ''
  );
}

export function mensalidadeEstaAtrasada(vencimento: string): boolean {
  return statusFinanceiro(vencimento) === 'ATRASADO';
}

export function montarMensagemCobrancaMensalidade(
  mensalidade: Mensalidade,
  configuracao: Configuracao | null,
  nomes?: Map<number, string>,
  atrasado?: boolean,
  nomeOverride?: string
): string {
  const cfg = configuracao;
  const atrasadoFinal =
    atrasado ?? mensalidadeEstaAtrasada(mensalidade.vencimento);
  const nome =
    nomeOverride?.trim() ||
    nomeClienteMensalidade(mensalidade, nomes);

  return montarMensagemCobranca(
    {
      nome,
      referencia: mensalidade.referencia,
      valor: mensalidade.valor,
      vencimento: mensalidade.vencimento,
      empresa: cfg?.nomeEmpresa ?? 'JPTV',
      atrasado: atrasadoFinal,
      pix: cfg?.chavePix ?? undefined,
      tipoPix: cfg?.tipoPix ?? undefined,
      favorecido: cfg?.favorecidoPix ?? undefined,
    },
    cfg?.mensagemCobranca,
    cfg?.mensagemLembrete
  );
}

export function montarMensagemBloqueioMensalidade(
  mensalidade: Mensalidade,
  configuracao: Configuracao | null,
  nomes?: Map<number, string>,
  nomeOverride?: string
): string {
  const cfg = configuracao;
  const nome =
    nomeOverride?.trim() ||
    nomeClienteMensalidade(mensalidade, nomes);

  return montarMensagemBloqueio(
    {
      nome,
      referencia: mensalidade.referencia,
      valor: mensalidade.valor,
      vencimento: mensalidade.vencimento,
      empresa: cfg?.nomeEmpresa ?? 'JPTV',
      pix: cfg?.chavePix ?? undefined,
      tipoPix: cfg?.tipoPix ?? undefined,
      favorecido: cfg?.favorecidoPix ?? undefined,
    },
    cfg?.mensagemBloqueio
  );
}

export function montarItemCobrancaLote(
  mensalidade: Mensalidade,
  telefones: Map<number, string>,
  configuracao: Configuracao | null,
  nomes?: Map<number, string>,
  atrasado?: boolean
): CobrancaLoteItem {
  return {
    id: mensalidade.id,
    nome: nomeClienteMensalidade(mensalidade, nomes) || 'Cliente',
    telefone: resolverTelefoneCliente(mensalidade, telefones),
    mensagem: montarMensagemCobrancaMensalidade(
      mensalidade,
      configuracao,
      nomes,
      atrasado
    ),
  };
}

export function filtrarMensalidadesCobranca(
  mensalidades: Mensalidade[],
  filtro?: StatusFinanceiro | 'ATRASADO_PENDENTE'
): Mensalidade[] {
  if (!filtro || filtro === 'TODOS') {
    return mensalidades;
  }

  if (filtro === 'ATRASADO_PENDENTE') {
    return mensalidades.filter((m) => {
      const status = statusFinanceiro(m.vencimento);
      return status === 'ATRASADO' || status === 'PENDENTE';
    });
  }

  return mensalidades.filter(
    (m) => statusFinanceiro(m.vencimento) === filtro
  );
}

export function cobrarMensalidadesEmLote(
  mensalidades: Mensalidade[],
  idsSelecionados: Set<number>,
  telefones: Map<number, string>,
  configuracao: Configuracao | null,
  nomes?: Map<number, string>
) {
  const selecionadas = mensalidades.filter((m) => idsSelecionados.has(m.id));
  const itens = selecionadas.map((m) =>
    montarItemCobrancaLote(m, telefones, configuracao, nomes)
  );

  return executarCobrancaEmLote(itens);
}

export function trackByMensalidadeId(_index: number, m: Mensalidade): number {
  return m.id;
}
