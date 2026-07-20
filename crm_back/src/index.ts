import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import whatsappWebhookRoutes from './routes/whatsappWebhookRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { listarIpsRedeLocal } from './utils/networkHelpers.js';
import { iniciarAgendadorAutomacao } from './jobs/automacaoScheduler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CRM JPTV API online' });
});

app.use('/api/webhook/whatsapp', whatsappWebhookRoutes);

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, '0.0.0.0', () => {
  const modo = env.nodeEnv === 'production' ? 'produção' : 'desenvolvimento';
  console.log(`CRM JPTV API (${modo}) → http://localhost:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/health`);
  console.log(`API: http://localhost:${env.port}/api`);

  const ipsRede = listarIpsRedeLocal();
  if (ipsRede.length > 0) {
    console.log('Rede local (tablet/APK na mesma Wi-Fi):');
    for (const ip of ipsRede) {
      console.log(`  http://${ip}:${env.port}/health`);
      console.log(`  http://${ip}:${env.port}/api`);
    }
  } else {
    console.log('Rede local: nenhum IPv4 detectado (verifique Wi-Fi/Ethernet).');
  }

  iniciarAgendadorAutomacao();
});

export default app;
