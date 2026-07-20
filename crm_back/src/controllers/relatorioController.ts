import type { Request, Response } from 'express';
import { relatorioService } from '../services/relatorioService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';

export class RelatorioController {
  async resumo(req: Request, res: Response): Promise<void> {
    try {
      const periodo =
        typeof req.query.periodo === 'string' ? req.query.periodo : undefined;
      const ano =
        typeof req.query.ano === 'string'
          ? Number(req.query.ano)
          : undefined;

      const dados = await relatorioService.obterResumo(
        periodo,
        Number.isFinite(ano) ? ano : undefined
      );
      sendSuccess(res, dados);
    } catch {
      sendError(res, 'Erro ao gerar relatório.');
    }
  }
}

export const relatorioController = new RelatorioController();
