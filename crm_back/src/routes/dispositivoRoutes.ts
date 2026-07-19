import { Router } from 'express';
import { dispositivoController } from '../controllers/dispositivoController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => dispositivoController.listar(req, res)));
router.get('/:id/clientes', asyncHandler((req, res) => dispositivoController.listarClientes(req, res)));
router.get('/:id', asyncHandler((req, res) => dispositivoController.buscarPorId(req, res)));
router.post('/', asyncHandler((req, res) => dispositivoController.criar(req, res)));
router.put('/:id', asyncHandler((req, res) => dispositivoController.atualizar(req, res)));
router.delete('/:id', asyncHandler((req, res) => dispositivoController.excluir(req, res)));

export default router;
