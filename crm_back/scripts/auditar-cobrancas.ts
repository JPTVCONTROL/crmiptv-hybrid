import prisma from '../src/config/database.js';
import {
  calcularDiasVencimento,
  elegivelRotinaCobrancaDiaria,
  clienteParticipaCobrancas,
} from '../src/utils/helpers/cobrancaDiariaHelpers.js';
import { resolverPontoDisparo } from '../src/utils/helpers/automacaoDisparoHelpers.js';

const pendentes = await prisma.mensalidade.findMany({
  where: { status: 'PENDENTE' },
  include: { cliente: true },
  orderBy: { vencimento: 'asc' },
});

console.log('PENDENTE | dias | funil | participa | ponto | cliente');
for (const m of pendentes) {
  const dias = calcularDiasVencimento(m.vencimento);
  console.log(
    [
      m.referencia.padEnd(8),
      `D${String(dias).padStart(3)}`,
      elegivelRotinaCobrancaDiaria(m.vencimento) ? 'SIM' : 'NAO',
      clienteParticipaCobrancas(m.cliente) ? 'SIM' : 'NAO',
      (resolverPontoDisparo(dias) ?? '-').padEnd(12),
      m.cliente.nome,
    ].join(' | ')
  );
}

const foraFunil = pendentes.filter(
  (m) =>
    clienteParticipaCobrancas(m.cliente) &&
    !elegivelRotinaCobrancaDiaria(m.vencimento) &&
    calcularDiasVencimento(m.vencimento) >= 0
);

console.log(`\n${foraFunil.length} cliente(s) com cobrança futura FORA do funil hoje:`);
for (const m of foraFunil) {
  const dias = calcularDiasVencimento(m.vencimento);
  console.log(`- ${m.cliente.nome} · D${dias} · vence ${m.vencimento.toISOString().slice(0, 10)}`);
}

await prisma.$disconnect();
