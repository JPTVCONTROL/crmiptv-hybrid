import { Cliente, Mensalidade } from '../../core/models';
import { calcularDias } from './formatters';
import {
  clienteApareceEmVencimentos,
  clienteEhCortesia,
  clienteParticipaCobrancas,
} from './cobranca-diaria';

export type TipoEventoCalendario = 'EXPIRACAO' | 'MENSALIDADE';
export type FiltroTipoCalendario = 'TODOS' | 'EXPIRACAO' | 'MENSALIDADE';
export type UrgenciaEventoCalendario = 'ATRASADO' | 'HOJE' | 'FUTURO';

export interface EventoCalendario {
  id: string;
  tipo: TipoEventoCalendario;
  data: string;
  clienteId: number;
  clienteNome: string;
  telefone: string;
  rotulo: string;
  detalhe?: string;
  valor?: number;
  cortesia: boolean;
  urgencia: UrgenciaEventoCalendario;
  mensalidadeId?: number;
}

/** Um cliente por dia — une expiração e mensalidade quando caem na mesma data. */
export interface ClienteCalendarioDia {
  id: string;
  data: string;
  clienteId: number;
  clienteNome: string;
  telefone: string;
  cortesia: boolean;
  urgencia: UrgenciaEventoCalendario;
  temExpiracao: boolean;
  temMensalidade: boolean;
  planoNome?: string;
  referenciaMensalidade?: string;
  valorMensalidade?: number;
  mensalidadeId?: number;
}

export interface CelulaCalendario {
  data: string | null;
  dia: number | null;
  mesAtual: boolean;
  hoje: boolean;
  clientes: ClienteCalendarioDia[];
}

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function rotulosDiasSemanaCalendario(): readonly string[] {
  return DIAS_SEMANA;
}

export function chaveDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function chaveDataIso(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return chaveDataLocal(parsed);
}

export function urgenciaPorData(iso: string): UrgenciaEventoCalendario {
  const dias = calcularDias(iso);
  if (dias < 0) return 'ATRASADO';
  if (dias === 0) return 'HOJE';
  return 'FUTURO';
}

export function montarEventosExpiracao(clientes: Cliente[]): EventoCalendario[] {
  return clientes
    .filter(
      (cliente) =>
        !!cliente.expiraEm && clienteApareceEmVencimentos(cliente)
    )
    .map((cliente) => {
      const data = cliente.expiraEm!;
      return {
        id: `exp-${cliente.id}-${chaveDataIso(data)}`,
        tipo: 'EXPIRACAO' as const,
        data: chaveDataIso(data),
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        telefone: cliente.telefone,
        rotulo: 'Expira assinatura',
        detalhe: cliente.plano?.nome,
        cortesia: clienteEhCortesia(cliente),
        urgencia: urgenciaPorData(data),
      };
    })
    .filter((evento) => evento.data.length > 0);
}

export function montarEventosMensalidade(mensalidades: Mensalidade[]): EventoCalendario[] {
  return mensalidades
    .filter(
      (m) =>
        m.status === 'PENDENTE' && clienteParticipaCobrancas(m.cliente)
    )
    .map((m) => {
      const data = m.vencimento;
      return {
        id: `men-${m.id}`,
        tipo: 'MENSALIDADE' as const,
        data: chaveDataIso(data),
        clienteId: m.clienteId,
        clienteNome: m.cliente?.nome ?? 'Cliente',
        telefone: m.cliente?.telefone ?? '',
        rotulo: 'Vence mensalidade',
        detalhe: m.referencia,
        valor: m.valor,
        cortesia: clienteEhCortesia(m.cliente),
        urgencia: urgenciaPorData(data),
        mensalidadeId: m.id,
      };
    })
    .filter((evento) => evento.data.length > 0);
}

export function filtrarEventosCalendario(
  eventos: EventoCalendario[],
  filtro: FiltroTipoCalendario
): EventoCalendario[] {
  if (filtro === 'TODOS') return eventos;
  return eventos.filter((evento) => evento.tipo === filtro);
}

function piorUrgencia(
  a: UrgenciaEventoCalendario,
  b: UrgenciaEventoCalendario
): UrgenciaEventoCalendario {
  const peso: Record<UrgenciaEventoCalendario, number> = {
    ATRASADO: 0,
    HOJE: 1,
    FUTURO: 2,
  };
  return peso[a] <= peso[b] ? a : b;
}

