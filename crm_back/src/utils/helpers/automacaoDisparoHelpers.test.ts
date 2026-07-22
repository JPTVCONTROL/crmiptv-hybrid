import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DIAS_ROTINA_PROGRESSIVA,
  elegivelRotinaProgressiva,
  resolverPontoCobranca,
  resolverPontoDisparo,
  resolverPontoLembrete,
} from './automacaoDisparoHelpers.js';

describe('elegivelRotinaProgressiva', () => {
  it('aceita apenas dias do funil fixo', () => {
    for (const dias of DIAS_ROTINA_PROGRESSIVA) {
      assert.equal(elegivelRotinaProgressiva(dias), true);
    }
    assert.equal(elegivelRotinaProgressiva(2), false);
    assert.equal(elegivelRotinaProgressiva(4), false);
    assert.equal(elegivelRotinaProgressiva(-5), false);
  });
});

describe('resolverPontoDisparo', () => {
  it('mapeia lembretes e cobranças progressivas', () => {
    assert.equal(resolverPontoDisparo(5), 'LEMBRETE_D5');
    assert.equal(resolverPontoDisparo(3), 'LEMBRETE_D3');
    assert.equal(resolverPontoDisparo(1), 'LEMBRETE_D1');
    assert.equal(resolverPontoDisparo(0), 'LEMBRETE_D0');
    assert.equal(resolverPontoDisparo(-1), 'COBRANCA_D1');
    assert.equal(resolverPontoDisparo(-2), 'COBRANCA_D2');
    assert.equal(resolverPontoDisparo(-3), 'COBRANCA_D3');
    assert.equal(resolverPontoDisparo(-7), 'COBRANCA_D7');
    assert.equal(resolverPontoDisparo(2), null);
  });

  it('separa lembrete e cobrança', () => {
    assert.equal(resolverPontoLembrete(5), 'LEMBRETE_D5');
    assert.equal(resolverPontoLembrete(-1), null);
    assert.equal(resolverPontoCobranca(-3), 'COBRANCA_D3');
    assert.equal(resolverPontoCobranca(0), null);
  });
});
