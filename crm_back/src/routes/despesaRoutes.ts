import { Router } from 'express';
import { despesaController } from '../controllers/despesaController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/resumo', asyncHandler((req, res) => despesaController.resumo(req, res)));
router.get('/', asyncHandler((req, res) => despesaController.listar(req, res)));
router.get('/:id', asyncHandler((req, res) => despesaController.buscarPorId(req, res)));
router.post('/', asyncHandler((req, res) => despesaController.criar(req, res)));
router.put('/:id', asyncHandler((req, res) => despesaController.atualizar(req, res)));
router.delete('/:id', asyncHandler((req, res) => despesaController.excluir(req, res)));

export default router;
