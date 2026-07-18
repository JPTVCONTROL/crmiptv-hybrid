import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/helpers/response.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);
  sendError(res, 'Erro interno do servidor.', 500);
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 'Rota não encontrada.', 404);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
