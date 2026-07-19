import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.post('/login', asyncHandler((req, res) => authController.login(req, res)));
router.get('/me', authenticate, asyncHandler((req, res) => authController.me(req, res)));

export default router;
