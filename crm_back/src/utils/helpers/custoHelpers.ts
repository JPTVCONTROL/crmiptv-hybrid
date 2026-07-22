import { calcularStatusCliente } from './clienteStatus.js';

export interface ClienteCustoResumo {
  id: number;
  nome: string;
  valorMensal: number;
  custoCredito: number;
  margem: number;
  status: string;
  cortesia: boolean;
  somenteContato: boolean;
}

export function clienteParticipaCustos(cliente: {
  somenteContato?: boolean | null;
  cortesia?: boolean | null;
}): boolean {
  return cliente.somenteContato !== true;
}

export function montarResumoCustos(
  clientes: Array<{
    id: number;
    nome: string;
    valorMensal: number;
    custoCredito: number;
    cortesia: boolean;
    somenteContato: boolean;
    ativo: boolean;
    expiraEm: Date | null;
  }>,
  despesas: Array<{ valor: number; ativo: boolean }>
) {
  const clientesResumo: ClienteCustoResumo[] = clientes
    .filter((cliente) => clienteParticipaCustos(cliente))
    .map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      valorMensal: cliente.valorMensal,
      custoCredito: cliente.custoCredito,
      margem: Math.round((cliente.valorMensal - cliente.custoCredito) * 100) / 100,
      status: calcularStatusCliente(cliente.expiraEm),
      cortesia: cliente.cortesia,
      somenteContato: cliente.somenteContato,
    }))
    .sort((a, b) => b.custoCredito - a.custoCredito || a.nome.localeCompare(b.nome, 'pt-BR'));

  const creditoClientes = clientesResumo.reduce(
    (total, cliente) => total + cliente.custoCredito,
    0
  );
  const qtdClientesComCredito = clientesResumo.filter(
    (cliente) => cliente.custoCredito > 0
  ).length;

  const despesasAtivas = despesas.filter((item) => item.ativo);
  const despesasFixas = despesasAtivas.reduce((total, item) => total + item.valor, 0);

  const clientesPagantes = clientesResumo.filter(
    (cliente) =>
      !cliente.cortesia &&
      cliente.status === 'ATIVO' &&
      cliente.valorMensal > 0
  );
  const mrr = clientesPagantes.reduce((total, cliente) => total + cliente.valorMensal, 0);
  const totalMensal = creditoClientes + despesasFixas;
  const margemEstimada = Math.round((mrr - totalMensal) * 100) / 100;
  const margemPercentual =
    mrr > 0 ? Math.round((margemEstimada / mrr) * 1000) / 10 : 0;

  const receitaClientesComCredito = clientesResumo
    .filter((cliente) => cliente.custoCredito > 0)
    .reduce((total, cliente) => total + cliente.valorMensal, 0);
  const margemCreditos = Math.round(
    (receitaClientesComCredito - creditoClientes) * 100
  ) / 100;

  return {
    creditoClientes: Math.round(creditoClientes * 100) / 100,
    qtdClientesComCredito,
    despesasFixas: Math.round(despesasFixas * 100) / 100,
    qtdDespesasAtivas: despesasAtivas.length,
    totalMensal: Math.round(totalMensal * 100) / 100,
    mrr: Math.round(mrr * 100) / 100,
    margemEstimada,
    margemPercentual,
    receitaClientesComCredito: Math.round(receitaClientesComCredito * 100) / 100,
    margemCreditos,
    clientes: clientesResumo,
  };
}
