import crypto from 'node:crypto';

export function verificarAssinaturaWebhookMeta(
  rawBody: Buffer | string,
  assinaturaHeader: string | undefined,
  appSecret: string
): boolean {
  if (!assinaturaHeader || !appSecret) {
    return false;
  }

  const [tipo, hashRecebido] = assinaturaHeader.split('=');
  if (tipo !== 'sha256' || !hashRecebido) {
    return false;
  }

  const hashCalculado = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hashRecebido, 'hex'),
      Buffer.from(hashCalculado, 'hex')
    );
  } catch {
    return false;
  }
}
