export const CRONOGRAMA_LEMBRETES_AUTOMACAO = [
  { dias: 3, rotulo: '3 dias antes do vencimento' },
  { dias: 1, rotulo: '1 dia antes do vencimento' },
  { dias: 0, rotulo: 'No dia do vencimento' },
] as const;

export const CRONOGRAMA_COBRANCAS_AUTOMACAO = [
  { dias: 1, rotulo: '1º dia de atraso' },
  { dias: 5, rotulo: '5 dias de atraso' },
  { dias: 7, rotulo: '7 dias de atraso' },
] as const;

export function rotuloPontoDisparo(ponto?: string | null): string {
  if (!ponto) return '—';

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
