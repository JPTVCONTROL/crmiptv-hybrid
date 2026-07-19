import { Router } from 'express';
import { planoController } from '../controllers/planoController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => planoController.listar(req, res)));
router.get('/:id/clientes', asyncHandler((req, res) => planoController.listarClientes(req, res)));
router.get('/:id', asyncHandler((req, res) => planoController.buscarPorId(req, res)));
router.post('/', asyncHandler((req, res) => planoController.criar(req, res)));
router.put('/:id', asyncHandler((req, res) => planoController.atualizar(req, res)));
router.put(
  '/:id/reajustar-clientes',
  asyncHandler((req, res) => planoController.reajustarClientes(req, res))
);
router.delete('/:id', asyncHandler((req, res) => planoController.excluir(req, res)));

export default router;
