import { Configuracao, Mensalidade } from '../../core/models';
import { calcularDias } from './formatters';
import {
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
  telefone: string;
  telefoneValido: boolean;
  mensagem: string;
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

export function rotuloDiasCobrancaDiaria(dias: number): string {
  if (dias < 0) {
    const atraso = Math.abs(dias);
    return atraso === 1 ? '1 dia atrasado' : `${atraso} dias atrasados`;
  }

  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}

export function rotuloTipoCobrancaDiaria(tipo: TipoCobrancaDiaria): string {
  return tipo === 'ATRASADO' ? 'Cobrança' : 'Lembrete';
}

export function filtrarMensalidadesCobrancaDiaria(
  mensalidades: Mensalidade[],
  diasAntecedencia = DIAS_ANTECEDENCIA_LEMBRETE_PADRAO
): Mensalidade[] {
  return mensalidades
    .filter(
      (m) =>
        m.status === 'PENDENTE' &&
        elegivelCobrancaDiaria(m.vencimento, diasAntecedencia)
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
  const diasAntecedencia = resolverDiasAntecedencia(configuracao);

  return filtrarMensalidadesCobrancaDiaria(mensalidades, diasAntecedencia).map((m) => {
    const dias = calcularDias(m.vencimento);
    const tipo = tipoCobrancaDiaria(m.vencimento);
    const telefone =
      m.cliente?.telefone?.trim() ?? telefones.get(m.clienteId) ?? '';
    const atrasado = tipo === 'ATRASADO';

    return {
      mensalidadeId: m.id,
      clienteId: m.clienteId,
      nome: nomeClienteMensalidade(m, nomes) || 'Cliente',
      referencia: m.referencia,
      valor: m.valor,
      vencimento: m.vencimento,
      dias,
      tipo,
      telefone,
      telefoneValido: telefoneValidoParaWhatsApp(telefone),
      mensagem: montarMensagemCobrancaMensalidade(
        m,
        configuracao,
        nomes,
        atrasado
      ),
    };
  });
}

export function trackByItemCobrancaDiaria(
  _index: number,
  item: ItemCobrancaDiaria
): number {
  return item.mensalidadeId;
}
