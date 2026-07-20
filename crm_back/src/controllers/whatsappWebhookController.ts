import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { verificarAssinaturaWebhookMeta } from '../utils/helpers/whatsappWebhookSignature.js';

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
    const assinatura = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody =
      (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('');

    if (env.whatsappAppSecret) {
      const valida = verificarAssinaturaWebhookMeta(
        rawBody,
        assinatura,
        env.whatsappAppSecret
      );

      if (!valida) {
        res.sendStatus(403);
        return;
      }
    } else if (env.nodeEnv === 'production') {
      console.warn(
        '[WhatsApp Webhook] WHATSAPP_APP_SECRET não configurado — assinatura ignorada.'
      );
    }

    if (env.nodeEnv !== 'production') {
      console.log('[WhatsApp Webhook]', JSON.stringify(req.body));
    }

    res.sendStatus(200);
  }
}

export const whatsappWebhookController = new WhatsappWebhookController();
