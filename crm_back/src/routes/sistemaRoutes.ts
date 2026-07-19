import { Router } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { sistemaController } from '../controllers/sistemaController.js';

const router = Router();

router.get('/backup', (req, res) => void sistemaController.baixarBackup(req, res));
router.post(
  '/sincronizar-cobrancas',
  asyncHandler((req, res) => sistemaController.sincronizarCobrancas(req, res))
);

export default router;
