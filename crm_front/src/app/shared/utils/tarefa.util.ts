import { Tarefa, FiltroListaTarefa } from '../../core/models';
import { calcularDias, dataIsoParaDateUtc } from './formatters';

export function dataHojeIso(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function tarefaEstaAtrasada(tarefa: Tarefa): boolean {
  if (tarefa.concluida) return false;
  return calcularDias(tarefa.vencimentoEm) < 0;
}

export function tarefaEhHoje(tarefa: Tarefa): boolean {
  if (tarefa.concluida) return false;
  return calcularDias(tarefa.vencimentoEm) === 0;
}

export function rotuloPrazoTarefa(vencimentoEm: string, concluida = false): string {
  if (concluida) {
    return 'Concluída';
  }

  const dias = calcularDias(vencimentoEm);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  if (dias === -1) return 'Ontem';
  if (dias > 1) return `Em ${dias} dias`;
  return `${Math.abs(dias)} dia(s) atrasada`;
}

export function classePrazoTarefa(tarefa: Tarefa): string {
  if (tarefa.concluida) {
    return 'text-slate-500';
  }

  const dias = calcularDias(tarefa.vencimentoEm);
  if (dias < 0) return 'text-red-300';
  if (dias === 0) return 'text-amber-300';
  if (dias === 1) return 'text-orange-200';
  return 'text-slate-400';
}

export function formatarDataTarefa(vencimentoEm: string): string {
  const data = dataIsoParaDateUtc(vencimentoEm);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function filtrarTarefas(
  tarefas: Tarefa[],
  filtro: FiltroListaTarefa
): Tarefa[] {
  switch (filtro) {
    case 'CONCLUIDAS':
      return tarefas.filter((item) => item.concluida);
    case 'TODAS':
      return tarefas;
    case 'HOJE':
      return tarefas.filter((item) => !item.concluida && tarefaEhHoje(item));
    case 'ATRASADAS':
      return tarefas.filter((item) => tarefaEstaAtrasada(item));
    case 'PENDENTES':
    default:
      return tarefas.filter((item) => !item.concluida);
  }
}

export function contagemFiltroTarefa(
  tarefas: Tarefa[],
  filtro: FiltroListaTarefa
): number {
  return filtrarTarefas(tarefas, filtro).length;
}

export const OPCOES_FILTRO_TAREFA: Array<{ valor: FiltroListaTarefa; rotulo: string }> =
  [
    { valor: 'PENDENTES', rotulo: 'Pendentes' },
    { valor: 'HOJE', rotulo: 'Hoje' },
    { valor: 'ATRASADAS', rotulo: 'Atrasadas' },
    { valor: 'CONCLUIDAS', rotulo: 'Concluídas' },
    { valor: 'TODAS', rotulo: 'Todas' },
  ];

export function queryParamParaFiltroTarefa(
  valor: string | null | undefined
): FiltroListaTarefa {
  switch ((valor ?? '').toUpperCase()) {
    case 'HOJE':
      return 'HOJE';
    case 'ATRASADAS':
      return 'ATRASADAS';
    case 'CONCLUIDAS':
      return 'CONCLUIDAS';
    case 'TODAS':
      return 'TODAS';
    default:
      return 'PENDENTES';
  }
}
