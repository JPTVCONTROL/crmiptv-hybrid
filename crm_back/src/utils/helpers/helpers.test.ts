import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calcularDiasVencimento,
  clienteParticipaCobrancas,
} from './cobrancaDiariaHelpers.js';
import { parseCsvClientes } from './clienteImportHelpers.js';
import {
  addMonthsUtc,
  calcularExpiracao,
  calcularNovoVencimento,
  mesesValidadePorPlano,
  parseDataSomenteDia,
} from './dateHelpers.js';

describe('parseDataSomenteDia', () => {
  it('interpreta YYYY-MM-DD como dia civil em UTC meio-dia', () => {
    const data = parseDataSomenteDia('2026-07-18');
    assert.equal(data.toISOString(), '2026-07-18T12:00:00.000Z');
  });

  it('usa calendário local para Date com horário (evita off-by-one)', () => {
    const local = new Date(2026, 6, 18, 23, 59, 0, 0);
    const data = parseDataSomenteDia(local);
    assert.equal(data.getUTCDate(), 18);
  });
});

describe('mesesValidadePorPlano', () => {
  it('identifica plano mensal, trimestral e anual', () => {
    assert.equal(
      mesesValidadePorPlano({ nome: '1 - Mensal', diasValidade: 30 }),
      1
    );
    assert.equal(
      mesesValidadePorPlano({ nome: '1 - Trimestral', diasValidade: 90 }),
      3
    );
    assert.equal(
      mesesValidadePorPlano({ nome: '1 - Anual', diasValidade: 365 }),
      12
    );
  });
});

describe('calcularExpiracao', () => {
  it('renova no mesmo dia civil após N meses', () => {
    const base = parseDataSomenteDia('2026-01-15');
    const expira = calcularExpiracao(base, {
      nome: '1 - Mensal',
      diasValidade: 30,
    });
    assert.equal(expira.toISOString(), '2026-02-15T12:00:00.000Z');
  });
});

describe('calcularNovoVencimento', () => {
  it('mantém vencimento quando pagamento é antes do vencimento', () => {
    const novo = calcularNovoVencimento(
      parseDataSomenteDia('2026-03-10'),
      parseDataSomenteDia('2026-03-05'),
      { nome: '1 - Mensal', diasValidade: 30 }
    );
    assert.equal(novo.toISOString(), '2026-04-10T12:00:00.000Z');
  });

  it('renova a partir do pagamento quando pago após vencimento', () => {
    const novo = calcularNovoVencimento(
      parseDataSomenteDia('2026-03-10'),
      parseDataSomenteDia('2026-03-20'),
      { nome: '1 - Mensal', diasValidade: 30 }
    );
    assert.equal(novo.toISOString(), '2026-04-20T12:00:00.000Z');
  });
});

describe('addMonthsUtc', () => {
  it('soma meses preservando dia quando possível', () => {
    const result = addMonthsUtc(parseDataSomenteDia('2026-01-15'), 1);
    assert.equal(result.getUTCMonth(), 1);
    assert.equal(result.getUTCDate(), 15);
  });
});

describe('clienteParticipaCobrancas', () => {
  it('trata null/undefined como participante', () => {
    assert.equal(clienteParticipaCobrancas({}), true);
    assert.equal(clienteParticipaCobrancas({ incluirCobrancas: true }), true);
  });

  it('exclui apenas quando incluirCobrancas é false', () => {
    assert.equal(
      clienteParticipaCobrancas({ incluirCobrancas: false }),
      false
    );
  });
});

describe('calcularDiasVencimento', () => {
  it('retorna 0 para vencimento no mesmo dia civil de hoje', () => {
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    assert.equal(calcularDiasVencimento(iso), 0);
  });
});

describe('parseCsvClientes', () => {
  it('importa cabeçalho nome,telefone', () => {
    const resultado = parseCsvClientes('nome,telefone\nJoão,(62) 99999-1234\n');
    assert.equal(resultado.erros.length, 0);
    assert.equal(resultado.linhas.length, 1);
    assert.equal(resultado.linhas[0]?.nome, 'João');
  });

  it('reporta erro quando falta telefone', () => {
    const resultado = parseCsvClientes('nome,telefone\nMaria,\n');
    assert.equal(resultado.linhas.length, 0);
    assert.ok(resultado.erros.length > 0);
  });
});
