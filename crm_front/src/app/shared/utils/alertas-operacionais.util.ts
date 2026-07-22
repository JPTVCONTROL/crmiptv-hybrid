import { AlertaOperacional } from '../../core/models';

export function iconeAlertaOperacional(alerta: AlertaOperacional): string {
  switch (alerta.tipo) {
    case 'CADASTRO_SEM_TELEFONE':
      return 'call-outline';
    case 'CADASTRO_SEM_PLANO':
      return 'layers-outline';
    case 'CADASTRO_SEM_VALOR':
      return 'cash-outline';
    case 'CADASTRO_SEM_EXPIRACAO':
      return 'calendar-outline';
    case 'CADASTRO_SEM_CREDENCIAIS':
      return 'key-outline';
    case 'CADASTRO_SEM_APLICATIVO':
      return 'apps-outline';
    case 'CADASTRO_SEM_MAC':
      return 'hardware-chip-outline';
    case 'CADASTRO_INCOMPLETO':
      return 'document-text-outline';
    case 'ROTINA_PENDENTE':
      return 'send-outline';
    case 'VENCE_HOJE':
      return 'calendar-outline';
    case 'SEM_TELEFONE':
      return 'call-outline';
    case 'NAO_CONTACTADO':
      return 'chatbubble-ellipses-outline';
    case 'EXPIRADO_SEM_MENSALIDADE':
      return 'alert-circle-outline';
    case 'ROTINA_CONCLUIDA':
      return 'checkmark-circle-outline';
    case 'TAREFAS_ATRASADAS':
      return 'alert-circle-outline';
    case 'TAREFAS_HOJE':
      return 'checkbox-outline';
    default:
      return 'notifications-outline';
  }
}

export function classesAlertaOperacional(
  alerta: AlertaOperacional
): Record<string, boolean> {
  switch (alerta.tipo) {
    case 'CADASTRO_SEM_TELEFONE':
    case 'CADASTRO_SEM_CREDENCIAIS':
    case 'CADASTRO_SEM_MAC':
    case 'NAO_CONTACTADO':
    case 'EXPIRADO_SEM_MENSALIDADE':
      return {
        'crm-dash-alerta--red': true,
      };
    case 'CADASTRO_SEM_PLANO':
    case 'CADASTRO_SEM_VALOR':
    case 'CADASTRO_SEM_EXPIRACAO':
    case 'CADASTRO_SEM_APLICATIVO':
    case 'CADASTRO_INCOMPLETO':
    case 'VENCE_HOJE':
    case 'SEM_TELEFONE':
      return {
        'crm-dash-alerta--amber': true,
      };
    case 'ROTINA_PENDENTE':
      return {
        'crm-dash-alerta--violet': true,
      };
    case 'TAREFAS_ATRASADAS':
      return {
        'crm-dash-alerta--red': true,
      };
    case 'TAREFAS_HOJE':
      return {
        'crm-dash-alerta--amber': true,
      };
    case 'ROTINA_CONCLUIDA':
      return {
        'crm-dash-alerta--green': true,
      };
    default:
      return {
        'crm-dash-alerta--neutral': true,
      };
  }
}

export function prioridadeAlerta(alerta: AlertaOperacional): number {
  const ordem: Record<string, number> = {
    NAO_CONTACTADO: 0,
    TAREFAS_ATRASADAS: 1,
    VENCE_HOJE: 2,
    TAREFAS_HOJE: 3,
    ROTINA_PENDENTE: 4,
    EXPIRADO_SEM_MENSALIDADE: 5,
    CADASTRO_SEM_TELEFONE: 6,
    CADASTRO_SEM_CREDENCIAIS: 7,
    CADASTRO_INCOMPLETO: 8,
    CADASTRO_SEM_MAC: 9,
    CADASTRO_SEM_PLANO: 10,
    CADASTRO_SEM_VALOR: 11,
    CADASTRO_SEM_EXPIRACAO: 12,
    CADASTRO_SEM_APLICATIVO: 13,
    SEM_TELEFONE: 14,
    ROTINA_CONCLUIDA: 99,
  };

  return ordem[alerta.tipo] ?? 50;
}

export function ordenarAlertasOperacionais(
  alertas: AlertaOperacional[]
): AlertaOperacional[] {
  return [...alertas].sort(
    (a, b) => prioridadeAlerta(a) - prioridadeAlerta(b)
  );
}
