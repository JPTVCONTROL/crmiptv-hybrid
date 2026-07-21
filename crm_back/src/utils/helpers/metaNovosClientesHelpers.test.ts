import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  META_NOVOS_CLIENTES_QTD_PADRAO,
  normalizarMetaNovosClientesFimEm,
  normalizarMetaNovosClientesInicioEm,
  normalizarMetaNovosClientesQtd,
  resolverMetaNovosClientes,
  whereClienteContaMeta,
} from './metaNovosClientesHelpers.js';

describe('metaNovosClientesHelpers', () => {
  it('whereClienteContaMeta exclui cortesia e somente contato', () => {
    assert.deepEqual(whereClienteContaMeta, {
      cortesia: false,
      somenteContato: false,
    });
  });

  it('normaliza quantidade da meta', () => {
    assert.equal(normalizarMetaNovosClientesQtd(undefined), META_NOVOS_CLIENTES_QTD_PADRAO);
    assert.equal(normalizarMetaNovosClientesQtd(0), 1);
    assert.equal(normalizarMetaNovosClientesQtd(1200), 999);
  });

  it('garante fim da meta não anterior ao início', () => {
    const inicio = normalizarMetaNovosClientesInicioEm('2026-07-21');
    assert.equal(normalizarMetaNovosClientesFimEm('2026-07-01', inicio), inicio);
  });

  it('resolve meta com datas explícitas', () => {
    const meta = resolverMetaNovosClientes(
      {
        metaNovosClientesQtd: 50,
        metaNovosClientesInicioEm: '2026-07-21',
        metaNovosClientesFimEm: '2026-12-31',
      },
      new Date('2026-07-21T12:00:00.000Z')
    );

    assert.equal(meta.qtd, 50);
    assert.equal(meta.inicioEm, '2026-07-21');
    assert.equal(meta.fimEm, '2026-12-31');
    assert.equal(meta.encerrada, false);
    assert.ok(meta.diasRestantes > 0);
  });
});
