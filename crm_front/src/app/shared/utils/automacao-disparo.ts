export const DIAS_LEMBRETE_AUTOMACAO = [5, 3, 1, 0] as const;

export const DIAS_ATRASO_COBRANCA_AUTOMACAO = [1, 2, 3, 7] as const;

export const DIAS_ROTINA_PROGRESSIVA = [
  ...DIAS_LEMBRETE_AUTOMACAO,
  ...DIAS_ATRASO_COBRANCA_AUTOMACAO.map((d) => -d),
] as const;

export type PontoDisparoAutomacao =
  | 'LEMBRETE_D5'
  | 'LEMBRETE_D3'
  | 'LEMBRETE_D1'
  | 'LEMBRETE_D0'
  | 'COBRANCA_D1'
  | 'COBRANCA_D2'
  | 'COBRANCA_D3'
  | 'COBRANCA_D7';

const MAPA_PONTO_POR_DIAS: Record<number, PontoDisparoAutomacao> = {
  5: 'LEMBRETE_D5',
  3: 'LEMBRETE_D3',
  1: 'LEMBRETE_D1',
  0: 'LEMBRETE_D0',
  [-1]: 'COBRANCA_D1',
  [-2]: 'COBRANCA_D2',
  [-3]: 'COBRANCA_D3',
  [-7]: 'COBRANCA_D7',
};

export function elegivelRotinaProgressiva(diasAteVencer: number): boolean {
  return Object.prototype.hasOwnProperty.call(MAPA_PONTO_POR_DIAS, diasAteVencer);
}

export function resolverPontoDisparo(
  diasAteVencer: number
): PontoDisparoAutomacao | null {
  return MAPA_PONTO_POR_DIAS[diasAteVencer] ?? null;
}

export const CRONOGRAMA_LEMBRETES_AUTOMACAO = [
  { dias: 5, rotulo: '5 dias antes — lembrete amigável + PIX' },
  { dias: 3, rotulo: '3 dias antes — lembrete amigável + PIX' },
  { dias: 1, rotulo: '1 dia antes — lembrete direto + PIX' },
  { dias: 0, rotulo: 'No dia — vence hoje' },
] as const;

export const CRONOGRAMA_COBRANCAS_AUTOMACAO = [
  { dias: 1, rotulo: '1º dia atrasado — cobrança + aviso de suspensão' },
  { dias: 2, rotulo: '2 dias atrasado — cobrança reforçada' },
  { dias: 3, rotulo: '3 dias atrasado — cobrança reforçada' },
  { dias: 7, rotulo: '7 dias atrasado — tentativa de recuperação' },
] as const;

export function rotuloPontoDisparo(ponto?: string | null): string {
  if (!ponto) return '—';

  const rotulos: Record<string, string> = {
    LEMBRETE_D5: 'Lembrete · 5 dias antes',
    LEMBRETE_D3: 'Lembrete · 3 dias antes',
    LEMBRETE_D1: 'Lembrete · vence amanhã',
    LEMBRETE_D0: 'Lembrete · vence hoje',
    COBRANCA_D1: 'Cobrança · 1º dia atrasado',
    COBRANCA_D2: 'Cobrança · 2 dias atrasado',
    COBRANCA_D3: 'Cobrança · 3 dias atrasado',
    COBRANCA_D7: 'Recuperação · 7 dias atrasado',
    COBRANCA_D5: 'Cobrança · 5 dias atrasado',
  };

  return rotulos[ponto] ?? ponto;
}
