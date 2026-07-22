import { Configuracao, Mensalidade } from '../../core/models';
import { calcularDias, resolverValorMensalidade, rotuloPrazoVencimento } from './formatters';
import { resolverPontoDisparo, elegivelRotinaProgressiva, rotuloPontoDisparo } from './automacao-disparo';
import {
  montarMensagemBloqueioMensalidade,
  montarMensagemCobrancaMensalidade,
  nomeClienteMensalidade,
} from './cobranca-lote';
import { telefoneValidoParaWhatsApp } from './whatsapp';

/** Valor padrão quando não há configuração salva. */
export const DIAS_ANTECEDENCIA_LEMBRETE_PADRAO = 5;

export function resolverDiasAntecedencia(
  configuracao?: Configuracao | null
): number {
  const valor = configuracao?.diasAntecedenciaLembrete;
  if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 1 && valor <= 30) {
    return Math.trunc(valor);
  }
  return DIAS_ANTECEDENCIA_LEMBRETE_PADRAO;
}

export type TipoCobrancaDiaria = 'ATRASADO' | 'A_VENCER';

export interface ItemCobrancaDiaria {
  mensalidadeId: number;
  clienteId: number;
  nome: string;
  referencia: string;
  valor: number;
  vencimento: string;
  dias: number;
  tipo: TipoCobrancaDiaria;
  pontoDisparo?: string | null;
  telefone: string;
  telefoneValido: boolean;
  ultimoContatoEm?: string | null;
  bloqueioEnviadoEm?: string | null;
  mensagem: string;
  mensagemBloqueio?: string;
}

export function tipoCobrancaDiaria(vencimento: string): TipoCobrancaDiaria {
  return calcularDias(vencimento) < 0 ? 'ATRASADO' : 'A_VENCER';
}

export function elegivelCobrancaDiaria(
  vencimento: string,
  diasAntecedencia = DIAS_ANTECEDENCIA_LEMBRETE_PADRAO
): boolean {
  const dias = calcularDias(vencimento);
  return dias < 0 || (dias >= 0 && dias <= diasAntecedencia);
}

/** Rotina diária: apenas dias fixos do funil progressivo (5, 3, 1, 0, -1, -2, -3, -7). */
export function elegivelRotinaCobrancaDiaria(vencimento: string): boolean {
  return elegivelRotinaProgressiva(calcularDias(vencimento));
}

export function clienteEhCortesia(
  cliente?: { cortesia?: boolean | null } | null
): boolean {
  return cliente?.cortesia === true;
}

export function clienteEhSomenteContato(
  cliente?: { somenteContato?: boolean | null } | null
): boolean {
  return cliente?.somenteContato === true;
}

export function clienteParticipaCobrancas(
  cliente?: {
    ativo?: boolean | null;
    incluirCobrancas?: boolean | null;
    cortesia?: boolean | null;
    somenteContato?: boolean | null;
  } | null
): boolean {
  if (cliente?.ativo === false) {
    return false;
  }
  if (cliente?.somenteContato === true) {
    return false;
  }
  if (clienteEhCortesia(cliente)) {
    return false;
  }
  return cliente?.incluirCobrancas !== false;
}

/** Vencimentos: exibe cortesia e quem participa de cobranças; exclui somente contato e inativos. */
export function clienteApareceEmVencimentos(
  cliente?: {
    ativo?: boolean | null;
    incluirCobrancas?: boolean | null;
    somenteContato?: boolean | null;
  } | null
): boolean {
  if (cliente?.ativo === false) {
    return false;
  }
  if (clienteEhSomenteContato(cliente)) {
    return false;
  }
  return cliente?.incluirCobrancas !== false;
}

export function rotuloDiasCobrancaDiaria(dias: number): string {
  return rotuloPrazoVencimento(dias);
}

export function rotuloTipoCobrancaDiaria(tipo: TipoCobrancaDiaria): string {
  return tipo === 'ATRASADO' ? 'Cobrança' : 'Lembrete';
}

export function filtrarMensalidadesCobrancaDiaria(
  mensalidades: Mensalidade[]
): Mensalidade[] {
  return mensalidades
    .filter(
      (m) =>
        m.status === 'PENDENTE' &&
        elegivelRotinaCobrancaDiaria(m.vencimento) &&
        clienteParticipaCobrancas(m.cliente)
    )
    .sort(
      (a, b) =>
        new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
    );
}

export function montarItensCobrancaDiaria(
  mensalidades: Mensalidade[],
  telefones: Map<number, string>,
  configuracao: Configuracao | null,
  nomes?: Map<number, string>
): ItemCobrancaDiaria[] {
  return filtrarMensalidadesCobrancaDiaria(mensalidades).map((m) => {
    const dias = calcularDias(m.vencimento);
    const tipo = tipoCobrancaDiaria(m.vencimento);
    const pontoDisparo = resolverPontoDisparo(dias);
    const telefone =
      m.cliente?.telefone?.trim() ?? telefones.get(m.clienteId) ?? '';
    const atrasado = tipo === 'ATRASADO';

    return {
      mensalidadeId: m.id,
      clienteId: m.clienteId,
      nome: nomeClienteMensalidade(m, nomes) || 'Cliente',
      referencia: m.referencia,
      valor: resolverValorMensalidade(m),
      vencimento: m.vencimento,
      dias,
      tipo,
      pontoDisparo,
      telefone,
      telefoneValido: telefoneValidoParaWhatsApp(telefone),
      ultimoContatoEm: m.ultimoContatoEm ?? null,
      bloqueioEnviadoEm: m.bloqueioEnviadoEm ?? null,
      mensagem: montarMensagemCobrancaMensalidade(
        m,
        configuracao,
        nomes,
        atrasado,
        undefined,
        pontoDisparo
      ),
      mensagemBloqueio: atrasado
        ? montarMensagemBloqueioMensalidade(m, configuracao, nomes)
        : undefined,
    };
  });
}

export function trackByItemCobrancaDiaria(
  _index: number,
  item: ItemCobrancaDiaria
): number {
  return item.mensalidadeId;
}

export { rotuloPontoDisparo };
