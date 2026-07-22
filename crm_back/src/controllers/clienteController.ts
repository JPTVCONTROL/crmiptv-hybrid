import type { Request, Response } from 'express';
import {
  clienteService,
  ClienteNotFoundError,
  ValidationError,
} from '../services/clienteService.js';
import { SaldoInsuficienteError } from '../services/painelCreditoService.js';
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
      if (error instanceof SaldoInsuficienteError) {
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
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      if (error instanceof SaldoInsuficienteError) {
        sendError(res, error.message, 400);
        return;
      }
      console.error('Erro ao atualizar cliente:', error);
      sendError(res, 'Erro ao atualizar cliente');
    }
  }

  async definirInclusaoCobrancas(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const incluirCobrancas = req.body?.incluirCobrancas;

      if (typeof incluirCobrancas !== 'boolean') {
        sendError(res, 'Informe se o cliente deve ser incluído nas cobranças.', 400);
        return;
      }

      const cliente = await clienteService.definirInclusaoCobrancas(
        id,
        incluirCobrancas
      );

      sendSuccess(
        res,
        cliente,
        incluirCobrancas
          ? 'Cliente incluído nas cobranças.'
          : 'Cliente excluído das cobranças.'
      );
    } catch (error) {
      if (error instanceof ClienteNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      console.error('Erro ao alterar inclusão nas cobranças:', error);
      sendError(res, 'Erro ao alterar inclusão nas cobranças.');
    }
  }

  async definirCortesia(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const cortesia = req.body?.cortesia;

      if (typeof cortesia !== 'boolean') {
        sendError(res, 'Informe se o cliente é cortesia.', 400);
        return;
      }

      const cliente = await clienteService.definirCortesia(id, cortesia);

      sendSuccess(
        res,
        cliente,
        cortesia
          ? 'Cliente marcado como cortesia.'
          : 'Cliente removido da cortesia.'
      );
    } catch (error) {
      if (error instanceof ClienteNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      console.error('Erro ao alterar cortesia:', error);
      sendError(res, 'Erro ao alterar cortesia.');
    }
  }

  async definirAtividade(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const ativo = req.body?.ativo;
      const incluirCampanhas = req.body?.incluirCampanhas;
      const incluirCobrancas = req.body?.incluirCobrancas;

      if (typeof ativo !== 'boolean') {
        sendError(res, 'Informe se o cliente está ativo.', 400);
        return;
      }

      if (typeof incluirCampanhas !== 'boolean') {
        sendError(res, 'Informe se o cliente participa de campanhas.', 400);
        return;
      }

      if (typeof incluirCobrancas !== 'boolean') {
        sendError(res, 'Informe se o cliente participa das cobranças.', 400);
        return;
      }

      const cliente = await clienteService.definirAtividade(
        id,
        ativo,
        incluirCampanhas,
        incluirCobrancas
      );

      sendSuccess(
        res,
        cliente,
        ativo ? 'Cliente marcado como ativo.' : 'Cliente marcado como inativo.'
      );
    } catch (error) {
      if (error instanceof ClienteNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      console.error('Erro ao alterar atividade do cliente:', error);
      sendError(res, 'Erro ao alterar atividade do cliente.');
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

  async importar(req: Request, res: Response): Promise<void> {
    try {
      const csv = String(req.body?.csv ?? '');
      const somenteContato = req.body?.somenteContato === true;
      const resultado = await clienteService.importarCsv(csv, somenteContato);
      sendSuccess(
        res,
        resultado,
        `${resultado.importados} cliente(s) importado(s) com sucesso.`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao importar clientes.');
    }
  }
}

export const clienteController = new ClienteController();
