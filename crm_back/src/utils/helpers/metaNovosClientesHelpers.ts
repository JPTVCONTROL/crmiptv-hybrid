import { parseDataSomenteDia } from './dateHelpers.js';

export const META_NOVOS_CLIENTES_QTD_PADRAO = 10;
export const META_NOVOS_CLIENTES_DIAS_PADRAO = 30;

export const META_NOVOS_CLIENTES_DIAS_OPCOES = [7, 15, 30, 60, 90] as const;

/** Clientes que entram na meta: exclui cortesia e cadastro somente contato. */
export const whereClienteContaMeta = {
  cortesia: false,
  somenteContato: false,
} as const;

export interface MetaNovosClientesResolvida {
  qtd: number;
  inicio: Date;
  fim: Date;
  inicioEm: string;
  fimEm: string;
  diasPeriodo: number;
  diasRestantes: number;
  encerrada: boolean;
}

export function normalizarMetaNovosClientesQtd(valor: unknown): number {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numero)) {
    return META_NOVOS_CLIENTES_QTD_PADRAO;
  }

  return Math.min(999, Math.max(1, Math.round(numero)));
}

export function normalizarMetaNovosClientesDias(valor: unknown): number {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (
    Number.isFinite(numero) &&
    (META_NOVOS_CLIENTES_DIAS_OPCOES as readonly number[]).includes(numero)
  ) {
    return numero;
  }

  return META_NOVOS_CLIENTES_DIAS_PADRAO;
}

export function formatarDataIsoSomenteDia(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function inicioDoDiaUtc(valor: string | Date): Date {
  const data = parseDataSomenteDia(valor);
  return new Date(
    Date.UTC(
      data.getUTCFullYear(),
      data.getUTCMonth(),
      data.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

export function fimDoDiaUtc(valor: string | Date): Date {
  const data = parseDataSomenteDia(valor);
  return new Date(
    Date.UTC(
      data.getUTCFullYear(),
      data.getUTCMonth(),
      data.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

function adicionarDiasUtc(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

function diffDiasInclusive(inicio: Date, fim: Date): number {
  const msPorDia = 24 * 60 * 60 * 1000;
  return (
    Math.floor(
      (fimDoDiaUtc(fim).getTime() - inicioDoDiaUtc(inicio).getTime()) / msPorDia
    ) + 1
  );
}

export function normalizarMetaNovosClientesInicioEm(
  valor: unknown,
  referencia = new Date()
): string {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    return valor.trim();
  }

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return formatarDataIsoSomenteDia(parseDataSomenteDia(valor));
  }

  return formatarDataIsoSomenteDia(parseDataSomenteDia(referencia));
}

export function normalizarMetaNovosClientesFimEm(
  valor: unknown,
  inicioEm: string
): string {
  const inicio = parseDataSomenteDia(inicioEm);
  let fim = parseDataSomenteDia(inicioEm);

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    fim = parseDataSomenteDia(valor.trim());
  } else if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    fim = parseDataSomenteDia(valor);
  } else {
    fim = adicionarDiasUtc(inicio, META_NOVOS_CLIENTES_DIAS_PADRAO);
  }

  if (fim.getTime() < inicio.getTime()) {
    fim = inicio;
  }

  return formatarDataIsoSomenteDia(fim);
}

export function resolverMetaNovosClientes(
  configuracao: {
    metaNovosClientesQtd?: number | null;
    metaNovosClientesDias?: number | null;
    metaNovosClientesInicioEm?: Date | string | null;
    metaNovosClientesFimEm?: Date | string | null;
  },
  referencia = new Date()
): MetaNovosClientesResolvida {
  const qtd = normalizarMetaNovosClientesQtd(configuracao.metaNovosClientesQtd);
  const hoje = parseDataSomenteDia(referencia);
  const hojeEm = formatarDataIsoSomenteDia(hoje);

  let inicioEm: string;
  let fimEm: string;

  if (configuracao.metaNovosClientesFimEm) {
    inicioEm = configuracao.metaNovosClientesInicioEm
      ? normalizarMetaNovosClientesInicioEm(configuracao.metaNovosClientesInicioEm)
      : normalizarMetaNovosClientesInicioEm(hojeEm);
    fimEm = normalizarMetaNovosClientesFimEm(
      configuracao.metaNovosClientesFimEm,
      inicioEm
    );
  } else {
    const dias = normalizarMetaNovosClientesDias(configuracao.metaNovosClientesDias);
    fimEm = hojeEm;
    inicioEm = formatarDataIsoSomenteDia(adicionarDiasUtc(hoje, -(dias - 1)));
  }

  const inicio = parseDataSomenteDia(inicioEm);
  const fim = parseDataSomenteDia(fimEm);
  const diasPeriodo = diffDiasInclusive(inicio, fim);
  const encerrada = hoje.getTime() > fim.getTime();
  const diasRestantes = encerrada
    ? 0
    : diffDiasInclusive(hoje, fim);

  return {
    qtd,
    inicio,
    fim,
    inicioEm,
    fimEm,
    diasPeriodo,
    diasRestantes,
    encerrada,
  };
}

export function calcularJanelaComparativaMeta(
  meta: MetaNovosClientesResolvida
): { inicio: Date; fim: Date } {
  const inicioAnterior = adicionarDiasUtc(meta.inicio, -meta.diasPeriodo);
  const fimAnterior = adicionarDiasUtc(meta.inicio, -1);

  return {
    inicio: inicioDoDiaUtc(inicioAnterior),
    fim: fimDoDiaUtc(fimAnterior),
  };
}

export function limiteContagemMetaNovosClientes(
  meta: MetaNovosClientesResolvida,
  referencia = new Date()
): Date {
  const hoje = parseDataSomenteDia(referencia);

  if (hoje.getTime() > meta.fim.getTime()) {
    return fimDoDiaUtc(meta.fim);
  }

  return fimDoDiaUtc(hoje);
}
