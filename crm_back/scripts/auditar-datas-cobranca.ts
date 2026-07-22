import prisma from '../src/config/database.js';
import {
  calcularDiasVencimento,
  calcularDiasVencimentoNaData,
} from '../src/utils/helpers/cobrancaDiariaHelpers.js';

const pendentes = await prisma.mensalidade.findMany({
  where: { status: 'PENDENTE' },
  include: { cliente: true },
});

console.log('=== expiraEm vs vencimento (diferença > 0 dias) ===');
for (const m of pendentes) {
  if (!m.cliente.expiraEm) continue;
  const diasExp = calcularDiasVencimento(m.cliente.expiraEm);
  const diasVen = calcularDiasVencimento(m.vencimento);
  if (diasExp !== diasVen) {
    console.log(
      `- ${m.cliente.nome}: expira D${diasExp} (${m.cliente.expiraEm.toISOString().slice(0, 10)}) vs mens D${diasVen} (${m.vencimento.toISOString().slice(0, 10)})`
    );
  }
}

console.log('\n=== Clientes no funil amanhã ===');
const amanha = new Date();
amanha.setDate(amanha.getDate() + 1);
for (const m of pendentes) {
  const dias = calcularDiasVencimentoNaData(m.vencimento, amanha);
  if ([5, 3, 1, 0, -1, -2, -3, -7].includes(dias)) {
    console.log(`- ${m.cliente.nome} · amanhã D${dias}`);
  }
}

await prisma.$disconnect();
