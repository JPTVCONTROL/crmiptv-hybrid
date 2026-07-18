import type { Request, Response } from 'express';
import { configuracaoService } from '../services/configuracaoService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';
import type { UpdateConfiguracaoDto } from '../models/index.js';

export class ConfiguracaoController {
  async obter(_req: Request, res: Response): Promise<void> {
    try {
      const configuracao = await configuracaoService.obter();
      sendSuccess(res, configuracao);
    } catch {
      sendError(res, 'Erro ao buscar configurações.');
    }
  }

  async salvar(req: Request, res: Response): Promise<void> {
    try {
      const configuracao = await configuracaoService.salvar(req.body as UpdateConfiguracaoDto);
      sendSuccess(res, configuracao, 'Configurações salvas com sucesso.');
    } catch {
      sendError(res, 'Erro ao salvar configurações.');
    }
  }
}

export const configuracaoController = new ConfiguracaoController();
