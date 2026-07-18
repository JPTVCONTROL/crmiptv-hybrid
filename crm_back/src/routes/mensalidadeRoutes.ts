import { Router } from 'express';
import { mensalidadeController } from '../controllers/mensalidadeController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => mensalidadeController.listar(req, res)));
router.put('/:id/pagar', asyncHandler((req, res) => mensalidadeController.registrarPagamento(req, res)));

export default router;
