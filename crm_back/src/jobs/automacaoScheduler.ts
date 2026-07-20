import cron from 'node-cron';
import { env } from '../config/env.js';
import { automacaoService } from '../services/automacaoService.js';

let tarefaAtiva = false;

export function iniciarAgendadorAutomacao(): void {
  if (!env.automacaoSchedulerAtivo) {
    console.log('[Automação] Agendador interno desativado (AUTOMACAO_SCHEDULER=false).');
    return;
  }

  cron.schedule('* * * * *', () => {
    void executarRotinaManha();
  });

  console.log(
    '[Automação] Agendador ativo — fila matinal 08:00–09:00 (horários alternados por cliente).'
  );
}

async function executarRotinaManha(): Promise<void> {
  if (tarefaAtiva) return;

  try {
    tarefaAtiva = true;
    const resultado = await automacaoService.processarRotinaManha();

    if (resultado && (resultado.enviados > 0 || resultado.falhas > 0)) {
      console.log(
        `[Automação ${resultado.horario}] enviados=${resultado.enviados} falhas=${resultado.falhas}`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return;
    }
    console.error('[Automação] Erro no agendador:', error);
  } finally {
    tarefaAtiva = false;
  }
}
