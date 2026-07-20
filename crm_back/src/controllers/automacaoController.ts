import type { Request, Response } from 'express';
import {
  automacaoService,
  ValidationError,
} from '../services/automacaoService.js';
import { sendError, sendSuccess } from '../utils/helpers/response.js';

export class AutomacaoController {
  async obterPainel(_req: Request, res: Response): Promise<void> {
    try {
      const data = await automacaoService.obterPainel();
      sendSuccess(res, data);
    } catch {
      sendError(res, 'Erro ao carregar automações.');
    }
  }

  async salvar(req: Request, res: Response): Promise<void> {
    try {
      const data = await automacaoService.salvar(req.body ?? {});
      sendSuccess(res, data, 'Automações salvas.');
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao salvar automações.');
    }
  }

  async executar(_req: Request, res: Response): Promise<void> {
    try {
      const resultado = await automacaoService.executar(true);
      sendSuccess(
        res,
        resultado,
        `Rotina concluída: ${resultado.enviados} enviado(s), ${resultado.falhas} falha(s).`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao executar automações.');
    }
  }
}

export const automacaoController = new AutomacaoController();
