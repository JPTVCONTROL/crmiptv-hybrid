import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  META_NOVOS_CLIENTES_DIAS_PADRAO,
  META_NOVOS_CLIENTES_QTD_PADRAO,
  dataIsoParaInput,
  formatarDataCurta,
  formatarDataInput,
  metaNovosClientesPadrao,
  normalizarMetaNovosClientesFimEm,
  normalizarMetaNovosClientesInicioEm,
  normalizarMetaNovosClientesQtd,
  rotuloJanelaMetaNovosClientes,
  rotuloPrazoMetaNovosClientes,
} from './meta-novos-clientes.util.ts';

describe('metaNovosClientes', () => {
  it('usa padrões quando valor é inválido', () => {
    assert.equal(normalizarMetaNovosClientesQtd(undefined), META_NOVOS_CLIENTES_QTD_PADRAO);
    assert.equal(
      normalizarMetaNovosClientesInicioEm('abc'),
      formatarDataInput(new Date())
    );
  });

  it('limita quantidade entre 1 e 999', () => {
    assert.equal(normalizarMetaNovosClientesQtd(0), 1);
    assert.equal(normalizarMetaNovosClientesQtd(1500), 999);
  });

  it('garante fim não anterior ao início', () => {
    assert.equal(
      normalizarMetaNovosClientesFimEm('2026-07-01', '2026-07-21'),
      '2026-07-21'
    );
  });

  it('define janela padrão de 30 dias', () => {
    const referencia = new Date('2026-07-21T12:00:00');
    const padrao = metaNovosClientesPadrao(referencia);

    assert.equal(padrao.inicioEm, '2026-07-21');
    assert.equal(padrao.fimEm, '2026-08-20');
    assert.equal(META_NOVOS_CLIENTES_DIAS_PADRAO, 30);
  });

  it('rotula janela e prazo da meta', () => {
    assert.equal(
      rotuloJanelaMetaNovosClientes('2026-07-01', '2026-07-21'),
      '01/07/26 – 21/07/26'
    );
    assert.match(
      rotuloPrazoMetaNovosClientes('2026-08-21', false, 12),
      /até 21\/08\/26 · 12 dias restantes/
    );
  });

  it('não quebra com datas ausentes', () => {
    assert.doesNotThrow(() => rotuloJanelaMetaNovosClientes('', ''));
    assert.equal(formatarDataCurta(''), '—');
  });

  it('converte ISO da API para input date', () => {
    assert.equal(dataIsoParaInput('2026-07-21T15:00:00.000Z'), '2026-07-21');
  });
});
