/** Dias até o vencimento (0 = vence hoje). */
export const DIAS_LEMBRETE_AUTOMACAO = [5, 3, 1, 0] as const;

/** Dias de atraso absoluto (1 = 1º dia vencido). */
export const DIAS_ATRASO_COBRANCA_AUTOMACAO = [1, 2, 3, 7] as const;

/** Todos os dias em que a rotina diária / automação dispara contato. */
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

export type TipoRotinaProgressiva = 'LEMBRETE' | 'COBRANCA';

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

export function resolverPontoLembrete(
  diasAteVencer: number
): PontoDisparoAutomacao | null {
  const ponto = resolverPontoDisparo(diasAteVencer);
  return ponto?.startsWith('LEMBRETE_') ? ponto : null;
}

/** `diasVencimento` negativo quando atrasado (ex.: -1 = 1 dia de atraso). */
export function resolverPontoCobranca(
  diasVencimento: number
): PontoDisparoAutomacao | null {
  const ponto = resolverPontoDisparo(diasVencimento);
  return ponto?.startsWith('COBRANCA_') ? ponto : null;
}

export function tipoRotinaProgressiva(
  ponto: PontoDisparoAutomacao
): TipoRotinaProgressiva {
  return ponto.startsWith('COBRANCA_') ? 'COBRANCA' : 'LEMBRETE';
}

export function rotuloPontoDisparo(ponto: string): string {
  const rotulos: Record<string, string> = {
    LEMBRETE_D5: 'Lembrete · 5 dias antes',
    LEMBRETE_D3: 'Lembrete · 3 dias antes',
    LEMBRETE_D1: 'Lembrete · vence amanhã',
    LEMBRETE_D0: 'Lembrete · vence hoje',
    COBRANCA_D1: 'Cobrança · 1º dia atrasado',
    COBRANCA_D2: 'Cobrança · 2 dias atrasado',
    COBRANCA_D3: 'Cobrança · 3 dias atrasado',
    COBRANCA_D7: 'Recuperação · 7 dias atrasado',
    /** Legado */
    COBRANCA_D5: 'Cobrança · 5 dias atrasado',
  };
  return rotulos[ponto] ?? ponto;
}
