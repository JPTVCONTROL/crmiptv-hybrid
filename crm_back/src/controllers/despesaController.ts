import type { Request, Response } from 'express';
import {
  despesaService,
  DespesaNotFoundError,
  ValidationError,
} from '../services/despesaService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';
import type { CreateDespesaDto, UpdateDespesaDto } from '../models/index.js';

export class DespesaController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const despesas = await despesaService.listar();
      sendSuccess(res, despesas, 'Despesas listadas com sucesso.');
    } catch (error) {
      console.error('[despesas.listar]', error);
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async resumo(_req: Request, res: Response): Promise<void> {
    try {
      const resumo = await despesaService.obterResumoCustos();
      sendSuccess(res, resumo);
    } catch (error) {
      console.error('[custos.resumo]', error);
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const despesa = await despesaService.buscarPorId(id);
      sendSuccess(res, despesa);
    } catch (error) {
      if (error instanceof DespesaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const despesa = await despesaService.criar(req.body as CreateDespesaDto);
      sendSuccess(res, despesa, 'Despesa cadastrada com sucesso.', 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      console.error('[despesas.criar]', error);
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const despesa = await despesaService.atualizar(id, req.body as UpdateDespesaDto);
      sendSuccess(res, despesa, 'Despesa atualizada com sucesso.');
    } catch (error) {
      if (error instanceof DespesaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao atualizar despesa.');
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await despesaService.excluir(id);
      sendSuccess(res, null, 'Despesa excluída com sucesso.');
    } catch (error) {
      if (error instanceof DespesaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao excluir despesa.');
    }
  }
}

export const despesaController = new DespesaController();
