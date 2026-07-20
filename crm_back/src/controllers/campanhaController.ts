import type { Request, Response } from 'express';
import {
  campanhaService,
  CampanhaNotFoundError,
  ValidationError,
} from '../services/campanhaService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';
import type { CreateCampanhaDto, UpdateCampanhaDto } from '../models/index.js';

function parseCampanhaId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    sendError(res, 'ID de campanha inválido.', 400);
    return null;
  }
  return id;
}

export class CampanhaController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const campanhas = await campanhaService.listar();
      sendSuccess(res, campanhas, 'Campanhas listadas com sucesso.');
    } catch (error) {
      console.error('[Campanha] Erro ao listar:', error);
      sendError(res, 'Erro ao listar campanhas.');
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = parseCampanhaId(req, res);
      if (id === null) return;

      const campanha = await campanhaService.buscarPorId(id);
      sendSuccess(res, campanha);
    } catch (error) {
      if (error instanceof CampanhaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao buscar campanha.');
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const campanha = await campanhaService.criar(req.body as CreateCampanhaDto);
      sendSuccess(res, campanha, 'Campanha criada com sucesso.', 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao criar campanha.');
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = parseCampanhaId(req, res);
      if (id === null) return;

      const campanha = await campanhaService.atualizar(
        id,
        req.body as UpdateCampanhaDto
      );
      sendSuccess(res, campanha, 'Campanha atualizada com sucesso.');
    } catch (error) {
      if (error instanceof CampanhaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao atualizar campanha.');
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = parseCampanhaId(req, res);
      if (id === null) return;

      await campanhaService.excluir(id);
      sendSuccess(res, null, 'Campanha excluída com sucesso.');
    } catch (error) {
      if (error instanceof CampanhaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao excluir campanha.');
    }
  }

  async registrarEnvios(req: Request, res: Response): Promise<void> {
    try {
      const id = parseCampanhaId(req, res);
      if (id === null) return;

      const { clienteIds } = req.body as { clienteIds?: number[] };
      const resultado = await campanhaService.registrarEnvios(
        id,
        clienteIds ?? []
      );
      sendSuccess(res, resultado, 'Envios registrados com sucesso.');
    } catch (error) {
      if (error instanceof CampanhaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      console.error('[Campanha] Erro ao registrar envios:', error);
      sendError(res, 'Erro ao registrar envios.');
    }
  }
}

export const campanhaController = new CampanhaController();
