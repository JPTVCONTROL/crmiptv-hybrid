import prisma from '../src/config/database.js';
import { calcularDiasVencimento, clienteParticipaCobrancas } from '../src/utils/helpers/cobrancaDiariaHelpers.js';
import { clienteUltrapassouLimiteCobranca } from '../src/utils/helpers/clienteArquivamentoHelpers.js';

function apareceVencimentos(c: {
  ativo: boolean | null;
  incluirCobrancas: boolean | null;
  somenteContato: boolean | null;
  expiraEm: Date | null;
}) {
  if (c.ativo === false) return false;
  if (c.somenteContato === true) return false;
  if (clienteUltrapassouLimiteCobranca(c.expiraEm)) return false;
  return c.incluirCobrancas !== false;
}

const todos = await prisma.cliente.findMany({
  include: { mensalidades: { where: { status: 'PENDENTE' } } },
  orderBy: { nome: 'asc' },
});

console.log(`Total clientes no banco: ${todos.length}`);

const ocultos = todos.filter((c) => !apareceVencimentos(c));
console.log(`\nOcultos em Vencimentos (${ocultos.length}):`);
for (const c of ocultos) {
  const dias = c.expiraEm ? calcularDiasVencimento(c.expiraEm) : null;
  console.log(
    `- ${c.nome} | ativo=${c.ativo} somente=${c.somenteContato} cortesia=${c.cortesia} incluir=${c.incluirCobrancas} expira=${c.expiraEm?.toISOString().slice(0, 10) ?? 'null'} D${dias ?? '?'} pend=${c.mensalidades.length}`
  );
}

const visiveisSemPend = todos.filter(
  (c) => apareceVencimentos(c) && c.mensalidades.length === 0
);
console.log(`\nVisíveis em Vencimentos mas SEM PENDENTE (${visiveisSemPend.length}):`);
for (const c of visiveisSemPend) {
  console.log(`- ${c.nome} expira ${c.expiraEm?.toISOString().slice(0, 10)} valor ${c.valorMensal}`);
}

const visiveis = todos.filter((c) => apareceVencimentos(c) && c.mensalidades.length > 0);
console.log(`\nAparecem em Vencimentos: ${visiveis.length}`);

await prisma.$disconnect();
