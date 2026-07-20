export const MENSAGEM_COBRANCA_PADRAO = `Olá {nome}! Sua mensalidade referente a {referencia}, no valor de {valor}, venceu em {vencimento}. Por favor, regularize seu pagamento.

PIX ({tipoPix}): {pix}
Favorecido: {favorecido}

— {empresa}`;

export const MENSAGEM_COBRANCA_LEMBRETE_PADRAO = `Olá {nome}! Passando para lembrar da mensalidade {referencia}, no valor de {valor}, com vencimento em {vencimento}.

— {empresa}`;

export function resolverTextoMensagem(
  valor: string | null | undefined,
  padrao: string
): string {
  return valor?.trim() ? valor.trim() : padrao;
}
