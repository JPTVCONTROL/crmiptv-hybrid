import { Router } from 'express';
import { campanhaController } from '../controllers/campanhaController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => campanhaController.listar(req, res)));
router.get('/:id', asyncHandler((req, res) => campanhaController.buscarPorId(req, res)));
router.post('/', asyncHandler((req, res) => campanhaController.criar(req, res)));
router.put('/:id', asyncHandler((req, res) => campanhaController.atualizar(req, res)));
router.delete('/:id', asyncHandler((req, res) => campanhaController.excluir(req, res)));
router.post(
  '/:id/envios',
  asyncHandler((req, res) => campanhaController.registrarEnvios(req, res))
);

export default router;
