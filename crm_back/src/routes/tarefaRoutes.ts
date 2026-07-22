import { Router } from 'express';
import { tarefaController } from '../controllers/tarefaController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => tarefaController.listar(req, res)));
router.get('/:id', asyncHandler((req, res) => tarefaController.buscarPorId(req, res)));
router.post('/', asyncHandler((req, res) => tarefaController.criar(req, res)));
router.put('/:id', asyncHandler((req, res) => tarefaController.atualizar(req, res)));
router.put('/:id/concluir', asyncHandler((req, res) => tarefaController.concluir(req, res)));
router.put('/:id/reabrir', asyncHandler((req, res) => tarefaController.reabrir(req, res)));
router.delete('/:id', asyncHandler((req, res) => tarefaController.excluir(req, res)));

export default router;
