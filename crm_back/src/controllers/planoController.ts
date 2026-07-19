import type { Request, Response } from 'express';
import {
  planoService,
  PlanoNotFoundError,
  ValidationError,
} from '../services/planoService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';
import type { CreatePlanoDto, UpdatePlanoDto } from '../models/index.js';

export class PlanoController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const planos = await planoService.listar();
      sendSuccess(res, planos, 'Planos listados com sucesso.');
    } catch {
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async listarClientes(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const clientes = await planoService.listarClientes(id);
      sendSuccess(res, clientes);
    } catch (error) {
      if (error instanceof PlanoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao listar clientes do plano.');
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const plano = await planoService.buscarPorId(id);
      sendSuccess(res, plano);
    } catch (error) {
      if (error instanceof PlanoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const plano = await planoService.criar(req.body as CreatePlanoDto);
      sendSuccess(res, plano, 'Plano cadastrado com sucesso.', 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const plano = await planoService.atualizar(id, req.body as UpdatePlanoDto);
      sendSuccess(res, plano, 'Plano atualizado com sucesso.');
    } catch (error) {
      if (error instanceof PlanoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao atualizar plano.');
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await planoService.excluir(id);
      sendSuccess(res, null, 'Plano excluído com sucesso.');
    } catch (error) {
      if (error instanceof PlanoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao excluir plano.');
    }
  }

  async reajustarClientes(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const resultado = await planoService.reajustarClientes(id);
      sendSuccess(
        res,
        resultado,
        'Valores dos clientes atualizados conforme o plano.'
      );
    } catch (error) {
      if (error instanceof PlanoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao reajustar clientes do plano.');
    }
  }
}

export const planoController = new PlanoController();
