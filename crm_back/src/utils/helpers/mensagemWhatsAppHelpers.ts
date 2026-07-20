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

export function resolverValorMensalidade(mensalidade: {
  valor: number;
  cliente: { valorMensal: number };
}): number {
  if (mensalidade.valor > 0) {
    return mensalidade.valor;
  }

  if (mensalidade.cliente.valorMensal > 0) {
    return mensalidade.cliente.valorMensal;
  }

  return mensalidade.valor;
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
    '{linhaPix}': montarLinhaPix(dados),
  };

  return Object.entries(mapa).reduce(
    (texto, [chave, valor]) => texto.split(chave).join(valor),
    template
  );
}

function garantirPixNaMensagem(
  mensagem: string,
  dados: DadosMensagemCobranca
): string {
  const pix = dados.pix?.trim();
  if (!pix || mensagem.includes(pix)) {
    return mensagem;
  }

  const bloco = montarLinhaPix(dados);
  const assinatura = `— ${dados.empresa}`;
  const indiceAssinatura = mensagem.lastIndexOf(assinatura);

  if (indiceAssinatura >= 0) {
    return (
      mensagem.slice(0, indiceAssinatura).trimEnd() +
      bloco +
      '\n\n' +
      mensagem.slice(indiceAssinatura)
    );
  }

  return `${mensagem.trimEnd()}${bloco}`;
}

export function montarMensagemCobrancaAutomacao(
  dados: DadosMensagemCobranca,
  configuracao: Configuracao | null
): string {
  if (dados.atrasado) {
    const template = resolverTextoMensagem(
      configuracao?.mensagemCobranca,
      MENSAGEM_COBRANCA_PADRAO
    );
    return garantirPixNaMensagem(substituirVariaveis(template, dados), dados);
  }

  const template = resolverTextoMensagem(
    configuracao?.mensagemLembrete,
    MENSAGEM_COBRANCA_LEMBRETE_PADRAO
  );

  return garantirPixNaMensagem(substituirVariaveis(template, dados), dados);
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
