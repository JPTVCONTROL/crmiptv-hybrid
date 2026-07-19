import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clienteParticipaCobrancas,
  elegivelCobrancaDiaria,
  resolverDiasAntecedencia,
  rotuloDiasCobrancaDiaria,
  tipoCobrancaDiaria,
} from './cobranca-diaria.ts';

describe('resolverDiasAntecedencia', () => {
  it('usa valor da configuração quando válido', () => {
    assert.equal(
      resolverDiasAntecedencia({ diasAntecedenciaLembrete: 7 } as never),
      7
    );
  });

  it('usa padrão 5 quando ausente', () => {
    assert.equal(resolverDiasAntecedencia(null), 5);
  });
});

describe('tipoCobrancaDiaria', () => {
  it('identifica atrasado e a vencer', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);

    assert.equal(tipoCobrancaDiaria(ontem.toISOString()), 'ATRASADO');
    assert.equal(tipoCobrancaDiaria(amanha.toISOString()), 'A_VENCER');
  });
});

describe('elegivelCobrancaDiaria', () => {
  it('inclui atrasados e vencimentos dentro da antecedência', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 2);
    const daqui5 = new Date();
    daqui5.setDate(daqui5.getDate() + 5);
    const daqui20 = new Date();
    daqui20.setDate(daqui20.getDate() + 20);

    assert.equal(elegivelCobrancaDiaria(ontem.toISOString(), 5), true);
    assert.equal(elegivelCobrancaDiaria(daqui5.toISOString(), 5), true);
    assert.equal(elegivelCobrancaDiaria(daqui20.toISOString(), 5), false);
  });
});

describe('rotuloDiasCobrancaDiaria', () => {
  it('rotula vencimento e atraso', () => {
    assert.equal(rotuloDiasCobrancaDiaria(0), 'Vence hoje');
    assert.equal(rotuloDiasCobrancaDiaria(-2), '2 dias atrasados');
  });
});

describe('clienteParticipaCobrancas', () => {
  it('respeita incluirCobrancas false', () => {
    assert.equal(clienteParticipaCobrancas({ incluirCobrancas: false }), false);
    assert.equal(clienteParticipaCobrancas({ incluirCobrancas: true }), true);
    assert.equal(clienteParticipaCobrancas({}), true);
  });
});
