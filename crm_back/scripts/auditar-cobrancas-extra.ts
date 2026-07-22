import prisma from '../src/config/database.js';
import {
  calcularDiasVencimento,
  elegivelRotinaCobrancaDiaria,
  clienteParticipaCobrancas,
  clienteElegivelMensalidadePendente,
} from '../src/utils/helpers/cobrancaDiariaHelpers.js';

const pendentes = await prisma.mensalidade.findMany({
  where: { status: 'PENDENTE' },
  include: { cliente: true },
});

const atrasadosFora = pendentes.filter((m) => {
  const dias = calcularDiasVencimento(m.vencimento);
  return (
    dias < 0 &&
    clienteParticipaCobrancas(m.cliente) &&
    !elegivelRotinaCobrancaDiaria(m.vencimento)
  );
});

console.log('Atrasados FORA do funil hoje:', atrasadosFora.length);
for (const m of atrasadosFora.sort(
  (a, b) => calcularDiasVencimento(a.vencimento) - calcularDiasVencimento(b.vencimento)
)) {
  const dias = calcularDiasVencimento(m.vencimento);
  console.log(`- ${m.cliente.nome} · D${dias} · ${m.vencimento.toISOString().slice(0, 10)}`);
}

const clientes = await prisma.cliente.findMany({
  where: {
    ativo: true,
    somenteContato: false,
    cortesia: false,
    expiraEm: { not: null },
    incluirCobrancas: { not: false },
  },
  include: { mensalidades: { where: { status: 'PENDENTE' } } },
});

const semPendente = clientes.filter(
  (c) => c.mensalidades.length === 0 && clienteElegivelMensalidadePendente(c)
);

console.log(`\nClientes elegíveis SEM mensalidade PENDENTE: ${semPendente.length}`);
for (const c of semPendente) {
  console.log(`- ${c.nome} · expira ${c.expiraEm?.toISOString().slice(0, 10)} · R$ ${c.valorMensal}`);
}

await prisma.$disconnect();
