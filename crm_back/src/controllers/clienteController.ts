import type { Request, Response } from 'express';
import {
  clienteService,
  ClienteNotFoundError,
  ValidationError,
} from '../services/clienteService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';
import type { CreateClienteDto, UpdateClienteDto } from '../models/index.js';

export class ClienteController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const clientes = await clienteService.listar();
      sendSuccess(res, clientes);
    } catch {
      sendError(res, 'Erro ao buscar clientes');
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const cliente = await clienteService.buscarPorId(id);
      sendSuccess(res, cliente);
    } catch (error) {
      if (error instanceof ClienteNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao buscar cliente');
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const cliente = await clienteService.criar(req.body as CreateClienteDto);
      sendSuccess(res, cliente, 'Cliente cadastrado com sucesso!');
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao cadastrar cliente');
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const cliente = await clienteService.atualizar(id, req.body as UpdateClienteDto);
      sendSuccess(res, cliente, 'Cliente atualizado com sucesso!');
    } catch (error) {
      if (error instanceof ClienteNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao atualizar cliente');
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await clienteService.excluir(id);
      sendSuccess(res, null, 'Cliente excluído com sucesso!');
    } catch (error) {
      if (error instanceof ClienteNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      sendError(res, 'Erro ao excluir cliente');
    }
  }
}

export const clienteController = new ClienteController();
