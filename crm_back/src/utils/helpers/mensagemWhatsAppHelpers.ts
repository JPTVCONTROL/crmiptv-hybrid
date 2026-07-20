import type { Configuracao } from '@prisma/client';
import { parseDataSomenteDia } from './dateHelpers.js';
import {
  MENSAGEM_COBRANCA_LEMBRETE_PADRAO,
  MENSAGEM_COBRANCA_PADRAO,
  resolverTextoMensagem,
} from './mensagensPadrao.js';

export interface DadosMensagemCobranca {
  nome: string;
  referencia: string;
  valor: number;
  vencimento: Date | string;
  empresa: string;
  atrasado: boolean;
  pix?: string | null;
  tipoPix?: string | null;
  favorecido?: string | null;
}

function formatarValor(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data: Date | string): string {
  const parsed = parseDataSomenteDia(data);
  const dia = String(parsed.getUTCDate()).padStart(2, '0');
  const mes = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const ano = parsed.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

function montarLinhaPix(dados: DadosMensagemCobranca): string {
  if (!dados.pix?.trim()) return '';
  const tipo = dados.tipoPix?.trim() ? ` (${dados.tipoPix})` : '';
  const favorecido = dados.favorecido?.trim()
    ? `\nFavorecido: ${dados.favorecido}`
    : '';
  return `\n\nPIX${tipo}: ${dados.pix}${favorecido}`;
}

function substituirVariaveis(template: string, dados: DadosMensagemCobranca): string {
  const mapa: Record<string, string> = {
    '{nome}': dados.nome,
    '{referencia}': dados.referencia,
    '{valor}': formatarValor(dados.valor),
    '{vencimento}': formatarData(dados.vencimento),
    '{empresa}': dados.empresa,
    '{pix}': dados.pix?.trim() ?? '',
    '{tipoPix}': dados.tipoPix?.trim() ?? '',
    '{favorecido}': dados.favorecido?.trim() ?? '',
  };

  return Object.entries(mapa).reduce(
    (texto, [chave, valor]) => texto.split(chave).join(valor),
    template
  );
}

export function montarMensagemCobrancaAutomacao(
  dados: DadosMensagemCobranca,
  configuracao: Configuracao | null
): string {
  const linhaPix = montarLinhaPix(dados);

  if (dados.atrasado) {
    const template = resolverTextoMensagem(
      configuracao?.mensagemCobranca,
      MENSAGEM_COBRANCA_PADRAO
    );
    return substituirVariaveis(template, dados);
  }

  const templateLembrete = resolverTextoMensagem(
    configuracao?.mensagemLembrete,
    MENSAGEM_COBRANCA_LEMBRETE_PADRAO.replace(
      '\n\n— {empresa}',
      `${linhaPix}\n\n— {empresa}`
    )
  );

  return substituirVariaveis(templateLembrete, dados);
}

/** Parâmetros na ordem esperada pelos templates Utility aprovados na Meta. */
export function parametrosTemplateWhatsApp(
  dados: DadosMensagemCobranca
): string[] {
  const pix = dados.pix?.trim()
    ? `PIX${dados.tipoPix?.trim() ? ` (${dados.tipoPix})` : ''}: ${dados.pix}${
        dados.favorecido?.trim() ? ` — ${dados.favorecido}` : ''
      }`
    : 'Entre em contato para pagamento.';

  return [
    dados.nome,
    dados.referencia,
    formatarValor(dados.valor),
    formatarData(dados.vencimento),
    pix,
  ];
}
