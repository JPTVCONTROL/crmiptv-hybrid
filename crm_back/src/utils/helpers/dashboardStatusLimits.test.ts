import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcularStatusCliente } from './clienteStatus.js';
import { parseDataSomenteDia } from './dateHelpers.js';
import {
  calcularLimitesDashboard,
  whereClienteAtivo,
  whereClienteAtrasado,
  whereClienteInativo,
} from './dashboardStatusLimits.js';

describe('dashboardStatusLimits', () => {
  it('limites de status batem com calcularStatusCliente', () => {
    const referencia = new Date();
    referencia.setHours(12, 0, 0, 0);
    const y = referencia.getFullYear();
    const m = referencia.getMonth();
    const d = referencia.getDate();
    const expiraEmOffset = (offset: number) =>
      parseDataSomenteDia(new Date(y, m, d + offset));

    const { inicioHoje, inicioAtrasado } = calcularLimitesDashboard(referencia);

    const casos = [
      { expiraEm: expiraEmOffset(0), esperado: 'ATIVO' },
      { expiraEm: expiraEmOffset(1), esperado: 'ATIVO' },
      { expiraEm: expiraEmOffset(-1), esperado: 'ATRASADO' },
      { expiraEm: expiraEmOffset(-7), esperado: 'ATRASADO' },
      { expiraEm: expiraEmOffset(-8), esperado: 'INATIVO' },
      { expiraEm: null, esperado: 'ATIVO' },
    ] as const;

    for (const { expiraEm, esperado } of casos) {
      assert.equal(calcularStatusCliente(expiraEm), esperado);

      if (esperado === 'ATIVO' && expiraEm !== null) {
        assert.ok(expiraEm >= inicioHoje || expiraEm === null);
      }
      if (esperado === 'ATRASADO') {
        assert.ok(expiraEm! >= inicioAtrasado && expiraEm! < inicioHoje);
      }
      if (esperado === 'INATIVO') {
        assert.ok(expiraEm! < inicioAtrasado);
      }
    }
  });

  it('filtros Prisma cobrem os três status sem sobreposição', () => {
    const referencia = new Date(2026, 6, 18);
    const { inicioHoje, inicioAtrasado } = calcularLimitesDashboard(referencia);

    const ativo = whereClienteAtivo(inicioHoje);
    const atrasado = whereClienteAtrasado(inicioHoje, inicioAtrasado);
    const inativo = whereClienteInativo(inicioAtrasado);

    assert.ok(ativo.OR);
    assert.ok(atrasado.expiraEm);
    assert.ok(inativo.expiraEm);
  });
});
