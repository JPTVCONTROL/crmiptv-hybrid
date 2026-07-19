import { Cliente } from '../../core/models';
import { formatarData } from './formatters';

function escaparCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

export function exportarClientesCsv(
  clientes: Cliente[],
  nomeArquivo = 'clientes.csv'
): void {
  if (clientes.length === 0) {
    return;
  }

  const linhas = [
    [
      'Nome',
      'Telefone',
      'Plano',
      'Valor mensal',
      'Expira em',
      'Status',
      'Incluir cobranças',
    ].join(';'),
    ...clientes.map((cliente) =>
      [
        escaparCsv(cliente.nome),
        escaparCsv(cliente.telefone),
        escaparCsv(cliente.plano?.nome ?? ''),
        cliente.valorMensal.toFixed(2).replace('.', ','),
        cliente.expiraEm ? formatarData(cliente.expiraEm) : '',
        cliente.status,
        cliente.incluirCobrancas === false ? 'Nao' : 'Sim',
      ].join(';')
    ),
  ];

  const blob = new Blob(['\uFEFF' + linhas.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
