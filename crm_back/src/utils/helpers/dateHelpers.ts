export function formatReferencia(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${year}`;
}

export function parseDataSomenteDia(valor: string | Date): Date {
  if (valor instanceof Date) {
    return new Date(
      Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate(), 12, 0, 0)
    );
  }

  const trimmed = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [ano, mes, dia] = trimmed.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  }

  const parsed = new Date(valor);
  return new Date(
    Date.UTC(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      12,
      0,
      0
    )
  );
}

export function parseExpiraEm(valor: string | Date): Date {
  return parseDataSomenteDia(valor);
}

/** @deprecated Preferir parseDataSomenteDia + addMonthsUtc para novos fluxos */
export function normalizeToEndOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 0, 0);
  return normalized;
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

export function addMonthsUtc(date: Date, meses: number): Date {
  const base = parseDataSomenteDia(date);
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + meses,
      base.getUTCDate(),
      12,
      0,
      0
    )
  );
}

export function calcularExpiracao(base: Date, plano: PlanoValidade): Date {
  return addMonthsUtc(base, mesesValidadePorPlano(plano));
}

export function calcularNovoVencimento(
  vencimentoAtual: Date,
  dataPagamento: Date,
  plano?: PlanoValidade | null
): Date {
  const pagamento = parseDataSomenteDia(dataPagamento);
  const vencimento = parseDataSomenteDia(vencimentoAtual);
  const meses = plano ? mesesValidadePorPlano(plano) : 1;
  const base =
    pagamento.getTime() <= vencimento.getTime()
      ? vencimentoAtual
      : dataPagamento;

  return addMonthsUtc(base, meses);
}
