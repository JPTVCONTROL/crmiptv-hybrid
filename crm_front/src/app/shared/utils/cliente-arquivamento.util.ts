import { calcularDias } from './formatters';

/** Último dia de cobrança no funil (COBRANCA_D7). Após isso, o cliente é arquivado. */
export const LIMITE_DIAS_ATRASO_COBRANCA = 7;

/** Cliente com mais de 7 dias de atraso (8º dia em diante) — fora do funil de cobrança. */
export function clienteUltrapassouLimiteCobranca(
  expiraEm?: string | null
): boolean {
  if (!expiraEm?.trim()) {
    return false;
  }
  return calcularDias(expiraEm) < -LIMITE_DIAS_ATRASO_COBRANCA;
}
