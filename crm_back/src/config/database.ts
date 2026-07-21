import { PrismaClient } from '@prisma/client';
import { incrementarRevisaoDados } from '../services/dataRevisionService.js';

const MUTACOES = new Set([
  'create',
  'update',
  'delete',
  'upsert',
  'createMany',
  'updateMany',
  'deleteMany',
]);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function criarPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          const result = await query(args);

          if (MUTACOES.has(operation)) {
            incrementarRevisaoDados();
          }

          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}

function obterPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = criarPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = obterPrismaClient();

export default prisma;
