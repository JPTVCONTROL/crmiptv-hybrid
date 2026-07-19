import { Router } from 'express';
import { sistemaController } from '../controllers/sistemaController.js';

const router = Router();

router.get('/backup', (req, res) => void sistemaController.baixarBackup(req, res));

export default router;
