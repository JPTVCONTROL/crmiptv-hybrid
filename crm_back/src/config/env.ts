import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'crm-jptv-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@jptv.com.br',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  adminNome: process.env.ADMIN_NOME || 'Administrador',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '',
  whatsappWebhookVerifyToken:
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || 'crm-jptv-webhook',
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
  automacaoSchedulerAtivo: process.env.AUTOMACAO_SCHEDULER !== 'false',
};
