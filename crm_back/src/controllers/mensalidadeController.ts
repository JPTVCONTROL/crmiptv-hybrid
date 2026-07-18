import type { Request, Response } from 'express';
import {
  mensalidadeService,
  MensalidadeNotFoundError,
  ValidationError,
} from '../services/mensalidadeService.js';
import {
  sendSuccess,
  sendError,
  sendSuccessWithTotal,
} from '../utils/helpers/response.js';

export class MensalidadeController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const mensalidades = await mensalidadeService.listar();
      sendSuccessWithTotal(res, mensalidades, mensalidades.length);
    } catch {
      sendError(res, 'Erro ao buscar mensalidades');
    }
  }

  async registrarPagamento(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const novoVencimento = await mensalidadeService.registrarPagamento(id);
      res.json({
        success: true,
        message: 'Pagamento registrado com sucesso.',
        novoVencimento,
      });
    } catch (error) {
      if (error instanceof MensalidadeNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao registrar pagamento');
    }
  }
}

export const mensalidadeController = new MensalidadeController();
