import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clienteUltrapassouLimiteCobranca,
  LIMITE_DIAS_ATRASO_COBRANCA,
} from './clienteArquivamentoHelpers.js';

describe('clienteArquivamentoHelpers', () => {
  it('expõe limite de 7 dias de cobrança', () => {
    assert.equal(LIMITE_DIAS_ATRASO_COBRANCA, 7);
  });

  it('mantém cliente com até 7 dias de atraso no funil', () => {
    const referencia = new Date(2026, 6, 22, 12, 0, 0);
    const expiraEm = new Date(2026, 6, 15, 12, 0, 0);

    assert.equal(
      clienteUltrapassouLimiteCobranca(expiraEm, referencia),
      false
    );
  });

  it('arquiva cliente com mais de 7 dias de atraso', () => {
    const referencia = new Date(2026, 6, 22, 12, 0, 0);
    const expiraEm = new Date(2026, 6, 14, 12, 0, 0);

    assert.equal(clienteUltrapassouLimiteCobranca(expiraEm, referencia), true);
  });

  it('ignora expiração ausente', () => {
    assert.equal(clienteUltrapassouLimiteCobranca(null), false);
  });
});
