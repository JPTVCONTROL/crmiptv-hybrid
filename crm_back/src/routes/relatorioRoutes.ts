import { Router } from 'express';
import { relatorioController } from '../controllers/relatorioController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get(
  '/resumo',
  asyncHandler((req, res) => relatorioController.resumo(req, res))
);

export default router;
