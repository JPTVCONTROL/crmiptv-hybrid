import type { NextFunction, Request, Response } from 'express';
import { RateLimitError } from '../errors.js';

interface EntradaRateLimit {
  tentativas: number;
  bloqueadoAte: number;
}

const tentativasPorIp = new Map<string, EntradaRateLimit>();

const JANELA_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS = 10;

function obterIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown'
  );
}

export function rateLimitLogin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const ip = obterIp(req);
  const agora = Date.now();
  const entrada = tentativasPorIp.get(ip);

  if (entrada && entrada.bloqueadoAte > agora) {
    next(new RateLimitError());
    return;
  }

  if (!entrada || (entrada.bloqueadoAte > 0 && entrada.bloqueadoAte <= agora)) {
    tentativasPorIp.set(ip, { tentativas: 1, bloqueadoAte: 0 });
    next();
    return;
  }

  const novasTentativas = entrada.tentativas + 1;

  if (novasTentativas > MAX_TENTATIVAS) {
    tentativasPorIp.set(ip, {
      tentativas: novasTentativas,
      bloqueadoAte: agora + JANELA_MS,
    });
    next(new RateLimitError());
    return;
  }

  tentativasPorIp.set(ip, { tentativas: novasTentativas, bloqueadoAte: 0 });
  next();
}

export function resetRateLimitLogin(req: Request): void {
  tentativasPorIp.delete(obterIp(req));
}
