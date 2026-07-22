import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcularEfetividadeFunilPeriodo } from './funil-cobranca.util.js';
import { Mensalidade } from '../../core/models';

describe('calcularEfetividadeFunilPeriodo', () => {
  it('agrupa contatos por etapa e conta pagamentos após contato', () => {
    const hoje = new Date();
    const contatoEm = new Date(hoje.getFullYear(), hoje.getMonth(), 5, 12, 0, 0);
    const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), 8);
    const vencimentoIso = vencimento.toISOString().slice(0, 10);

    const mensalidades: Mensalidade[] = [
      {
        id: 1,
        clienteId: 1,
        referencia: '07/2026',
        valor: 35,
        vencimento: vencimentoIso,
        status: 'PAGO',
        ultimoContatoEm: contatoEm.toISOString(),
        pagoEm: new Date(hoje.getFullYear(), hoje.getMonth(), 6).toISOString(),
      },
    ];

    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);

    const etapas = calcularEfetividadeFunilPeriodo(mensalidades, inicio, fim);

    assert.equal(etapas.length, 1);
    assert.equal(etapas[0]?.ponto, 'LEMBRETE_D3');
    assert.equal(etapas[0]?.contatos, 1);
    assert.equal(etapas[0]?.pagosAposContato, 1);
    assert.equal(etapas[0]?.taxaConversao, 100);
  });
});
