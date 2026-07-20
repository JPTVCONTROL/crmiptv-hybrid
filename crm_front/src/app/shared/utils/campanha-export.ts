import { formatarData, StatusCliente } from './formatters';
import { rotuloSegmentoPublico, rotuloStatusPublico, SegmentoPublicoCampanha } from './campanha-publico';
import { rotuloTipoCampanha, TipoCampanha } from './campanha';

export interface LinhaExportCampanha {
  nome: string;
  telefone: string;
  telefoneValido: boolean;
  enviado: boolean;
  enviadoEm?: string;
  status: StatusCliente;
  planoNome?: string;
  cortesia: boolean;
}

export interface MetaExportCampanha {
  titulo: string;
  tipo: TipoCampanha;
  segmento: SegmentoPublicoCampanha;
  planoNome?: string;
  incluirCortesia: boolean;
}

function escaparCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

function slugArquivo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48);
}

export function exportarCampanhaCsv(
  linhas: LinhaExportCampanha[],
  meta: MetaExportCampanha
): void {
  if (linhas.length === 0) {
    return;
  }

  const resumoPlano = meta.planoNome ?? 'Todos';
  const resumoCortesia = meta.incluirCortesia ? 'Sim' : 'Nao';

  const cabecalhoMeta = [
    ['Campanha', escaparCsv(meta.titulo)].join(';'),
    ['Tipo', escaparCsv(rotuloTipoCampanha(meta.tipo))].join(';'),
    ['Publico', escaparCsv(rotuloSegmentoPublico(meta.segmento))].join(';'),
    ['Plano', escaparCsv(resumoPlano)].join(';'),
    ['Incluir cortesia', resumoCortesia].join(';'),
    ['Exportado em', formatarData(new Date().toISOString())].join(';'),
    '',
    [
      'Nome',
      'Telefone',
      'WhatsApp',
      'Status envio',
      'Enviado em',
      'Status cliente',
      'Plano',
      'Cortesia',
    ].join(';'),
  ];

  const dados = linhas.map((linha) =>
    [
      escaparCsv(linha.nome),
      escaparCsv(linha.telefone),
      linha.telefoneValido ? 'Valido' : 'Invalido',
      linha.enviado ? 'Enviado' : 'Pendente',
      linha.enviadoEm ? formatarData(linha.enviadoEm) : '',
      rotuloStatusPublico(linha.status),
      escaparCsv(linha.planoNome ?? ''),
      linha.cortesia ? 'Sim' : 'Nao',
    ].join(';')
  );

  const blob = new Blob(['\uFEFF' + [...cabecalhoMeta, ...dados].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug = slugArquivo(meta.titulo) || 'campanha';
  const data = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `campanha-${slug}-${data}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
