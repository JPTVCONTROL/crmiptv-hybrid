import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const PLANOS_JPTV = [
  { nome: '1 Tela - Mensal', valor: 35, diasValidade: 30 },
  { nome: '1 Tela - Trimestral', valor: 90, diasValidade: 90 },
  { nome: '1 Tela - Anual', valor: 300, diasValidade: 365 },
  { nome: '2 Telas - Mensal', valor: 50, diasValidade: 30 },
  { nome: '2 Telas - Trimestral', valor: 135, diasValidade: 90 },
  { nome: '2 Telas - Anual', valor: 450, diasValidade: 365 },
  { nome: '3 Telas - Mensal', valor: 65, diasValidade: 30 },
  { nome: '3 Telas - Trimestral', valor: 180, diasValidade: 90 },
  { nome: '3 Telas - Anual', valor: 600, diasValidade: 365 },
] as const;

async function seedAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || 'admin@jptv.com.br').trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD || 'admin123';
  const nome = process.env.ADMIN_NOME || 'Administrador';
  const passwordHash = await bcrypt.hash(senha, 10);

  const existente = await prisma.usuario.findUnique({ where: { email } });

  if (existente) {
    await prisma.usuario.update({
      where: { id: existente.id },
      data: { nome, passwordHash },
    });
    console.log(`Admin atualizado: ${email}`);
    return;
  }

  await prisma.usuario.create({
    data: { email, nome, passwordHash },
  });

  console.log(`Admin criado: ${email}`);
}

async function main(): Promise<void> {
  await seedAdmin();

  for (const plano of PLANOS_JPTV) {
    const existente = await prisma.plano.findFirst({
      where: { nome: plano.nome },
    });

    if (existente) {
      await prisma.plano.update({
        where: { id: existente.id },
        data: {
          valor: plano.valor,
          diasValidade: plano.diasValidade,
          ativo: true,
        },
      });
    } else {
      await prisma.plano.create({
        data: {
          nome: plano.nome,
          valor: plano.valor,
          diasValidade: plano.diasValidade,
          ativo: true,
        },
      });
    }
  }

  console.log(`Seed concluído: ${PLANOS_JPTV.length} planos JPTV.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
