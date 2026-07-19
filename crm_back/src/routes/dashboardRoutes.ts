import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get(
  '/resumo',
  asyncHandler((req, res) => dashboardController.resumo(req, res))
);

export default router;
