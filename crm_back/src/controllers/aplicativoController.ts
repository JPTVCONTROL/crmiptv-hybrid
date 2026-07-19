import type { Request, Response } from 'express';
import {
  aplicativoService,
  AplicativoNotFoundError,
  ValidationError,
} from '../services/aplicativoService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';
import type { CreateAplicativoDto, UpdateAplicativoDto } from '../models/index.js';

export class AplicativoController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const aplicativos = await aplicativoService.listar();
      sendSuccess(res, aplicativos, 'Aplicativos listados com sucesso.');
    } catch {
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const aplicativo = await aplicativoService.buscarPorId(id);
      sendSuccess(res, aplicativo);
    } catch (error) {
      if (error instanceof AplicativoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async listarClientes(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const clientes = await aplicativoService.listarClientes(id);
      sendSuccess(res, clientes);
    } catch (error) {
      if (error instanceof AplicativoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao buscar clientes do aplicativo.');
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const aplicativo = await aplicativoService.criar(req.body as CreateAplicativoDto);
      sendSuccess(res, aplicativo, 'Aplicativo cadastrado com sucesso.', 201);
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
      const aplicativo = await aplicativoService.atualizar(id, req.body as UpdateAplicativoDto);
      sendSuccess(res, aplicativo, 'Aplicativo atualizado com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar aplicativo:', error);
      if (error instanceof AplicativoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Erro ao atualizar aplicativo.';
      sendError(res, message, 500);
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await aplicativoService.excluir(id);
      sendSuccess(res, null, 'Aplicativo excluído com sucesso.');
    } catch (error) {
      if (error instanceof AplicativoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao excluir aplicativo.');
    }
  }
}

export const aplicativoController = new AplicativoController();
