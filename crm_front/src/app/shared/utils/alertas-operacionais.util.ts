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
    VENCE_HOJE: 1,
    ROTINA_PENDENTE: 2,
    EXPIRADO_SEM_MENSALIDADE: 3,
    CADASTRO_SEM_TELEFONE: 4,
    CADASTRO_SEM_CREDENCIAIS: 5,
    CADASTRO_INCOMPLETO: 6,
    CADASTRO_SEM_MAC: 7,
    CADASTRO_SEM_PLANO: 8,
    CADASTRO_SEM_VALOR: 9,
    CADASTRO_SEM_EXPIRACAO: 10,
    CADASTRO_SEM_APLICATIVO: 11,
    SEM_TELEFONE: 12,
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
