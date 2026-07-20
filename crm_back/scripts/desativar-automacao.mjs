import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const config = await prisma.automacaoConfig.findFirst();
  if (config) {
    await prisma.automacaoConfig.update({
      where: { id: config.id },
      data: {
        lembretesAtivos: false,
        cobrancaAtrasadosAtiva: false,
      },
    });
    console.log('Automação Meta desativada no banco (lembretes e cobranças automáticas).');
  }
} finally {
  await prisma.$disconnect();
}
