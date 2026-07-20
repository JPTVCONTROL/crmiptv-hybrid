/** Dias até o vencimento (0 = vence hoje). */
export const DIAS_LEMBRETE_AUTOMACAO = [3, 1, 0] as const;

/** Dias de atraso (1 = primeiro dia vencido). */
export const DIAS_ATRASO_COBRANCA_AUTOMACAO = [1, 5, 7] as const;

export type PontoDisparoAutomacao =
  | 'LEMBRETE_D3'
  | 'LEMBRETE_D1'
  | 'LEMBRETE_D0'
  | 'COBRANCA_D1'
  | 'COBRANCA_D5'
  | 'COBRANCA_D7';

export function resolverPontoLembrete(
  diasAteVencer: number
): PontoDisparoAutomacao | null {
  if (diasAteVencer === 3) return 'LEMBRETE_D3';
  if (diasAteVencer === 1) return 'LEMBRETE_D1';
  if (diasAteVencer === 0) return 'LEMBRETE_D0';
  return null;
}

/** `diasVencimento` negativo quando atrasado (ex.: -1 = 1 dia de atraso). */
export function resolverPontoCobranca(
  diasVencimento: number
): PontoDisparoAutomacao | null {
  if (diasVencimento === -1) return 'COBRANCA_D1';
  if (diasVencimento === -5) return 'COBRANCA_D5';
  if (diasVencimento === -7) return 'COBRANCA_D7';
  return null;
}

export function rotuloPontoDisparo(ponto: string): string {
  const rotulos: Record<string, string> = {
    LEMBRETE_D3: 'Lembrete · 3 dias antes',
    LEMBRETE_D1: 'Lembrete · 1 dia antes',
    LEMBRETE_D0: 'Lembrete · vence hoje',
    COBRANCA_D1: 'Cobrança · 1º dia atrasado',
    COBRANCA_D5: 'Cobrança · 5 dias atrasado',
    COBRANCA_D7: 'Cobrança · 7 dias atrasado',
  };
  return rotulos[ponto] ?? ponto;
}
