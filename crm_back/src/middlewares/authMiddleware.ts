import type { Request, Response, NextFunction } from 'express';
import { authService, AuthError } from '../services/authService.js';
import { sendError } from '../utils/helpers/response.js';

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    sendError(res, 'Token de autenticação ausente.', 401);
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    sendError(res, 'Token de autenticação ausente.', 401);
    return;
  }

  try {
    const payload = authService.verificarToken(token);
    req.usuario = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    const message =
      error instanceof AuthError
        ? error.message
        : 'Sessão inválida ou expirada.';
    sendError(res, message, 401);
  }
}
