import { Router } from 'express';
import clienteRoutes from './clienteRoutes.js';
import mensalidadeRoutes from './mensalidadeRoutes.js';
import aplicativoRoutes from './aplicativoRoutes.js';
import configuracaoRoutes from './configuracaoRoutes.js';

const router = Router();

router.use('/clientes', clienteRoutes);
router.use('/mensalidades', mensalidadeRoutes);
router.use('/aplicativos', aplicativoRoutes);
router.use('/configuracoes', configuracaoRoutes);

export default router;
