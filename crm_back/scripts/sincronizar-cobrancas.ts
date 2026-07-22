import { clienteService } from '../src/services/clienteService.js';
import prisma from '../src/config/database.js';
import {
  calcularDiasVencimento,
  clienteParticipaCobrancas,
  elegivelRotinaCobrancaDiaria,
} from '../src/utils/helpers/cobrancaDiariaHelpers.js';

const resultado = await clienteService.sincronizarCobrancasPendentes();

console.log('Sincronização de cobranças concluída:');
console.log(JSON.stringify(resultado, null, 2));

const pendentes = await prisma.mensalidade.findMany({
  where: { status: 'PENDENTE' },
  include: { cliente: true },
  orderBy: { vencimento: 'asc' },
});

const elegiveisFunilHoje = pendentes.filter(
  (m) =>
    elegivelRotinaCobrancaDiaria(m.vencimento) &&
    clienteParticipaCobrancas(m.cliente)
);

console.log(`\nMensalidades PENDENTE: ${pendentes.length}`);
console.log(`Elegíveis no funil hoje: ${elegiveisFunilHoje.length}`);
console.log('\nFunil ativo hoje:');
for (const m of elegiveisFunilHoje) {
  console.log(
    `- ${m.cliente.nome} · ${m.referencia} · D${calcularDiasVencimento(m.vencimento)} · R$ ${m.valor}`
  );
}

await prisma.$disconnect();
