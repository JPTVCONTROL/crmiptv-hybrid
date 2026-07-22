import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aplicarMascaraTelefone,
  calcularDias,
  clienteEntraNoGrupoStatus,
  clienteEstaAtivo,
  dataIsoParaDateUtc,
  formatarData,
  resolverStatusCliente,
  statusCliente,
  statusFinanceiro,
  rotuloStatusFinanceiro,
  rotuloPrazoVencimento,
} from './formatters.ts';

describe('aplicarMascaraTelefone', () => {
  it('formata celular com 11 dígitos', () => {
    assert.equal(aplicarMascaraTelefone('11999887766'), '(11) 99988-7766');
  });

  it('limita a 11 dígitos', () => {
    assert.equal(aplicarMascaraTelefone('119998877661234'), '(11) 99988-7766');
  });
});

describe('dataIsoParaDateUtc', () => {
  it('interpreta YYYY-MM-DD em UTC meio-dia', () => {
    const data = dataIsoParaDateUtc('2026-07-18');
    assert.equal(data.toISOString(), '2026-07-18T12:00:00.000Z');
  });
});

describe('formatarData', () => {
  it('formata como dd/mm/aaaa', () => {
    assert.equal(formatarData('2026-07-18'), '18/07/2026');
  });
});

describe('calcularDias', () => {
  it('retorna diferença em dias civis', () => {
    const hoje = new Date();
    const alvo = new Date(
      Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 3)
    );
    const iso = alvo.toISOString().slice(0, 10);
    assert.equal(calcularDias(iso), 3);
  });
});

describe('rotuloPrazoVencimento', () => {
  it('rotula prazos relativos ao vencimento', () => {
    assert.equal(rotuloPrazoVencimento(0), 'Vence hoje');
    assert.equal(rotuloPrazoVencimento(1), 'Vence amanhã');
    assert.equal(rotuloPrazoVencimento(3), 'Vence em 3 dias');
    assert.equal(rotuloPrazoVencimento(-1), '1 dia atrasado');
  });
});

describe('statusCliente', () => {
  it('classifica expiração futura como ATIVO', () => {
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 10);
    assert.equal(statusCliente(futuro.toISOString()), 'ATIVO');
  });

  it('classifica atraso até 7 dias como ATRASADO', () => {
    const atrasado = new Date();
    atrasado.setDate(atrasado.getDate() - 3);
    assert.equal(statusCliente(atrasado.toISOString()), 'ATRASADO');
  });
});

describe('resolverStatusCliente', () => {
  it('não classifica somente contato como ativo', () => {
    assert.equal(
      resolverStatusCliente({ somenteContato: true, expiraEm: null }),
      'INATIVO'
    );
    assert.equal(clienteEstaAtivo({ somenteContato: true, expiraEm: null }), false);
    assert.equal(
      clienteEntraNoGrupoStatus({ somenteContato: true, expiraEm: null }, 'ATIVO'),
      false
    );
  });
});

describe('statusFinanceiro', () => {
  it('marca vencimento passado como ATRASADO', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    assert.equal(statusFinanceiro(ontem.toISOString()), 'ATRASADO');
  });

  it('marca vencimento dentro da antecedência como PENDENTE', () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    assert.equal(statusFinanceiro(amanha.toISOString(), 5), 'PENDENTE');
  });

  it('rotuloStatusFinanceiro traduz REGULAR para texto amigável', () => {
    assert.equal(rotuloStatusFinanceiro('REGULAR'), 'Longe do vencimento');
    assert.equal(rotuloStatusFinanceiro('PENDENTE'), 'Vencendo');
    assert.equal(rotuloStatusFinanceiro('ATRASADO'), 'Atrasado');
  });
});