export function agruparClientesPorDia(
  eventos: EventoCalendario[]
): Map<string, ClienteCalendarioDia[]> {
  const mapa = new Map<string, Map<number, ClienteCalendarioDia>>();

  for (const evento of eventos) {
    const porCliente = mapa.get(evento.data) ?? new Map<number, ClienteCalendarioDia>();
    const existente = porCliente.get(evento.clienteId);

    if (!existente) {
      porCliente.set(evento.clienteId, {
        id: `${evento.data}-${evento.clienteId}`,
        data: evento.data,
        clienteId: evento.clienteId,
        clienteNome: evento.clienteNome,
        telefone: evento.telefone,
        cortesia: evento.cortesia,
        urgencia: evento.urgencia,
        temExpiracao: evento.tipo === 'EXPIRACAO',
        temMensalidade: evento.tipo === 'MENSALIDADE',
        planoNome: evento.tipo === 'EXPIRACAO' ? evento.detalhe : undefined,
        referenciaMensalidade:
          evento.tipo === 'MENSALIDADE' ? evento.detalhe : undefined,
        valorMensalidade: evento.tipo === 'MENSALIDADE' ? evento.valor : undefined,
        mensalidadeId: evento.mensalidadeId,
      });
    } else {
      existente.urgencia = piorUrgencia(existente.urgencia, evento.urgencia);
      existente.cortesia = existente.cortesia || evento.cortesia;
      if (!existente.telefone && evento.telefone) {
        existente.telefone = evento.telefone;
      }
      if (evento.tipo === 'EXPIRACAO') {
        existente.temExpiracao = true;
        existente.planoNome = evento.detalhe;
      }
      if (evento.tipo === 'MENSALIDADE') {
        existente.temMensalidade = true;
        existente.referenciaMensalidade = evento.detalhe;
        existente.valorMensalidade = evento.valor;
        existente.mensalidadeId = evento.mensalidadeId;
      }
    }

    mapa.set(evento.data, porCliente);
  }

  const resultado = new Map<string, ClienteCalendarioDia[]>();
  for (const [data, porCliente] of mapa.entries()) {
    resultado.set(
      data,
      [...porCliente.values()].sort((a, b) =>
        a.clienteNome.localeCompare(b.clienteNome, 'pt-BR')
      )
    );
  }

  return resultado;
}

export function rotuloClienteCalendario(cliente: ClienteCalendarioDia): string {
  if (cliente.temExpiracao && cliente.temMensalidade) {
    return 'Renovação do mês — assinatura e cobrança';
  }
  if (cliente.temExpiracao) {
    return 'Expira a assinatura IPTV';
  }
  return 'Vence mensalidade pendente';
}

export function contagemClientesNoMes(
  clientesPorDia: Map<string, ClienteCalendarioDia[]>,
  ano: number,
  mes: number
): number {
  const ids = new Set<number>();
  for (const [data, clientes] of clientesPorDia.entries()) {
    const parsed = new Date(`${data}T12:00:00`);
    if (parsed.getFullYear() !== ano || parsed.getMonth() !== mes) continue;
    for (const cliente of clientes) {
      ids.add(cliente.clienteId);
    }
  }
  return ids.size;
}

export function agruparEventosPorDia(
  eventos: EventoCalendario[]
): Map<string, EventoCalendario[]> {
  const mapa = new Map<string, EventoCalendario[]>();

  for (const evento of eventos) {
    const lista = mapa.get(evento.data) ?? [];
    lista.push(evento);
    mapa.set(evento.data, lista);
  }

  for (const [chave, lista] of mapa.entries()) {
    mapa.set(
      chave,
      [...lista].sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'))
    );
  }

  return mapa;
}

export function montarGradeMes(
  ano: number,
  mes: number,
  clientesPorDia: Map<string, ClienteCalendarioDia[]>
): CelulaCalendario[] {
  const hoje = chaveDataLocal(new Date());
  const primeiro = new Date(ano, mes, 1);
  const offset = (primeiro.getDay() + 6) % 7;
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: CelulaCalendario[] = [];

  for (let i = 0; i < offset; i++) {
    celulas.push({
      data: null,
      dia: null,
      mesAtual: false,
      hoje: false,
      clientes: [],
    });
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = chaveDataLocal(new Date(ano, mes, dia));
    celulas.push({
      data,
      dia,
      mesAtual: true,
      hoje: data === hoje,
      clientes: clientesPorDia.get(data) ?? [],
    });
  }

  while (celulas.length % 7 !== 0) {
    celulas.push({
      data: null,
      dia: null,
      mesAtual: false,
      hoje: false,
      clientes: [],
    });
  }

  while (celulas.length < 42) {
    celulas.push({
      data: null,
      dia: null,
      mesAtual: false,
      hoje: false,
      clientes: [],
    });
  }

  return celulas;
}

export function rotuloMesAno(ano: number, mes: number): string {
  const rotulo = new Date(ano, mes, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

export function rotuloDiaSelecionado(data: string): string {
  const parsed = new Date(`${data}T12:00:00`);
  const texto = parsed.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function contagemEventosNoMes(
  eventos: EventoCalendario[],
  ano: number,
  mes: number
): { expiracoes: number; mensalidades: number } {
  let expiracoes = 0;
  let mensalidades = 0;

  for (const evento of eventos) {
    const parsed = new Date(`${evento.data}T12:00:00`);
    if (parsed.getFullYear() !== ano || parsed.getMonth() !== mes) {
      continue;
    }
    if (evento.tipo === 'EXPIRACAO') expiracoes++;
    else mensalidades++;
  }

  return { expiracoes, mensalidades };
}
