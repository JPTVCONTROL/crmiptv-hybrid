import type { Configuracao } from '@prisma/client';
import { parseDataSomenteDia } from './dateHelpers.js';
import {
  calcularDiasVencimento,
  elegivelRotinaProgressiva,
  rotuloPrazoVencimento,
} from './cobrancaDiariaHelpers.js';
import {
  mesclarMensagensProgressivas,
  parsearMensagensProgressivas,
  resolverTemplateProgressivo,
  type MensagensProgressivasMap,
} from './mensagensProgressivas.js';
import type { PontoDisparoAutomacao } from './automacaoDisparoHelpers.js';
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
  const diasAteVencer = calcularDiasVencimento(dados.vencimento);
  const mapa: Record<string, string> = {
    '{nome}': dados.nome,
    '{referencia}': dados.referencia,
    '{valor}': formatarValor(dados.valor),
    '{vencimento}': formatarData(dados.vencimento),
    '{prazo}': rotuloPrazoVencimento(diasAteVencer),
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
  configuracao: Configuracao | null,
  pontoDisparo?: PontoDisparoAutomacao | null
): string {
  const overrides = parsearMensagensProgressivas(
    configuracao?.mensagensProgressivas
  );
  const fallbackCobranca = resolverTextoMensagem(
    configuracao?.mensagemCobranca,
    MENSAGEM_COBRANCA_PADRAO
  );
  const fallbackLembrete = resolverTextoMensagem(
    configuracao?.mensagemLembrete,
    MENSAGEM_COBRANCA_LEMBRETE_PADRAO
  );

  const template = resolverTemplateProgressivo(
    pontoDisparo,
    overrides,
    fallbackLembrete,
    fallbackCobranca
  );

  return garantirPixNaMensagem(substituirVariaveis(template, dados), dados);
}

export function resolverOverridesMensagensProgressivas(
  configuracao?: Configuracao | null
): MensagensProgressivasMap {
  return parsearMensagensProgressivas(configuracao?.mensagensProgressivas);
}

export function mensagensProgressivasCompletas(
  configuracao?: Configuracao | null
): Record<PontoDisparoAutomacao, string> {
  return mesclarMensagensProgressivas(
    parsearMensagensProgressivas(configuracao?.mensagensProgressivas)
  );
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

  const diasAteVencer = calcularDiasVencimento(dados.vencimento);
  const quartoParametro = dados.atrasado
    ? formatarData(dados.vencimento)
    : rotuloPrazoVencimento(diasAteVencer);

  return [
    dados.nome,
    dados.referencia,
    formatarValor(dados.valor),
    quartoParametro,
    pix,
  ];
}
