import dotenv from 'dotenv';

dotenv.config();

const DEFAULTS_INSEGUROS = {
  jwtSecret: 'crm-jptv-dev-secret',
  adminPassword: 'admin123',
  webhookToken: 'crm-jptv-webhook',
};

function parseCorsOrigins(valor?: string): string[] {
  if (!valor?.trim()) {
    return [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'capacitor://localhost',
      'http://localhost',
    ];
  }

  return valor
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || DEFAULTS_INSEGUROS.jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@jptv.com.br',
  adminPassword: process.env.ADMIN_PASSWORD || DEFAULTS_INSEGUROS.adminPassword,
  adminNome: process.env.ADMIN_NOME || 'Administrador',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '',
  whatsappWebhookVerifyToken:
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ||
    DEFAULTS_INSEGUROS.webhookToken,
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET?.trim() || '',
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
  automacaoSchedulerAtivo: process.env.AUTOMACAO_SCHEDULER !== 'false',
};

export function validarConfiguracaoProducao(): void {
  if (env.nodeEnv !== 'production') {
    return;
  }

  const problemas: string[] = [];

  if (env.jwtSecret === DEFAULTS_INSEGUROS.jwtSecret) {
    problemas.push('JWT_SECRET está com valor padrão inseguro');
  }

  if (env.adminPassword === DEFAULTS_INSEGUROS.adminPassword) {
    problemas.push('ADMIN_PASSWORD está com valor padrão inseguro');
  }

  if (env.whatsappWebhookVerifyToken === DEFAULTS_INSEGUROS.webhookToken) {
    problemas.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN está com valor padrão');
  }

  if (problemas.length > 0) {
    throw new Error(
      `Configuração de produção inválida:\n- ${problemas.join('\n- ')}`
    );
  }
}
