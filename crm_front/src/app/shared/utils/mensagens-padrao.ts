export const MENSAGEM_COBRANCA_PADRAO = `Olá {nome}! Sua mensalidade referente a {referencia}, no valor de {valor}, venceu em {vencimento}. Por favor, regularize seu pagamento.

PIX ({tipoPix}): {pix}
Favorecido: {favorecido}

— {empresa}`;

export const MENSAGEM_COBRANCA_LEMBRETE_PADRAO = `Olá {nome}! Passando para lembrar da mensalidade {referencia}, no valor de {valor}, com vencimento em {vencimento}.

— {empresa}`;

export const MENSAGEM_RENOVACAO_PADRAO = `Olá {nome}! Recebemos seu pagamento de {valor} referente a {referencia}. Seu plano foi renovado e agora vence em {vencimento}. Obrigado pela preferência!

— {empresa}`;

export const MENSAGEM_RECIBO_PADRAO = `Olá {nome}! Confirmamos o recebimento de {valor} referente a {referencia}, pago em {pagoEm}.

— {empresa}`;

export const MENSAGEM_BLOQUEIO_PADRAO = `Olá {nome}! Seu acesso foi suspenso por pendência referente a {referencia}, no valor de {valor}, vencida em {vencimento}. Regularize para reativar.

PIX ({tipoPix}): {pix}
Favorecido: {favorecido}

— {empresa}`;

export type CampoMensagemConfig =
  | 'mensagemCobranca'
  | 'mensagemLembrete'
  | 'mensagemRenovacao'
  | 'mensagemRecibo'
  | 'mensagemBloqueio';

export const MENSAGENS_PADRAO: Record<CampoMensagemConfig, string> = {
  mensagemCobranca: MENSAGEM_COBRANCA_PADRAO,
  mensagemLembrete: MENSAGEM_COBRANCA_LEMBRETE_PADRAO,
  mensagemRenovacao: MENSAGEM_RENOVACAO_PADRAO,
  mensagemRecibo: MENSAGEM_RECIBO_PADRAO,
  mensagemBloqueio: MENSAGEM_BLOQUEIO_PADRAO,
};

export function resolverTextoMensagem(
  valor: string | null | undefined,
  padrao: string
): string {
  return valor?.trim() ? valor.trim() : padrao;
}
