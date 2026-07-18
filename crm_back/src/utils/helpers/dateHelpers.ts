export function formatReferencia(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
}

export function normalizeToEndOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 0, 0);
  return normalized;
}

export function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addOneMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  return result;
}

export function calcularNovoVencimento(
  vencimentoAtual: Date,
  dataPagamento: Date
): Date {
  const pagamento = stripTime(dataPagamento);
  const vencimento = stripTime(vencimentoAtual);

  let novoVencimento: Date;

  if (pagamento <= vencimento) {
    novoVencimento = addOneMonth(vencimentoAtual);
  } else {
    novoVencimento = addOneMonth(dataPagamento);
  }

  return normalizeToEndOfDay(novoVencimento);
}
