import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const automacao = await prisma.automacaoConfig.findFirst();
  if (automacao) {
    await prisma.automacaoConfig.update({
      where: { id: automacao.id },
      data: {
        horariosEnvio: '08:00',
        horarioInicioManha: '08:00',
        horarioFimManha: '09:00',
        templateLembreteNome: 'crm_lembrete',
        templateCobrancaNome: 'crm_cobranca',
        templateLinguagem: 'pt_BR',
        templatesMetaAtivos: true,
      },
    });
    console.log('AutomacaoConfig sincronizada (janela 08:00–09:00, templates Meta).');
  }

  const configuracao = await prisma.configuracao.findFirst();
  if (configuracao?.nomeEmpresa !== configuracao.nomeEmpresa.trim()) {
    await prisma.configuracao.update({
      where: { id: configuracao.id },
      data: { nomeEmpresa: configuracao.nomeEmpresa.trim() },
    });
    console.log('Nome da empresa normalizado.');
  }
} finally {
  await prisma.$disconnect();
}
