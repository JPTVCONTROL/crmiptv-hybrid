import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calcularExpiracaoPorPlano,
  mesesValidadePlano,
  ordenarPlanos,
  rotuloValidadePlano,
  telasDoPlano,
} from './planos.ts';
import type { Plano } from '../../core/models/index.ts';

describe('telasDoPlano', () => {
  it('extrai quantidade de telas do prefixo numérico', () => {
    assert.equal(telasDoPlano('2 - Mensal'), 2);
    assert.equal(telasDoPlano('Plano único'), 999);
  });
});

describe('mesesValidadePlano', () => {
  it('identifica mensal, trimestral e anual', () => {
    assert.equal(
      mesesValidadePlano({ nome: '1 - Mensal', diasValidade: 30 }),
      1
    );
    assert.equal(
      mesesValidadePlano({ nome: '1 - Trimestral', diasValidade: 90 }),
      3
    );
    assert.equal(
      mesesValidadePlano({ nome: '1 - Anual', diasValidade: 365 }),
      12
    );
  });
});

describe('calcularExpiracaoPorPlano', () => {
  it('soma meses preservando dia civil', () => {
    const base = new Date(2026, 0, 15, 10, 0, 0);
    const expira = calcularExpiracaoPorPlano(base, {
      nome: '1 - Mensal',
      diasValidade: 30,
    });
    assert.equal(expira.getUTCDate(), 15);
    assert.equal(expira.getUTCMonth(), 1);
  });
});

describe('rotuloValidadePlano', () => {
  it('rotula meses comuns', () => {
    const plano: Plano = {
      id: 1,
      nome: '1 - Mensal',
      valor: 30,
      diasValidade: 30,
      ativo: true,
    };
    assert.equal(rotuloValidadePlano(plano), '1 mês');
  });
});

describe('ordenarPlanos', () => {
  it('ordena por telas, validade e valor', () => {
    const planos: Plano[] = [
      { id: 2, nome: '2 - Mensal', valor: 50, diasValidade: 30, ativo: true },
      { id: 1, nome: '1 - Mensal', valor: 30, diasValidade: 30, ativo: true },
    ];
    const ordenados = ordenarPlanos(planos);
    assert.equal(ordenados[0].id, 1);
    assert.equal(ordenados[1].id, 2);
  });
});
