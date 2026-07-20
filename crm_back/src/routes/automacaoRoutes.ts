import { Router } from 'express';
import { automacaoController } from '../controllers/automacaoController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => automacaoController.obterPainel(req, res)));
router.put('/', asyncHandler((req, res) => automacaoController.salvar(req, res)));
router.post(
  '/executar',
  asyncHandler((req, res) => automacaoController.executar(req, res))
);

export default router;
