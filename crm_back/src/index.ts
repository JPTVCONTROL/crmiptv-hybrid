import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { env, validarConfiguracaoProducao } from './config/env.js';
import apiRoutes from './routes/index.js';
import whatsappWebhookRoutes from './routes/whatsappWebhookRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { listarIpsRedeLocal } from './utils/networkHelpers.js';
import { iniciarAgendadorAutomacao } from './jobs/automacaoScheduler.js';

validarConfiguracaoProducao();

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CRM JPTV API online' });
});

app.use(
  '/api/webhook/whatsapp',
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
  whatsappWebhookRoutes
);

app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRoutes);

const wwwMobile = path.resolve(process.cwd(), '../crm_front/www');
const versionJsonMobile = path.join(wwwMobile, 'version.json');

if (fs.existsSync(wwwMobile)) {
  app.get('/app/version.json', (_req, res, next) => {
    if (!fs.existsSync(versionJsonMobile)) {
      res.status(503).json({
        success: false,
        message: 'App mobile nao publicado. No PC execute: npm run app:publish',
      });
      return;
    }

    next();
  });

  app.use(
    '/app',
    express.static(wwwMobile, {
      maxAge: 0,
      etag: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html') || filePath.endsWith('version.json')) {
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    })
  );
  app.use('/app', (req, res, next) => {
    if (req.path.endsWith('.json')) {
      res.status(404).json({
        success: false,
        message: 'Arquivo nao encontrado. No PC execute: npm run app:publish',
      });
      return;
    }

    res.sendFile(path.join(wwwMobile, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });
  console.log(`App mobile (OTA): http://localhost:${env.port}/app/`);

  const indexHtml = path.join(wwwMobile, 'index.html');
  if (fs.existsSync(indexHtml)) {
    const html = fs.readFileSync(indexHtml, 'utf8');
    if (!html.includes('base href="/app/"')) {
      console.warn(
        'AVISO: www/index.html sem base href="/app/". No PC execute: npm run app:publish (nao use npm run build).'
      );
    }
  }

  if (!fs.existsSync(versionJsonMobile)) {
    console.warn(
      'AVISO: crm_front/www/version.json ausente. No PC execute: npm run app:publish'
    );
  }
}

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
