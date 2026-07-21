import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clienteElegivelCobranca,
  formatReferenciaCliente,
  mensalidadeParaCobrancaCliente,
} from './cliente-cobranca.util';
import { Cliente } from '../../core/models';

function clienteBase(parcial: Partial<Cliente> = {}): Cliente {
  return {
    id: 1,
    nome: 'João',
    telefone: '(62) 99999-1234',
    vencimento: 10,
    valorMensal: 35,
    status: 'ATIVO',
    expiraEm: '2026-06-15',
    incluirCobrancas: true,
    ativo: true,
    cortesia: false,
    somenteContato: false,
    ...parcial,
  };
}

describe('cliente-cobranca.util', () => {
  it('formata referência MM/AAAA a partir da expiração', () => {
    assert.equal(formatReferenciaCliente('2026-06-15'), '06/2026');
  });

  it('monta mensalidade sintética quando não há pendência', () => {
    const mensalidade = mensalidadeParaCobrancaCliente(
      clienteBase({ mensalidades: [] })
    );

    assert.ok(mensalidade);
    assert.equal(mensalidade!.valor, 35);
    assert.equal(mensalidade!.vencimento, '2026-06-15');
    assert.equal(mensalidade!.referencia, '06/2026');
  });

  it('usa mensalidade pendente quando existir', () => {
    const mensalidade = mensalidadeParaCobrancaCliente(
      clienteBase({
        mensalidades: [
          {
            id: 9,
            clienteId: 1,
            referencia: '07/2026',
            valor: 35,
            vencimento: '2026-07-10',
            status: 'PENDENTE',
          },
        ],
      })
    );

    assert.equal(mensalidade?.id, 9);
    assert.equal(mensalidade?.referencia, '07/2026');
  });

  it('cliente atrasado com telefone válido é elegível', () => {
    const expirado = new Date();
    expirado.setDate(expirado.getDate() - 5);

    assert.equal(
      clienteElegivelCobranca(
        clienteBase({
          expiraEm: expirado.toISOString().slice(0, 10),
        })
      ),
      true
    );
  });

  it('somente contato não é elegível', () => {
    assert.equal(
      clienteElegivelCobranca(clienteBase({ somenteContato: true })),
      false
    );
  });
});
