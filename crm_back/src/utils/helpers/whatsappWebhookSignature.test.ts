import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { verificarAssinaturaWebhookMeta } from './whatsappWebhookSignature.js';

describe('whatsappWebhookSignature', () => {
  it('valida assinatura HMAC sha256 correta', () => {
    const secret = 'test-secret';
    const body = Buffer.from('{"entry":[]}');
    const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');

    assert.equal(
      verificarAssinaturaWebhookMeta(body, `sha256=${hash}`, secret),
      true
    );
  });

  it('rejeita assinatura inválida', () => {
    assert.equal(
      verificarAssinaturaWebhookMeta(
        Buffer.from('{}'),
        'sha256=deadbeef',
        'secret'
      ),
      false
    );
  });
});
