import type { Request, Response } from 'express';
import {
  painelCreditoService,
  PainelCreditoNotFoundError,
  SaldoInsuficienteError,
  ValidationError,
} from '../services/painelCreditoService.js';
import { sendSuccess, sendError } from '../utils/helpers/response.js';

export class PainelCreditoController {
  async listarConsumos(req: Request, res: Response): Promise<void> {
    try {
      const periodo =
        typeof req.query.periodo === 'string' ? req.query.periodo : undefined;
      const dados = await painelCreditoService.listarConsumos(periodo);
      sendSuccess(res, dados);
    } catch (error) {
      console.error('[paineis-credito.consumos]', error);
      sendError(res, 'Erro ao listar consumos de crédito.');
    }
  }

  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const paineis = await painelCreditoService.listar();
      sendSuccess(res, paineis);
    } catch (error) {
      console.error('[paineis-credito.listar]', error);
      sendError(res, 'Erro interno do servidor.');
    }
  }

  async definirSaldo(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { saldo, observacao } = req.body as {
        saldo?: number;
        observacao?: string | null;
      };
      const painel = await painelCreditoService.definirSaldo(
        id,
        Number(saldo),
        observacao
      );
      sendSuccess(res, painel, 'Saldo atualizado com sucesso.');
    } catch (error) {
      if (error instanceof PainelCreditoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao atualizar saldo.');
    }
  }

  async adicionarCreditos(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { quantidade, observacao } = req.body as {
        quantidade?: number;
        observacao?: string | null;
      };
      const painel = await painelCreditoService.adicionarCreditos(
        id,
        Number(quantidade),
        observacao
      );
      sendSuccess(res, painel, 'Créditos adicionados com sucesso.');
    } catch (error) {
      if (error instanceof PainelCreditoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao adicionar créditos.');
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const { nome, codigo, custoUnitario, urlPainel, loginPainel, senhaPainel, ativo } =
        req.body as {
          nome?: string;
          codigo?: string;
          custoUnitario?: number;
          urlPainel?: string | null;
          loginPainel?: string | null;
          senhaPainel?: string | null;
          ativo?: boolean;
        };
      const painel = await painelCreditoService.criar({
        nome: nome ?? '',
        codigo,
        custoUnitario,
        urlPainel,
        loginPainel,
        senhaPainel,
        ativo,
      });
      sendSuccess(res, painel, 'Servidor criado com sucesso.', 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      console.error('[paineis-credito.criar]', error);
      sendError(res, 'Erro ao criar servidor.');
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await painelCreditoService.excluir(id);
      sendSuccess(res, { id }, 'Servidor excluído com sucesso.');
    } catch (error) {
      if (error instanceof PainelCreditoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao excluir servidor.');
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const {
        nome,
        custoUnitario,
        saldo,
        urlPainel,
        loginPainel,
        senhaPainel,
        ativo,
      } = req.body as {
        nome?: string;
        custoUnitario?: number;
        saldo?: number;
        urlPainel?: string | null;
        loginPainel?: string | null;
        senhaPainel?: string | null;
        ativo?: boolean;
      };
      const painel = await painelCreditoService.atualizar(id, {
        nome,
        custoUnitario,
        saldo: saldo !== undefined ? Number(saldo) : undefined,
        urlPainel,
        loginPainel,
        senhaPainel,
        ativo,
      });
      sendSuccess(res, painel, 'Servidor atualizado com sucesso.');
    } catch (error) {
      if (error instanceof PainelCreditoNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao atualizar servidor.');
    }
  }
}

export const painelCreditoController = new PainelCreditoController();
