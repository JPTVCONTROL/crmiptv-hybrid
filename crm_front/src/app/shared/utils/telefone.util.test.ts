import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatarTelefoneExibicao,
  formatarTelefoneWhatsApp,
  telefoneValidoParaWhatsApp,
} from './telefone.util';

describe('telefoneValidoParaWhatsApp', () => {
  it('aceita celular BR com mascara', () => {
    assert.equal(telefoneValidoParaWhatsApp('(62) 99999-1234'), true);
  });

  it('aceita internacional com +351', () => {
    assert.equal(telefoneValidoParaWhatsApp('+351 912 345 678'), true);
  });

  it('aceita internacional com DDI sem +', () => {
    assert.equal(telefoneValidoParaWhatsApp('351912345678'), true);
  });

  it('rejeita numero curto sem DDI', () => {
    assert.equal(telefoneValidoParaWhatsApp('912345678'), false);
  });
});

describe('formatarTelefoneWhatsApp', () => {
  it('prefixa 55 em numero BR local', () => {
    assert.equal(formatarTelefoneWhatsApp('62999991234'), '5562999991234');
  });

  it('mantem DDI internacional', () => {
    assert.equal(formatarTelefoneWhatsApp('+351912345678'), '351912345678');
  });
});

describe('formatarTelefoneExibicao', () => {
  it('formata celular BR', () => {
    assert.equal(formatarTelefoneExibicao('62999991234'), '(62) 99999-1234');
  });

  it('formata BR com DDI 55', () => {
    assert.equal(
      formatarTelefoneExibicao('5562999991234'),
      '+55 (62) 99999-1234'
    );
  });

  it('formata Portugal com +', () => {
    assert.equal(
      formatarTelefoneExibicao('+351912345678'),
      '+351 912 345 678'
    );
  });

  it('formata internacional sem + na entrada', () => {
    assert.equal(formatarTelefoneExibicao('351912345678'), '+351 912 345 678');
  });
});
