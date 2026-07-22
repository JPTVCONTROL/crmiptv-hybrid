import { Router } from 'express';
import { painelCreditoController } from '../controllers/painelCreditoController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get(
  '/consumos',
  asyncHandler((req, res) => painelCreditoController.listarConsumos(req, res))
);
router.get('/', asyncHandler((req, res) => painelCreditoController.listar(req, res)));
router.post('/', asyncHandler((req, res) => painelCreditoController.criar(req, res)));
router.put(
  '/:id',
  asyncHandler((req, res) => painelCreditoController.atualizar(req, res))
);
router.delete(
  '/:id',
  asyncHandler((req, res) => painelCreditoController.excluir(req, res))
);
router.put(
  '/:id/saldo',
  asyncHandler((req, res) => painelCreditoController.definirSaldo(req, res))
);
router.post(
  '/:id/creditos',
  asyncHandler((req, res) => painelCreditoController.adicionarCreditos(req, res))
);

export default router;
