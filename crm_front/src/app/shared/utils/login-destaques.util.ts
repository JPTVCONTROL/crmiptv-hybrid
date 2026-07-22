export type TomDestaqueLogin =
  | 'violet'
  | 'rose'
  | 'emerald'
  | 'amber'
  | 'cyan'
  | 'blue'
  | 'yellow'
  | 'red';

export interface DestaqueLogin {
  icon: string;
  titulo: string;
  descricao: string;
  tom: TomDestaqueLogin;
}

/** Recursos reais do CRM — linguagem simples, sem termos técnicos. */
export const DESTAQUES_LOGIN: DestaqueLogin[] = [
  {
    icon: 'stats-chart-outline',
    tom: 'violet',
    titulo: 'Painel do dia',
    descricao: 'Veja quanto entrou e quem precisa de atenção hoje.',
  },
  {
    icon: 'funnel-outline',
    tom: 'rose',
    titulo: 'Cobranças',
    descricao: 'Saiba quem está atrasado e envie lembretes na ordem certa.',
  },
  {
    icon: 'people-outline',
    tom: 'cyan',
    titulo: 'Clientes',
    descricao: 'Cadastre, consulte planos e acompanhe cada assinante.',
  },
  {
    icon: 'wallet-outline',
    tom: 'amber',
    titulo: 'Pagamentos',
    descricao: 'Registre quem pagou e mantenha as contas em dia.',
  },
  {
    icon: 'megaphone-outline',
    tom: 'blue',
    titulo: 'Avisos em massa',
    descricao: 'Envie promoções ou comunicados para grupos de clientes.',
  },
  {
    icon: 'bar-chart-outline',
    tom: 'yellow',
    titulo: 'Resultados',
    descricao: 'Confira quanto faturou e se as cobranças estão dando certo.',
  },
  {
    icon: 'shield-checkmark-outline',
    tom: 'red',
    titulo: 'Backup e app',
    descricao: 'Guarde seus dados com segurança e atualize o app no tablet.',
  },
];
