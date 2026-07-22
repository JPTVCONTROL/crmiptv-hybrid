import type { Prisma } from '@prisma/client';

export interface LimitesStatusDashboard {
  inicioHoje: Date;
  inicioAtrasado: Date;
  inicioMes: Date;
  inicioProximoMes: Date;
  fimAntecedencia: Date;
  trintaDiasAtras: Date;
  sessentaDiasAtras: Date;
  seisMesesAtras: Date;
}

export function calcularLimitesDashboard(
  referencia = new Date(),
  diasAntecedencia = 5
): LimitesStatusDashboard {
  const y = referencia.getFullYear();
  const m = referencia.getMonth();
  const d = referencia.getDate();

  const inicioHoje = new Date(Date.UTC(y, m, d, 12, 0, 0));
  const inicioAtrasado = new Date(Date.UTC(y, m, d - 7, 12, 0, 0));
  const inicioMes = new Date(y, m, 1);
  const inicioProximoMes = new Date(y, m + 1, 1);
  const fimAntecedencia = new Date(Date.UTC(y, m, d + diasAntecedencia, 12, 0, 0));

  const trintaDiasAtras = new Date(referencia);
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  trintaDiasAtras.setHours(0, 0, 0, 0);

  const sessentaDiasAtras = new Date(referencia);
  sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);
  sessentaDiasAtras.setHours(0, 0, 0, 0);

  const seisMesesAtras = new Date(y, m - 5, 1);

  return {
    inicioHoje,
    inicioAtrasado,
    inicioMes,
    inicioProximoMes,
    fimAntecedencia,
    trintaDiasAtras,
    sessentaDiasAtras,
    seisMesesAtras,
  };
}

export function whereClienteAtivo(
  inicioHoje: Date
): Prisma.ClienteWhereInput {
  return {
    somenteContato: false,
    OR: [{ expiraEm: null }, { expiraEm: { gte: inicioHoje } }],
  };
}

export function whereClienteAtrasado(
  inicioHoje: Date,
  inicioAtrasado: Date
): Prisma.ClienteWhereInput {
  return {
    somenteContato: false,
    expiraEm: { gte: inicioAtrasado, lt: inicioHoje },
  };
}

export function whereClienteInativo(
  inicioAtrasado: Date
): Prisma.ClienteWhereInput {
  return {
    somenteContato: false,
    expiraEm: { lt: inicioAtrasado },
  };
}

export function whereClienteGerenciado(
  inicioAtrasado: Date
): Prisma.ClienteWhereInput {
  return {
    OR: [{ expiraEm: null }, { expiraEm: { gte: inicioAtrasado } }],
  };
}

export function whereClienteParticipaCobranca(
  referencia = new Date()
): Prisma.ClienteWhereInput {
  const { inicioAtrasado } = calcularLimitesDashboard(referencia);

  return {
    cortesia: false,
    somenteContato: false,
    ativo: { not: false },
    NOT: { incluirCobrancas: false },
    expiraEm: { not: null, gte: inicioAtrasado },
  };
}

export function whereMensalidadeCobrancaCliente(): Prisma.MensalidadeWhereInput {
  return {
    status: 'PENDENTE',
    cliente: whereClienteParticipaCobranca(),
  };
}
