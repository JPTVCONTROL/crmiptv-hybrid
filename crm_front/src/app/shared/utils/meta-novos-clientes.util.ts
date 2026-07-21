export const META_NOVOS_CLIENTES_QTD_PADRAO = 10;
export const META_NOVOS_CLIENTES_DIAS_PADRAO = 30;

export function dataIsoParaInput(valor?: string | null): string {
  if (!valor) {
    return '';
  }

  return valor.slice(0, 10);
}

export function formatarDataInput(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function adicionarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

export function normalizarMetaNovosClientesQtd(valor: unknown): number {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numero)) {
    return META_NOVOS_CLIENTES_QTD_PADRAO;
  }

  return Math.min(999, Math.max(1, Math.round(numero)));
}

export function normalizarMetaNovosClientesInicioEm(
  valor: unknown,
  referencia = new Date()
): string {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    return valor.trim();
  }

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return formatarDataInput(valor);
  }

  return formatarDataInput(referencia);
}

export function normalizarMetaNovosClientesFimEm(
  valor: unknown,
  inicioEm: string
): string {
  const inicio = new Date(`${inicioEm}T12:00:00`);
  let fim = new Date(inicio);

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    fim = new Date(`${valor.trim()}T12:00:00`);
  } else if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    fim = new Date(valor);
  } else {
    fim = adicionarDias(inicio, META_NOVOS_CLIENTES_DIAS_PADRAO);
  }

  if (fim.getTime() < inicio.getTime()) {
    return inicioEm;
  }

  return formatarDataInput(fim);
}

export function metaNovosClientesPadrao(referencia = new Date()): {
  inicioEm: string;
  fimEm: string;
} {
  const inicioEm = formatarDataInput(referencia);
  const fimEm = formatarDataInput(
    adicionarDias(referencia, META_NOVOS_CLIENTES_DIAS_PADRAO)
  );

  return { inicioEm, fimEm };
}

export function dataIsoValida(iso?: string | null): iso is string {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso.trim());
}

export function formatarDataCurta(iso?: string | null): string {
  if (!dataIsoValida(iso)) {
    return '—';
  }

  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano.slice(-2)}`;
}

export function resolverDatasMetaNovosClientes(
  inicioEm?: string | null,
  fimEm?: string | null,
  referencia = new Date()
): { inicioEm: string; fimEm: string } {
  const padrao = metaNovosClientesPadrao(referencia);
  const inicio = dataIsoValida(inicioEm) ? inicioEm.trim() : padrao.inicioEm;
  const fim = dataIsoValida(fimEm)
    ? normalizarMetaNovosClientesFimEm(fimEm, inicio)
    : padrao.fimEm;

  return { inicioEm: inicio, fimEm: fim };
}

export function rotuloJanelaMetaNovosClientes(
  inicioEm?: string | null,
  fimEm?: string | null
): string {
  const { inicioEm: inicio, fimEm: fim } = resolverDatasMetaNovosClientes(
    inicioEm,
    fimEm
  );

  if (inicio === fim) {
    return `em ${formatarDataCurta(fim)}`;
  }

  return `${formatarDataCurta(inicio)} – ${formatarDataCurta(fim)}`;
}

export function rotuloPrazoMetaNovosClientes(
  fimEm?: string | null,
  encerrada = false,
  diasRestantes = 0
): string {
  const fim = dataIsoValida(fimEm)
    ? fimEm.trim()
    : resolverDatasMetaNovosClientes(undefined, fimEm).fimEm;

  if (encerrada) {
    return `encerrada em ${formatarDataCurta(fim)}`;
  }

  if (diasRestantes === 0) {
    return `termina hoje (${formatarDataCurta(fim)})`;
  }

  if (diasRestantes === 1) {
    return `até amanhã (${formatarDataCurta(fim)})`;
  }

  return `até ${formatarDataCurta(fim)} · ${diasRestantes} dias restantes`;
}
