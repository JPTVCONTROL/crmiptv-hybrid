import type { Request, Response } from 'express';
import { authService, AuthError } from '../services/authService.js';
import { AppError } from '../errors.js';
import { resetRateLimitLogin } from '../middlewares/rateLimitMiddleware.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, senha } = req.body as {
        email?: string;
        senha?: string;
      };

      const resultado = await authService.login(email ?? '', senha ?? '');
      resetRateLimitLogin(req);
      sendSuccess(res, resultado, 'Login realizado com sucesso.');
    } catch (error) {
      if (error instanceof AppError) {
        sendError(res, error.message, error.statusCode);
        return;
      }
      if (error instanceof AuthError) {
        sendError(res, error.message, 401);
        return;
      }
      sendError(res, 'Erro ao realizar login.');
    }
  }

  async alterarSenha(req: Request, res: Response): Promise<void> {
    try {
      if (!req.usuario) {
        sendError(res, 'Não autenticado.', 401);
        return;
      }

      const { senhaAtual, novaSenha } = req.body as {
        senhaAtual?: string;
        novaSenha?: string;
      };

      await authService.alterarSenha(
        req.usuario.id,
        senhaAtual ?? '',
        novaSenha ?? ''
      );
      sendSuccess(res, null, 'Senha alterada com sucesso.');
    } catch (error) {
      if (error instanceof AuthError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao alterar senha.');
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.usuario) {
        sendError(res, 'Não autenticado.', 401);
        return;
      }

      const usuario = await authService.obterPorId(req.usuario.id);
      sendSuccess(res, usuario);
    } catch (error) {
      if (error instanceof AuthError) {
        sendError(res, error.message, 401);
        return;
      }
      sendError(res, 'Erro ao buscar usuário autenticado.');
    }
  }
}

export const authController = new AuthController();
