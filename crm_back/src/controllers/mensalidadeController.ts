import type { Request, Response } from 'express';
import {
  mensalidadeService,
  MensalidadeNotFoundError,
  ValidationError,
} from '../services/mensalidadeService.js';
import { SaldoInsuficienteError } from '../services/painelCreditoService.js';
import {
  sendSuccess,
  sendError,
  sendSuccessWithTotal,
} from '../utils/helpers/response.js';

export class MensalidadeController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const mensalidades = await mensalidadeService.listar();
      sendSuccessWithTotal(res, mensalidades, mensalidades.length);
    } catch {
      sendError(res, 'Erro ao buscar mensalidades');
    }
  }

  async registrarPagamento(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const pagoEm =
        typeof req.body?.pagoEm === 'string' ? req.body.pagoEm : undefined;
      const resultado = await mensalidadeService.registrarPagamento(id, pagoEm);
      res.json({
        success: true,
        message: 'Pagamento registrado com sucesso.',
        novoVencimento: resultado.novoVencimento,
        valorRenovacao: resultado.valorRenovacao,
      });
    } catch (error) {
      if (error instanceof MensalidadeNotFoundError) {
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
      sendError(res, 'Erro ao registrar pagamento');
    }
  }

  async renovarCortesia(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const resultado = await mensalidadeService.renovarCortesia(id);
      sendSuccess(
        res,
        resultado,
        'Cortesia renovada com sucesso.'
      );
    } catch (error) {
      if (error instanceof MensalidadeNotFoundError) {
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
      sendError(res, 'Erro ao renovar cortesia');
    }
  }

  async registrarContato(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const contatoEm =
        typeof req.body?.contatoEm === 'string' ? req.body.contatoEm : undefined;
      const data = await mensalidadeService.registrarContato(id, contatoEm);
      sendSuccess(res, { contatoEm: data }, 'Contato registrado.');
    } catch (error) {
      if (error instanceof MensalidadeNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao registrar contato');
    }
  }

  async registrarBloqueio(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const bloqueioEm =
        typeof req.body?.bloqueioEm === 'string' ? req.body.bloqueioEm : undefined;
      const data = await mensalidadeService.registrarBloqueio(id, bloqueioEm);
      sendSuccess(
        res,
        { bloqueioEnviadoEm: data, contatoEm: data },
        'Aviso de bloqueio registrado.'
      );
    } catch (error) {
      if (error instanceof MensalidadeNotFoundError) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao registrar aviso de bloqueio');
    }
  }

  async registrarContatos(req: Request, res: Response): Promise<void> {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids.map((valor: unknown) => Number(valor))
        : [];
      const contatoEm =
        typeof req.body?.contatoEm === 'string' ? req.body.contatoEm : undefined;
      const resultado = await mensalidadeService.registrarContatos(ids, contatoEm);
      sendSuccess(res, resultado, 'Contatos registrados.');
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao registrar contatos');
    }
  }

  async registrarPagamentos(req: Request, res: Response): Promise<void> {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids.map((valor: unknown) => Number(valor))
        : [];
      const pagoEm =
        typeof req.body?.pagoEm === 'string' ? req.body.pagoEm : undefined;
      const resultado = await mensalidadeService.registrarPagamentos(ids, pagoEm);
      sendSuccess(res, resultado, 'Pagamentos registrados.');
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, error.message, 400);
        return;
      }
      sendError(res, 'Erro ao registrar pagamentos');
    }
  }
}

export const mensalidadeController = new MensalidadeController();
