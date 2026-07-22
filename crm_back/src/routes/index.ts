import { Router } from 'express';
import clienteRoutes from './clienteRoutes.js';
import mensalidadeRoutes from './mensalidadeRoutes.js';
import aplicativoRoutes from './aplicativoRoutes.js';
import planoRoutes from './planoRoutes.js';
import dispositivoRoutes from './dispositivoRoutes.js';
import configuracaoRoutes from './configuracaoRoutes.js';
import sistemaRoutes from './sistemaRoutes.js';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import relatorioRoutes from './relatorioRoutes.js';
import campanhaRoutes from './campanhaRoutes.js';
import tarefaRoutes from './tarefaRoutes.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use('/auth', authRoutes);

router.use(authenticate);

router.use('/clientes', clienteRoutes);
router.use('/mensalidades', mensalidadeRoutes);
router.use('/aplicativos', aplicativoRoutes);
router.use('/dispositivos', dispositivoRoutes);
router.use('/planos', planoRoutes);
router.use('/configuracoes', configuracaoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/relatorios', relatorioRoutes);
router.use('/campanhas', campanhaRoutes);
router.use('/tarefas', tarefaRoutes);
router.use('/sistema', sistemaRoutes);

export default router;
