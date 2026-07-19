import type { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService.js';
import { sendError, sendSuccess } from '../utils/helpers/response.js';

export class DashboardController {
  async resumo(_req: Request, res: Response): Promise<void> {
    try {
      const resumo = await dashboardService.obterResumo();
      sendSuccess(res, resumo);
    } catch {
      sendError(res, 'Erro ao carregar resumo do dashboard');
    }
  }
}

export const dashboardController = new DashboardController();
