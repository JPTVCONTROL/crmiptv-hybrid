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

export interface PlanoValidade {
  nome: string;
  diasValidade: number;
}

/** Mensal = 1 mês, Trimestral = 3 meses, Anual = 12 meses (mesmo dia do mês). */
export function mesesValidadePorPlano(plano: PlanoValidade): number {
  const nome = plano.nome.toLowerCase();
  if (nome.includes('anual')) return 12;
  if (nome.includes('trimestral')) return 3;
  if (nome.includes('mensal')) return 1;

  if (plano.diasValidade >= 360) return 12;
  if (plano.diasValidade >= 80) return 3;
  if (plano.diasValidade >= 25) return 1;

  return Math.max(1, Math.round(plano.diasValidade / 30));
}

export function addMonths(date: Date, meses: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setMonth(result.getMonth() + meses);
  return result;
}

export function calcularExpiracao(base: Date, plano: PlanoValidade): Date {
  return normalizeToEndOfDay(addMonths(stripTime(base), mesesValidadePorPlano(plano)));
}

export function calcularNovoVencimento(
  vencimentoAtual: Date,
  dataPagamento: Date,
  plano?: PlanoValidade | null
): Date {
  if (plano) {
    const pagamento = stripTime(dataPagamento);
    const vencimento = stripTime(vencimentoAtual);
    const base = pagamento <= vencimento ? vencimentoAtual : dataPagamento;
    return calcularExpiracao(base, plano);
  }

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
