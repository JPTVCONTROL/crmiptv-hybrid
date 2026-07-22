import type { Request, Response } from 'express';
import {
  tarefaService,
  TarefaNotFoundError,
  ValidationError,
} from '../services/tarefaService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';
import type { CreateTarefaDto, UpdateTarefaDto } from '../models/index.js';

function parseBooleanQuery(valor: unknown): boolean | undefined {
  if (valor === '1' || valor === 'true') return true;
  if (valor === '0' || valor === 'false') return false;
  return undefined;
}

export class TarefaController {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const concluida = parseBooleanQuery(req.query.concluida);
      const clienteId =
        req.query.clienteId !== undefined
          ? Number(req.query.clienteId)
          : undefined;

      const tarefas = await tarefaService.listar({
        ...(concluida !== undefined ? { concluida } : {}),
        ...(clienteId !== undefined && !Number.isNaN(clienteId)
          ? { clienteId }
          : {}),
      });

      sendSuccess(res, tarefas, 'Tarefas listadas com sucesso.');
    } catch (error) {
      console.error('[tarefas.listar]', error);
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const tarefa = await tarefaService.buscarPorId(id);
      sendSuccess(res, tarefa);
    } catch (error) {
      if (error instanceof TarefaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const tarefa = await tarefaService.criar(req.body as CreateTarefaDto);
      sendSuccess(res, tarefa, 'Tarefa criada com sucesso.', 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      console.error('[tarefas.criar]', error);
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const tarefa = await tarefaService.atualizar(id, req.body as UpdateTarefaDto);
      sendSuccess(res, tarefa, 'Tarefa atualizada com sucesso.');
    } catch (error) {
      if (error instanceof TarefaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao atualizar tarefa.');
    }
  }

  async concluir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const tarefa = await tarefaService.concluir(id);
      sendSuccess(res, tarefa, 'Tarefa concluída.');
    } catch (error) {
      if (error instanceof TarefaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao concluir tarefa.');
    }
  }

  async reabrir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const tarefa = await tarefaService.reabrir(id);
      sendSuccess(res, tarefa, 'Tarefa reaberta.');
    } catch (error) {
      if (error instanceof TarefaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao reabrir tarefa.');
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await tarefaService.excluir(id);
      sendSuccess(res, null, 'Tarefa excluída com sucesso.');
    } catch (error) {
      if (error instanceof TarefaNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao excluir tarefa.');
    }
  }
}

export const tarefaController = new TarefaController();
