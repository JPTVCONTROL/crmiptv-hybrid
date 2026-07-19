import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CRM JPTV API online' });
});

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  const modo = env.nodeEnv === 'production' ? 'produção' : 'desenvolvimento';
  console.log(`CRM JPTV API (${modo}) → http://localhost:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/health`);
});

export default app;
