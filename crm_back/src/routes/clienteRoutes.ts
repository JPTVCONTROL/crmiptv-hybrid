import { Router } from 'express';
import { clienteController } from '../controllers/clienteController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => clienteController.listar(req, res)));
router.get('/:id', asyncHandler((req, res) => clienteController.buscarPorId(req, res)));
router.post('/', asyncHandler((req, res) => clienteController.criar(req, res)));
router.put('/:id', asyncHandler((req, res) => clienteController.atualizar(req, res)));
router.delete('/:id', asyncHandler((req, res) => clienteController.excluir(req, res)));

export default router;
