import { Router } from 'express';
import { whatsappWebhookController } from '../controllers/whatsappWebhookController.js';

const router = Router();

router.get('/', (req, res) => whatsappWebhookController.verificar(req, res));
router.post('/', (req, res) => whatsappWebhookController.receber(req, res));

export default router;
