import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { sendError } from '../utils/helpers/response.js';

function resolverCaminhoBanco(): string {
  const url = env.databaseUrl;

  if (!url.startsWith('file:')) {
    throw new Error('Backup disponível apenas para banco SQLite.');
  }

  const relativo = url.replace(/^file:/, '').replace(/^\.\//, '');
  return path.resolve(process.cwd(), 'prisma', relativo);
}

export class SistemaController {
  async baixarBackup(_req: Request, res: Response): Promise<void> {
    try {
      const caminho = resolverCaminhoBanco();

      if (!fs.existsSync(caminho)) {
        sendError(res, 'Arquivo do banco de dados não encontrado.', 404);
        return;
      }

      const data = new Date().toISOString().slice(0, 10);
      const nome = `crm-jptv-backup-${data}.db`;

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);

      fs.createReadStream(caminho).pipe(res);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao gerar backup.';
      sendError(res, message);
    }
  }
}

export const sistemaController = new SistemaController();
