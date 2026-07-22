import prisma from '../src/config/database.js';
import {
  calcularDiasVencimento,
  clienteParticipaCobrancas,
  clienteElegivelMensalidadePendente,
  elegivelRotinaCobrancaDiaria,
  DIAS_ANTECEDENCIA_LEMBRETE_PADRAO,
} from '../src/utils/helpers/cobrancaDiariaHelpers.js';

const clientes = await prisma.cliente.findMany({
  where: {
    ativo: { not: false },
    somenteContato: false,
    cortesia: false,
    expiraEm: { not: null },
  },
  include: { mensalidades: { where: { status: 'PENDENTE' } } },
});

const semPendente = clientes.filter(
  (c) =>
    c.mensalidades.length === 0 &&
    clienteElegivelMensalidadePendente(c)
);

const naoParticipa = clientes.filter(
  (c) =>
    !clienteParticipaCobrancas(c) &&
    c.expiraEm &&
    (c.valorMensal ?? 0) > 0
);

const pendentes = await prisma.mensalidade.findMany({
  where: { status: 'PENDENTE' },
  include: { cliente: true },
});

const proximos5 = pendentes.filter((m) => {
  const dias = calcularDiasVencimento(m.vencimento);
  return (
    dias >= 0 &&
    dias <= DIAS_ANTECEDENCIA_LEMBRETE_PADRAO &&
    clienteParticipaCobrancas(m.cliente)
  );
});

const funilHoje = pendentes.filter(
  (m) =>
    elegivelRotinaCobrancaDiaria(m.vencimento) &&
    clienteParticipaCobrancas(m.cliente)
);

console.log('=== Resumo ===');
console.log(`Clientes ativos com expiraEm: ${clientes.length}`);
console.log(`Mensalidades PENDENTE: ${pendentes.length}`);
console.log(`Próximos 5 dias (janela): ${proximos5.length}`);
console.log(`Funil ativo hoje: ${funilHoje.length}`);
console.log(`Elegíveis sem mensalidade PENDENTE: ${semPendente.length}`);
console.log(`Não participam cobrança: ${naoParticipa.length}`);

if (semPendente.length > 0) {
  console.log('\n=== SEM PENDENTE (bug?) ===');
  for (const c of semPendente) {
    console.log(
      `- ${c.nome} · expira ${c.expiraEm?.toISOString().slice(0, 10)} · R$ ${c.valorMensal}`
    );
  }
}

console.log('\n=== Próximos 5 dias ===');
for (const m of proximos5) {
  const dias = calcularDiasVencimento(m.vencimento);
  const funil = elegivelRotinaCobrancaDiaria(m.vencimento) ? 'FUNIL' : 'fora funil';
  console.log(`- ${m.cliente.nome} · D${dias} · ${funil}`);
}

console.log('\n=== Fora dos 5 dias mas com PENDENTE ===');
for (const m of pendentes) {
  const dias = calcularDiasVencimento(m.vencimento);
  if (dias > DIAS_ANTECEDENCIA_LEMBRETE_PADRAO && clienteParticipaCobrancas(m.cliente)) {
    console.log(`- ${m.cliente.nome} · D${dias}`);
  }
}

await prisma.$disconnect();
