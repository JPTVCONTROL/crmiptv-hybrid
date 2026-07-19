import type { Request, Response } from 'express';
import {
  dispositivoService,
  DispositivoNotFoundError,
  ValidationError,
} from '../services/dispositivoService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';
import type { CreateDispositivoDto, UpdateDispositivoDto } from '../models/index.js';

export class DispositivoController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const dispositivos = await dispositivoService.listar();
      sendSuccess(res, dispositivos, 'Dispositivos listados com sucesso.');
    } catch (error) {
      console.error('[dispositivos.listar]', error);
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const dispositivo = await dispositivoService.buscarPorId(id);
      sendSuccess(res, dispositivo);
    } catch (error) {
      if (error instanceof DispositivoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const dispositivo = await dispositivoService.criar(req.body as CreateDispositivoDto);
      sendSuccess(res, dispositivo, 'Dispositivo cadastrado com sucesso.', 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      console.error('[dispositivos.criar]', error);
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const dispositivo = await dispositivoService.atualizar(id, req.body as UpdateDispositivoDto);
      sendSuccess(res, dispositivo, 'Dispositivo atualizado com sucesso.');
    } catch (error) {
      if (error instanceof DispositivoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao atualizar dispositivo.');
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await dispositivoService.excluir(id);
      sendSuccess(res, null, 'Dispositivo excluído com sucesso.');
    } catch (error) {
      if (error instanceof DispositivoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao excluir dispositivo.');
    }
  }
}

export const dispositivoController = new DispositivoController();
