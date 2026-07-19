import { Router } from 'express';
import { aplicativoController } from '../controllers/aplicativoController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => aplicativoController.listar(req, res)));
router.get('/:id/clientes', asyncHandler((req, res) => aplicativoController.listarClientes(req, res)));
router.get('/:id', asyncHandler((req, res) => aplicativoController.buscarPorId(req, res)));
router.post('/', asyncHandler((req, res) => aplicativoController.criar(req, res)));
router.put('/:id', asyncHandler((req, res) => aplicativoController.atualizar(req, res)));
router.delete('/:id', asyncHandler((req, res) => aplicativoController.excluir(req, res)));

export default router;
