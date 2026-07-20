import { Router } from 'express';
import { clienteController } from '../controllers/clienteController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler((req, res) => clienteController.listar(req, res)));
router.post(
  '/importar',
  asyncHandler((req, res) => clienteController.importar(req, res))
);
router.get('/:id', asyncHandler((req, res) => clienteController.buscarPorId(req, res)));
router.post('/', asyncHandler((req, res) => clienteController.criar(req, res)));
router.put(
  '/:id/incluir-cobrancas',
  asyncHandler((req, res) => clienteController.definirInclusaoCobrancas(req, res))
);
router.put(
  '/:id/cortesia',
  asyncHandler((req, res) => clienteController.definirCortesia(req, res))
);
router.put(
  '/:id/atividade',
  asyncHandler((req, res) => clienteController.definirAtividade(req, res))
);
router.put('/:id', asyncHandler((req, res) => clienteController.atualizar(req, res)));
router.delete('/:id', asyncHandler((req, res) => clienteController.excluir(req, res)));

export default router;
