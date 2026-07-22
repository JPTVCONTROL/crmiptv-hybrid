import prisma from '../src/config/database.js';
import { calcularDiasVencimento, clienteElegivelMensalidadePendente } from '../src/utils/helpers/cobrancaDiariaHelpers.js';

const todos = await prisma.cliente.findMany({
  include: { mensalidades: { where: { status: 'PENDENTE' } } },
  orderBy: { nome: 'asc' },
});

console.log('=== Com valor > 0 mas sem PENDENTE ===');
for (const c of todos) {
  if ((c.valorMensal ?? 0) > 0 && c.mensalidades.length === 0) {
    console.log(
      `- ${c.nome} | R$ ${c.valorMensal} | expira ${c.expiraEm?.toISOString().slice(0, 10) ?? 'null'} | elegivel=${clienteElegivelMensalidadePendente(c)} | ativo=${c.ativo} incluir=${c.incluirCobrancas} somente=${c.somenteContato}`
    );
  }
}

console.log('\n=== Dentro de 5 dias, valor > 0, sem PENDENTE ===');
for (const c of todos) {
  if (!c.expiraEm || (c.valorMensal ?? 0) <= 0) continue;
  const dias = calcularDiasVencimento(c.expiraEm);
  if (dias >= 0 && dias <= 5 && c.mensalidades.length === 0) {
    console.log(`- ${c.nome} D${dias} elegivel=${clienteElegivelMensalidadePendente(c)}`);
  }
}

await prisma.$disconnect();
