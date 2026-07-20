import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function criarPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function obterPrismaClient(): PrismaClient {
  const emCache = globalForPrisma.prisma;

  if (emCache && 'campanha' in emCache && 'campanhaEnvio' in emCache) {
    return emCache;
  }

  if (emCache) {
    void emCache.$disconnect();
  }

  const cliente = criarPrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = cliente;
  }

  return cliente;
}

export const prisma = obterPrismaClient();

export default prisma;
