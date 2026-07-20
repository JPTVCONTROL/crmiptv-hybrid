import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { rateLimitLogin } from '../middlewares/rateLimitMiddleware.js';

const router = Router();

router.post(
  '/login',
  rateLimitLogin,
  asyncHandler((req, res) => authController.login(req, res))
);
router.get('/me', authenticate, asyncHandler((req, res) => authController.me(req, res)));
router.put(
  '/senha',
  authenticate,
  asyncHandler((req, res) => authController.alterarSenha(req, res))
);

export default router;
