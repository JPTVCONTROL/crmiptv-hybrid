import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clienteApareceEmVencimentos,
  clienteParticipaCobrancas,
  elegivelCobrancaDiaria,
  elegivelRotinaCobrancaDiaria,
  mensalidadeElegivelCobrancaDiaria,
  resolverDiasAntecedencia,
  rotuloDiasCobrancaDiaria,
  tipoCobrancaDiaria,
} from './cobranca-diaria.ts';
import { elegivelRotinaProgressiva } from './automacao-disparo.ts';

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

describe('elegivelRotinaCobrancaDiaria', () => {
  it('aceita somente dias do funil progressivo', () => {
    const hoje = new Date();
    const daqui3 = new Date(
      Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 3)
    );
    const daqui2 = new Date(
      Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 2)
    );
    const daqui4 = new Date(
      Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 4)
    );

    assert.equal(
      elegivelRotinaCobrancaDiaria(daqui3.toISOString().slice(0, 10)),
      true
    );
    assert.equal(
      elegivelRotinaCobrancaDiaria(daqui2.toISOString().slice(0, 10)),
      false
    );
    assert.equal(
      elegivelRotinaCobrancaDiaria(daqui4.toISOString().slice(0, 10)),
      false
    );
    assert.equal(elegivelRotinaProgressiva(5), true);
    assert.equal(elegivelRotinaProgressiva(4), false);
  });
});

describe('mensalidadeElegivelCobrancaDiaria', () => {
  it('exige pendente, cliente elegível e dia do funil', () => {
    const hoje = new Date();
    const daqui3 = new Date(
      Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 3)
    );
    const daqui2 = new Date(
      Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 2)
    );

    assert.equal(
      mensalidadeElegivelCobrancaDiaria({
        status: 'PENDENTE',
        vencimento: daqui3.toISOString().slice(0, 10),
        cliente: {},
      }),
      true
    );
    assert.equal(
      mensalidadeElegivelCobrancaDiaria({
        status: 'PENDENTE',
        vencimento: daqui2.toISOString().slice(0, 10),
        cliente: {},
      }),
      false
    );
    assert.equal(
      mensalidadeElegivelCobrancaDiaria({
        status: 'PAGO',
        vencimento: daqui3.toISOString().slice(0, 10),
        cliente: {},
      }),
      false
    );
    assert.equal(
      mensalidadeElegivelCobrancaDiaria({
        status: 'PENDENTE',
        vencimento: daqui3.toISOString().slice(0, 10),
        cliente: { somenteContato: true },
      }),
      false
    );
  });
});

describe('rotuloDiasCobrancaDiaria', () => {
  it('rotula vencimento e atraso', () => {
    assert.equal(rotuloDiasCobrancaDiaria(0), 'Vence hoje');
    assert.equal(rotuloDiasCobrancaDiaria(1), 'Vence amanhã');
    assert.equal(rotuloDiasCobrancaDiaria(3), 'Vence em 3 dias');
    assert.equal(rotuloDiasCobrancaDiaria(-2), '2 dias atrasados');
  });
});

describe('clienteParticipaCobrancas', () => {
  it('respeita incluirCobrancas false', () => {
    assert.equal(clienteParticipaCobrancas({ incluirCobrancas: false }), false);
    assert.equal(clienteParticipaCobrancas({ incluirCobrancas: true }), true);
    assert.equal(clienteParticipaCobrancas({}), true);
  });

  it('exclui clientes cortesia', () => {
    assert.equal(clienteParticipaCobrancas({ cortesia: true }), false);
  });

  it('exclui clientes somente contato', () => {
    assert.equal(clienteParticipaCobrancas({ somenteContato: true }), false);
  });
});

describe('clienteApareceEmVencimentos', () => {
  it('inclui cortesia mas exclui somente contato', () => {
    assert.equal(clienteApareceEmVencimentos({ cortesia: true }), true);
    assert.equal(clienteApareceEmVencimentos({ somenteContato: true }), false);
    assert.equal(clienteApareceEmVencimentos({ incluirCobrancas: false }), false);
    assert.equal(clienteApareceEmVencimentos({ ativo: false }), false);
  });
});
