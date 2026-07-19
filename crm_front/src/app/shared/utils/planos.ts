import { Plano } from '../../core/models';
import { formatarValor } from './formatters';

export interface GrupoPlanos {
  titulo: string;
  planos: Plano[];
}

export function telasDoPlano(nomePlano: string): number {
  return extrairTelas(nomePlano);
}

function extrairTelas(nome: string): number {
  const match = nome.match(/^(\d+)/);
  return match ? Number(match[1]) : 999;
}

function extrairGrupo(nome: string): string {
  const partes = nome.split(' - ');
  return partes.length > 1 ? partes[0].trim() : 'Outros';
}

function nomeCurto(nome: string): string {
  const partes = nome.split(' - ');
  return partes.length > 1 ? partes.slice(1).join(' - ').trim() : nome;
}

export function mesesValidadePlano(plano: Pick<Plano, 'nome' | 'diasValidade'>): number {
  const nome = plano.nome.toLowerCase();
  if (nome.includes('anual')) return 12;
  if (nome.includes('trimestral')) return 3;
  if (nome.includes('mensal')) return 1;

  if (plano.diasValidade >= 360) return 12;
  if (plano.diasValidade >= 80) return 3;
  if (plano.diasValidade >= 25) return 1;

  return Math.max(1, Math.round(plano.diasValidade / 30));
}

export function calcularExpiracaoPorPlano(
  base: Date,
  plano: Pick<Plano, 'nome' | 'diasValidade'>
): Date {
  const result = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0, 0);
  result.setMonth(result.getMonth() + mesesValidadePlano(plano));
  return result;
}

export function rotuloValidadePlano(plano: Plano): string {
  const meses = mesesValidadePlano(plano);
  if (meses === 1) return '1 mês';
  if (meses === 3) return '3 meses';
  if (meses === 12) return '12 meses';
  return `${plano.diasValidade} dias`;
}

export function ordenarPlanos(planos: Plano[]): Plano[] {
  return [...planos].sort((a, b) => {
    const telasA = extrairTelas(a.nome);
    const telasB = extrairTelas(b.nome);
    if (telasA !== telasB) return telasA - telasB;

    if (a.diasValidade !== b.diasValidade) {
      return a.diasValidade - b.diasValidade;
    }

    if (a.valor !== b.valor) return a.valor - b.valor;

    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export function agruparPlanos(planos: Plano[]): GrupoPlanos[] {
  const ordenados = ordenarPlanos(planos);
  const grupos: GrupoPlanos[] = [];

  for (const plano of ordenados) {
    const titulo = extrairGrupo(plano.nome);
    const existente = grupos.find((g) => g.titulo === titulo);

    if (existente) {
      existente.planos.push(plano);
    } else {
      grupos.push({ titulo, planos: [plano] });
    }
  }

  return grupos.sort(
    (a, b) => extrairTelas(a.titulo) - extrairTelas(b.titulo)
  );
}

export function rotuloPlanoOpcao(plano: Plano): string {
  return `${nomeCurto(plano.nome)} — ${formatarValor(plano.valor)} (${rotuloValidadePlano(plano)})`;
}
