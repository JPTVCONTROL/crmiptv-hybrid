import { parseDataSomenteDia } from './dateHelpers.js';

/** Último dia de cobrança no funil (COBRANCA_D7). Após isso, o cliente é arquivado. */
export const LIMITE_DIAS_ATRASO_COBRANCA = 7;

function calcularDiasAteExpiracao(
  expiraEm: Date | string,
  referencia = new Date()
): number {
  const refUtc = Date.UTC(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate()
  );
  const data = parseDataSomenteDia(expiraEm);
  const expUtc = Date.UTC(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate()
  );
  return Math.ceil((expUtc - refUtc) / (1000 * 60 * 60 * 24));
}

/** Cliente com mais de 7 dias de atraso (8º dia em diante) — fora do funil de cobrança. */
export function clienteUltrapassouLimiteCobranca(
  expiraEm: Date | string | null | undefined,
  referencia = new Date()
): boolean {
  if (!expiraEm) {
    return false;
  }
  return calcularDiasAteExpiracao(expiraEm, referencia) < -LIMITE_DIAS_ATRASO_COBRANCA;
}
