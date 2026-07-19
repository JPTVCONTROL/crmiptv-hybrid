import { Router } from 'express';
import clienteRoutes from './clienteRoutes.js';
import mensalidadeRoutes from './mensalidadeRoutes.js';
import aplicativoRoutes from './aplicativoRoutes.js';
import planoRoutes from './planoRoutes.js';
import dispositivoRoutes from './dispositivoRoutes.js';
import configuracaoRoutes from './configuracaoRoutes.js';
import authRoutes from './authRoutes.js';
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

export default router;
