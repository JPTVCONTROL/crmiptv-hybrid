import { Router } from 'express';
import { configuracaoController } from '../controllers/configuracaoController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => configuracaoController.obter(req, res)));
router.put('/', asyncHandler((req, res) => configuracaoController.salvar(req, res)));

export default router;
