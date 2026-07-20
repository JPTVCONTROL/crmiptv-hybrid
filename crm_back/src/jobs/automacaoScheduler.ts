import cron from 'node-cron';
import { env } from '../config/env.js';
import { automacaoRepository } from '../repositories/automacaoRepository.js';
import { automacaoService } from '../services/automacaoService.js';

let tarefaAtiva = false;

export function iniciarAgendadorAutomacao(): void {
  if (!env.automacaoSchedulerAtivo) {
    console.log('[Automação] Agendador interno desativado (AUTOMACAO_SCHEDULER=false).');
    return;
  }

  cron.schedule('* * * * *', () => {
    void executarSeHorario();
  });

  console.log('[Automação] Agendador ativo — verifica horários a cada minuto.');
}

async function executarSeHorario(): Promise<void> {
  if (tarefaAtiva) return;

  try {
    tarefaAtiva = true;
    const config = await automacaoRepository.findOrCreateConfig();
    const horario = automacaoService.deveExecutarAgora(config);

    if (!horario) return;

    const resultado = await automacaoService.executar(false);
    console.log(
      `[Automação ${horario}] enviados=${resultado.enviados} falhas=${resultado.falhas} ignorados=${resultado.ignorados}`
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return;
    }
    console.error('[Automação] Erro no agendador:', error);
  } finally {
    tarefaAtiva = false;
  }
}
