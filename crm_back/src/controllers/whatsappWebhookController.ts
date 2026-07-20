import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export class WhatsappWebhookController {
  verificar(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.whatsappWebhookVerifyToken) {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  }

  receber(req: Request, res: Response): void {
    // Confirma recebimento para a Meta; status detalhado pode ser expandido depois.
    if (env.nodeEnv !== 'production') {
      console.log('[WhatsApp Webhook]', JSON.stringify(req.body));
    }
    res.sendStatus(200);
  }
}

export const whatsappWebhookController = new WhatsappWebhookController();
