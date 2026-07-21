import { Cliente } from '../../core/models';
import { calcularDias, resolverStatusCliente, StatusCliente } from './formatters';
import { clienteEhCortesia } from './cobranca-diaria';

export type SegmentoPublicoCampanha =
  | 'TODOS'
  | 'ATIVOS'
  | 'VENCENDO'
  | 'ATRASADOS'
  | 'INATIVOS'
  | 'SOMENTE_CONTATO';

export interface FiltroPublicoCampanha {
  segmento: SegmentoPublicoCampanha;
  planoId: number | null;
  incluirCortesia: boolean;
  diasAntecedenciaVencendo: number;
}

export const ROTULOS_SEGMENTO_PUBLICO: Record<SegmentoPublicoCampanha, string> = {
  TODOS: 'Todos',
  ATIVOS: 'Ativos',
  VENCENDO: 'Vencendo',
  ATRASADOS: 'Atrasados',
  INATIVOS: 'Inativos',
  SOMENTE_CONTATO: 'Somente contato',
};

export function rotuloSegmentoPublico(segmento: SegmentoPublicoCampanha): string {
  return ROTULOS_SEGMENTO_PUBLICO[segmento] ?? segmento;
}

export function rotuloStatusPublico(status: StatusCliente): string {
  switch (status) {
    case 'ATIVO':
      return 'Ativo';
    case 'ATRASADO':
      return 'Atrasado';
    case 'INATIVO':
      return 'Inativo';
    default:
      return status;
  }
}

export function clienteVencendoEmBreve(
  expiraEm: string | null | undefined,
  diasAntecedencia: number
): boolean {
  if (!expiraEm) return false;
  const dias = calcularDias(expiraEm);
  return dias >= 0 && dias <= diasAntecedencia;
}

export function clientePassouFiltroPublico(
  cliente: Cliente,
  filtro: FiltroPublicoCampanha
): boolean {
  if (!filtro.incluirCortesia && clienteEhCortesia(cliente)) {
    return false;
  }

  if (cliente.incluirCampanhas === false) {
    return false;
  }

  if (filtro.planoId !== null && cliente.planoId !== filtro.planoId) {
    return false;
  }

  const status = resolverStatusCliente(cliente);

  switch (filtro.segmento) {
    case 'TODOS':
      return true;
    case 'ATIVOS':
      return status === 'ATIVO';
    case 'VENCENDO':
      return (
        status === 'ATIVO' &&
        clienteVencendoEmBreve(cliente.expiraEm, filtro.diasAntecedenciaVencendo)
      );
    case 'ATRASADOS':
      return status === 'ATRASADO';
    case 'INATIVOS':
      return status === 'INATIVO';
    case 'SOMENTE_CONTATO':
      return cliente.somenteContato === true;
    default:
      return true;
  }
}

export function contarClientesPublico(
  clientes: Cliente[],
  filtro: FiltroPublicoCampanha
): number {
  return clientes.filter((cliente) => clientePassouFiltroPublico(cliente, filtro)).length;
}
