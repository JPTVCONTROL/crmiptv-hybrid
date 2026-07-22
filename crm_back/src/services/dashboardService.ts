import prisma from '../config/database.js';
import { configuracaoRepository } from '../repositories/configuracaoRepository.js';
import { calcularStatusCliente } from '../utils/helpers/clienteStatus.js';
import {
  agruparResumoEtapasFunil,
  calcularDiasVencimento,
  elegivelCobrancaDiaria,
  elegivelRotinaCobrancaDiaria,
  resolverDiasAntecedencia,
} from '../utils/helpers/cobrancaDiariaHelpers.js';
import {
  contatoRegistradoHoje,
  telefoneValidoParaWhatsApp,
} from '../utils/helpers/contatoHelpers.js';
import {
  resumirPendenciasCadastro,
  rotaPendenciaCadastro,
  contarCadastrosIncompletos,
} from '../utils/helpers/clienteCadastroHelpers.js';
import {
  calcularLimitesDashboard,
  whereClienteAtivo,
  whereClienteAtrasado,
  whereClienteInativo,
  whereClienteGerenciado,
  whereClienteParticipaCobranca,
  whereMensalidadeCobrancaCliente,
} from '../utils/helpers/dashboardStatusLimits.js';
import {
  resolverMetaNovosClientes,
  whereClienteContaMeta,
} from '../utils/helpers/metaNovosClientesHelpers.js';
import { tarefaRepository } from '../repositories/tarefaRepository.js';
import {
  formatarDataIsoUtc,
  inicioDiaUtc,
  tarefaEstaAtrasada,
} from '../utils/helpers/tarefaHelpers.js';

export interface AlertaOperacional {
  tipo:
    | 'CADASTRO_SEM_TELEFONE'
    | 'CADASTRO_SEM_PLANO'
    | 'CADASTRO_SEM_VALOR'
    | 'CADASTRO_SEM_EXPIRACAO'
    | 'CADASTRO_SEM_CREDENCIAIS'
    | 'CADASTRO_SEM_APLICATIVO'
    | 'CADASTRO_SEM_MAC'
    | 'CADASTRO_INCOMPLETO'
    | 'ROTINA_PENDENTE'
    | 'VENCE_HOJE'
    | 'SEM_TELEFONE'
    | 'EXPIRADO_SEM_MENSALIDADE'
    | 'NAO_CONTACTADO'
    | 'ROTINA_CONCLUIDA'
    | 'TAREFAS_ATRASADAS'
    | 'TAREFAS_HOJE';
  titulo: string;
  descricao: string;
  quantidade: number;
  rota?: string;
}

export interface DashboardResumo {
  clientes: {
    total: number;
    ativos: number;
    atrasados: number;
    inativos: number;
    cortesia: number;
    somenteContato: number;
    cadastrosIncompletos: number;
  };
  financeiro: {
    recebidoHoje: number;
    recebidoMes: number;
    aReceberEsteMes: number;
    qtdEsteMes: number;
    vencemHoje: number;
    aReceberProximosMeses: number;
    qtdProximosMeses: number;
  };
  faturamentoMensal: Array<{ mes: string; total: number }>;
  proximosVencimentos: Array<{
    id: number;
    clienteId: number;
    referencia: string;
    valor: number;
    vencimento: string;
    ultimoContatoEm: string | null;
    clienteNome: string;
    telefone: string;
  }>;
  clientesAtencao: Array<{
    id: number;
    nome: string;
    telefone: string;
    expiraEm: string | null;
    status: 'ATRASADO' | 'INATIVO';
    mensalidadePendenteId: number | null;
    mensalidadeReferencia: string | null;
    mensalidadeValor: number | null;
    mensalidadeVencimento: string | null;
    bloqueioEnviadoEm: string | null;
  }>;
  cobrancaDiaria: {
    totalElegiveis: number;
    contactadosHoje: number;
    contactaveis: number;
    semTelefone: number;
    naoContactados: number;
    rotinaFeita: boolean;
    etapasFunil: Array<{
      ponto: string;
      rotulo: string;
      tipo: 'LEMBRETE' | 'COBRANCA';
      total: number;
      contactadosHoje: number;
      pendentes: number;
    }>;
  };
  alertas: AlertaOperacional[];
  tarefas: {
    pendentes: number;
    hoje: number;
    atrasadas: number;
    proximas: Array<{
      id: number;
      titulo: string;
      vencimentoEm: string;
      clienteId: number | null;
      clienteNome: string | null;
      atrasada: boolean;
    }>;
  };
  metricas: {
    mrr: number;
    arr: number;
    arrMesesRestantes: number;
    arrAno: number;
    ticketMedio: number;
    conexoes: number;
    novosClientesPeriodo: number;
    metaClientesAtual: number;
    metaNovosClientesQtd: number;
    metaNovosClientesInicioEm: string;
    metaNovosClientesFimEm: string;
    metaNovosClientesDias: number;
    metaNovosClientesDiasRestantes: number;
    metaNovosClientesEncerrada: boolean;
    metaNovosClientesPercentual: number;
    metaNovosClientesAtingida: boolean;
    variacaoNovosClientes: number;
    vencendoQtd: number;
    vencendoValor: number;
    cobrancaAtrasadaQtd: number;
    cobrancaAtrasadaValor: number;
    retencaoPercentual: number;
    churnPercentual: number;
    inadimplenciaPercentual: number;
    ganhosProximoAno: number;
    ganhosProximoAnoAno: number;
  };
}

const MESES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function montarFaturamentoMensal(
  pagos: Array<{ valor: number; pagoEm: Date | null }>,
  hoje: Date
): DashboardResumo['faturamentoMensal'] {
  const faturamentoMensal: DashboardResumo['faturamentoMensal'] = [];

  for (let i = 5; i >= 0; i--) {
    const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const rotulo = `${MESES[referencia.getMonth()]}/${String(referencia.getFullYear()).slice(-2)}`;

    const total = pagos
      .filter((m) => {
        if (!m.pagoEm) return false;
        const pago = new Date(m.pagoEm);
        return (
          pago.getMonth() === referencia.getMonth() &&
          pago.getFullYear() === referencia.getFullYear()
        );
      })
      .reduce((acc, m) => acc + m.valor, 0);

    faturamentoMensal.push({ mes: rotulo, total });
  }

  return faturamentoMensal;
}

function primeiraMensalidadePorCliente<
  T extends { clienteId: number; id: number; referencia: string; valor: number; vencimento: Date },
>(
  mensalidades: T[]
): Map<number, T> {
  const mapa = new Map<number, T>();
  for (const mensalidade of mensalidades) {
    if (!mapa.has(mensalidade.clienteId)) {
      mapa.set(mensalidade.clienteId, mensalidade);
    }
  }
  return mapa;
}

export class DashboardService {
  async obterResumo(): Promise<DashboardResumo> {
    const [configuracao, aplicativosCatalogo] = await Promise.all([
      configuracaoRepository.findOrCreate(),
      prisma.aplicativo.findMany({
        select: {
          id: true,
          requerMac: true,
          requerDeviceKey: true,
          requerCodigo: true,
        },
      }),
    ]);

    const diasAntecedencia = resolverDiasAntecedencia(
      configuracao.diasAntecedenciaLembrete
    );
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    const limites = calcularLimitesDashboard(hoje, diasAntecedencia);
    const metaNovosClientes = resolverMetaNovosClientes(configuracao, hoje);
    const whereAtivo = whereClienteAtivo(limites.inicioHoje);
    const whereAtrasado = whereClienteAtrasado(
      limites.inicioHoje,
      limites.inicioAtrasado
    );
    const whereInativo = whereClienteInativo(limites.inicioAtrasado);
    const whereGerenciado = whereClienteGerenciado(limites.inicioAtrasado);
    const whereAtivoComercial = {
      cortesia: false,
      ...whereAtivo,
    };
    const whereMensalidadeCobranca = whereMensalidadeCobrancaCliente();
    const whereMensalidadeCobrancaJanela = {
      ...whereMensalidadeCobranca,
      OR: [
        { vencimento: { lt: limites.inicioHoje } },
        {
          vencimento: {
            gte: limites.inicioHoje,
            lte: limites.fimAntecedencia,
          },
        },
      ],
    };

    const [
      totalClientes,
      ativosCount,
      atrasadosCount,
      inativosCount,
      cortesiaCount,
      somenteContatoCount,
      clientesGerenciados,
      metaClientesAtual,
      clientesAtivosComercial,
      expiradosSemMensalidade,
      recebidoHojeAgg,
      recebidoMesAgg,
      pendentesEsteMesAgg,
      pendentesProximosMesesAgg,
      pagosUltimos6Meses,
      pendentesCobrancaJanela,
      pendentesCobrancaAtrasados,
      totalPendenteCobrancaAgg,
      cobrancaAtrasadaAgg,
      clientesAtencaoRaw,
    ] = await Promise.all([
      prisma.cliente.count(),
      prisma.cliente.count({ where: whereAtivo }),
      prisma.cliente.count({ where: whereAtrasado }),
      prisma.cliente.count({ where: whereInativo }),
      prisma.cliente.count({ where: { cortesia: true } }),
      prisma.cliente.count({ where: { somenteContato: true } }),
      prisma.cliente.findMany({
        where: whereGerenciado,
        select: {
          telefone: true,
          planoId: true,
          valorMensal: true,
          cortesia: true,
          somenteContato: true,
          expiraEm: true,
          servidor: true,
          usuario: true,
          senha: true,
          aplicativoId: true,
          dispositivos: true,
          macAddress: true,
        },
      }),
      prisma.cliente.count({ where: whereClienteContaMeta }),
      prisma.cliente.findMany({
        where: whereAtivoComercial,
        select: { valorMensal: true, qtdTelas: true, createdAt: true },
      }),
      prisma.cliente.count({
        where: {
          expiraEm: { not: null },
          OR: [whereAtrasado, whereInativo],
          mensalidades: { none: { status: 'PENDENTE' } },
        },
      }),
      prisma.mensalidade.aggregate({
        where: {
          status: 'PAGO',
          pagoEm: { gte: hoje, lte: fimHoje },
        },
        _sum: { valor: true },
      }),
      prisma.mensalidade.aggregate({
        where: {
          status: 'PAGO',
          pagoEm: { gte: limites.inicioMes, lt: limites.inicioProximoMes },
        },
        _sum: { valor: true },
      }),
      prisma.mensalidade.aggregate({
        where: {
          status: 'PENDENTE',
          vencimento: { gte: limites.inicioMes, lt: limites.inicioProximoMes },
        },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.mensalidade.aggregate({
        where: {
          status: 'PENDENTE',
          vencimento: { gte: limites.inicioProximoMes },
        },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.mensalidade.findMany({
        where: {
          status: 'PAGO',
          pagoEm: { gte: limites.seisMesesAtras },
        },
        select: { valor: true, pagoEm: true },
      }),
      prisma.mensalidade.findMany({
        where: whereMensalidadeCobrancaJanela,
        select: {
          id: true,
          clienteId: true,
          referencia: true,
          valor: true,
          vencimento: true,
          ultimoContatoEm: true,
          cliente: {
            select: {
              nome: true,
              telefone: true,
            },
          },
        },
        orderBy: { vencimento: 'asc' },
      }),
      prisma.mensalidade.findMany({
        where: {
          ...whereMensalidadeCobranca,
          vencimento: { lt: limites.inicioHoje },
        },
        select: {
          ultimoContatoEm: true,
          cliente: { select: { telefone: true } },
        },
      }),
      prisma.mensalidade.aggregate({
        where: whereMensalidadeCobranca,
        _sum: { valor: true },
      }),
      prisma.mensalidade.aggregate({
        where: {
          ...whereMensalidadeCobranca,
          vencimento: { lt: limites.inicioHoje },
        },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.cliente.findMany({
        where: {
          ...whereClienteParticipaCobranca(),
          ...whereAtrasado,
        },
        select: { id: true, nome: true, telefone: true, expiraEm: true },
        orderBy: { expiraEm: 'asc' },
        take: 10,
      }),
    ]);

    const aplicativosRequisitos = new Map(
      aplicativosCatalogo.map((app) => [app.id, app])
    );

    const clientesResumo = {
      total: totalClientes,
      ativos: ativosCount,
      atrasados: atrasadosCount,
      inativos: inativosCount,
      cortesia: cortesiaCount,
      somenteContato: somenteContatoCount,
      cadastrosIncompletos: contarCadastrosIncompletos(
        clientesGerenciados,
        aplicativosRequisitos
      ),
    };

    const recebidoHoje = recebidoHojeAgg._sum.valor ?? 0;
    const recebidoMes = recebidoMesAgg._sum.valor ?? 0;
    const aReceberEsteMes = pendentesEsteMesAgg._sum.valor ?? 0;
    const qtdEsteMes = pendentesEsteMesAgg._count;
    const aReceberProximosMeses = pendentesProximosMesesAgg._sum.valor ?? 0;
    const qtdProximosMeses = pendentesProximosMesesAgg._count;

    const faturamentoMensal = montarFaturamentoMensal(pagosUltimos6Meses, hoje);

    const vencendoLista = pendentesCobrancaJanela.filter((m) => {
      const dias = calcularDiasVencimento(m.vencimento);
      return dias >= 0 && dias <= diasAntecedencia;
    });
    const vencemHoje = vencendoLista.filter(
      (m) => calcularDiasVencimento(m.vencimento) === 0
    ).length;

    const proximosVencimentos = vencendoLista.map((m) => ({
      id: m.id,
      clienteId: m.clienteId,
      referencia: m.referencia,
      valor: m.valor,
      vencimento: m.vencimento.toISOString(),
      ultimoContatoEm: m.ultimoContatoEm?.toISOString() ?? null,
      clienteNome: m.cliente.nome,
      telefone: m.cliente.telefone,
    }));

    const idsAtencao = clientesAtencaoRaw.map((cliente) => cliente.id);
    const pendentesAtencao =
      idsAtencao.length === 0
        ? []
        : await prisma.mensalidade.findMany({
            where: {
              status: 'PENDENTE',
              clienteId: { in: idsAtencao },
            },
            select: {
              id: true,
              clienteId: true,
              referencia: true,
              valor: true,
              vencimento: true,
              bloqueioEnviadoEm: true,
            },
            orderBy: { vencimento: 'asc' },
          });
    const pendentePorCliente = primeiraMensalidadePorCliente(pendentesAtencao);

    const clientesAtencao = clientesAtencaoRaw.map((cliente) => {
      const pendente = pendentePorCliente.get(cliente.id);
      const status = calcularStatusCliente(cliente.expiraEm);
      return {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        expiraEm: cliente.expiraEm?.toISOString() ?? null,
        status: status as 'ATRASADO' | 'INATIVO',
        mensalidadePendenteId: pendente?.id ?? null,
        mensalidadeReferencia: pendente?.referencia ?? null,
        mensalidadeValor: pendente?.valor ?? null,
        mensalidadeVencimento: pendente?.vencimento.toISOString() ?? null,
        bloqueioEnviadoEm: pendente?.bloqueioEnviadoEm?.toISOString() ?? null,
      };
    });

    const elegiveis = pendentesCobrancaJanela.filter((m) =>
      elegivelRotinaCobrancaDiaria(m.vencimento)
    );
    const contactaveis = elegiveis.filter((m) =>
      telefoneValidoParaWhatsApp(m.cliente.telefone)
    );
    const semTelefone = elegiveis.length - contactaveis.length;
    const contactadosHoje = elegiveis.filter((m) =>
      contatoRegistradoHoje(m.ultimoContatoEm)
    ).length;
    const naoContactados = elegiveis.length - contactadosHoje;
    const rotinaFeita =
      elegiveis.length === 0 || contactadosHoje === elegiveis.length;
    const semTelefoneRotina = elegiveis.filter(
      (m) => !telefoneValidoParaWhatsApp(m.cliente.telefone)
    ).length;
    const etapasFunil = agruparResumoEtapasFunil(
      elegiveis,
      contatoRegistradoHoje
    );

    const alertas: AlertaOperacional[] = [];
    const pendenciasCadastro = resumirPendenciasCadastro(
      clientesGerenciados,
      aplicativosRequisitos
    );

    if (pendenciasCadastro.semTelefone > 0) {
      alertas.push({
        tipo: 'CADASTRO_SEM_TELEFONE',
        titulo: 'Telefone inválido ou ausente',
        descricao:
          'Clientes ativos/atrasados sem número válido para WhatsApp.',
        quantidade: pendenciasCadastro.semTelefone,
        rota: rotaPendenciaCadastro('SEM_TELEFONE'),
      });
    }

    if (pendenciasCadastro.semCredenciais > 0) {
      alertas.push({
        tipo: 'CADASTRO_SEM_CREDENCIAIS',
        titulo: 'Credenciais IPTV incompletas',
        descricao:
          'Falta servidor, usuário ou senha para acesso ao serviço.',
        quantidade: pendenciasCadastro.semCredenciais,
        rota: rotaPendenciaCadastro('SEM_CREDENCIAIS'),
      });
    }

    if (pendenciasCadastro.semPlano > 0) {
      alertas.push({
        tipo: 'CADASTRO_SEM_PLANO',
        titulo: 'Sem plano vinculado',
        descricao: 'Clientes gerenciados sem plano cadastrado.',
        quantidade: pendenciasCadastro.semPlano,
        rota: rotaPendenciaCadastro('SEM_PLANO'),
      });
    }

    if (pendenciasCadastro.semValor > 0) {
      alertas.push({
        tipo: 'CADASTRO_SEM_VALOR',
        titulo: 'Sem valor mensal',
        descricao: 'Clientes gerenciados com valor mensal zerado ou vazio.',
        quantidade: pendenciasCadastro.semValor,
        rota: rotaPendenciaCadastro('SEM_VALOR'),
      });
    }

    if (pendenciasCadastro.semExpiracao > 0) {
      alertas.push({
        tipo: 'CADASTRO_SEM_EXPIRACAO',
        titulo: 'Sem data de expiração',
        descricao: 'Clientes gerenciados sem vencimento do plano.',
        quantidade: pendenciasCadastro.semExpiracao,
        rota: rotaPendenciaCadastro('SEM_EXPIRACAO'),
      });
    }

    if (pendenciasCadastro.semAplicativo > 0) {
      alertas.push({
        tipo: 'CADASTRO_SEM_APLICATIVO',
        titulo: 'Sem aplicativo IPTV',
        descricao: 'Nenhum app vinculado ao cliente ou às telas.',
        quantidade: pendenciasCadastro.semAplicativo,
        rota: rotaPendenciaCadastro('SEM_APLICATIVO'),
      });
    }

    if (pendenciasCadastro.semMac > 0) {
      alertas.push({
        tipo: 'CADASTRO_SEM_MAC',
        titulo: 'Sem MAC cadastrada',
        descricao:
          'Apps que exigem MAC estão vinculados, mas o endereço não foi preenchido.',
        quantidade: pendenciasCadastro.semMac,
        rota: rotaPendenciaCadastro('SEM_MAC'),
      });
    }

    if (clientesResumo.cadastrosIncompletos > 0) {
      alertas.push({
        tipo: 'CADASTRO_INCOMPLETO',
        titulo: 'Cadastros incompletos',
        descricao:
          'Clientes pagantes sem plano, valor, vencimento ou credenciais completas. Cortesias não exigem plano nem valor.',
        quantidade: clientesResumo.cadastrosIncompletos,
        rota: '/clientes?incompleto=1',
      });
    }

    if (!rotinaFeita && elegiveis.length > 0) {
      alertas.push({
        tipo: 'ROTINA_PENDENTE',
        titulo: 'Rotina diária pendente',
        descricao: `${naoContactados} cliente(s) ainda não foram contactados hoje.`,
        quantidade: naoContactados,
        rota: '/cobranca-diaria?pendentes=1',
      });
    }

    const atrasadosSemContato = pendentesCobrancaAtrasados.filter((m) => {
      if (!telefoneValidoParaWhatsApp(m.cliente.telefone)) return false;
      return !contatoRegistradoHoje(m.ultimoContatoEm);
    }).length;

    if (atrasadosSemContato > 0) {
      alertas.push({
        tipo: 'NAO_CONTACTADO',
        titulo: 'Atrasados sem contato hoje',
        descricao: `${atrasadosSemContato} cobrança(s) atrasada(s) ainda não contactadas hoje.`,
        quantidade: atrasadosSemContato,
        rota: '/financeiro?status=ATRASADO',
      });
    }

    if (vencemHoje > 0) {
      alertas.push({
        tipo: 'VENCE_HOJE',
        titulo: 'Vencem hoje',
        descricao: `${vencemHoje} mensalidade(s) com vencimento hoje.`,
        quantidade: vencemHoje,
        rota: '/vencimentos?filtro=HOJE',
      });
    }

    if (semTelefoneRotina > 0) {
      alertas.push({
        tipo: 'SEM_TELEFONE',
        titulo: 'Telefone inválido na rotina',
        descricao:
          'Cobranças elegíveis hoje sem número válido para WhatsApp.',
        quantidade: semTelefoneRotina,
        rota: '/cobranca-diaria',
      });
    }

    if (expiradosSemMensalidade > 0) {
      alertas.push({
        tipo: 'EXPIRADO_SEM_MENSALIDADE',
        titulo: 'Expirados sem cobrança pendente',
        descricao:
          'Clientes atrasados ou inativos sem mensalidade PENDENTE registrada.',
        quantidade: expiradosSemMensalidade,
        rota: '/clientes?status=INATIVO',
      });
    }

    const referenciaTarefas = inicioDiaUtc(hoje);
    const [tarefasContagem, tarefasProximasRaw] = await Promise.all([
      tarefaRepository.contarPendentes(),
      tarefaRepository.findPendentesResumo(6),
    ]);

    const tarefasProximas = tarefasProximasRaw.map((tarefa) => ({
      id: tarefa.id,
      titulo: tarefa.titulo,
      vencimentoEm: formatarDataIsoUtc(tarefa.vencimentoEm),
      clienteId: tarefa.clienteId,
      clienteNome: tarefa.cliente?.nome ?? null,
      atrasada: tarefaEstaAtrasada(tarefa.vencimentoEm, referenciaTarefas),
    }));

    if (tarefasContagem.atrasadas > 0) {
      alertas.push({
        tipo: 'TAREFAS_ATRASADAS',
        titulo: 'Tarefas atrasadas',
        descricao: `${tarefasContagem.atrasadas} lembrete(s) com data passada.`,
        quantidade: tarefasContagem.atrasadas,
        rota: '/tarefas?filtro=ATRASADAS',
      });
    } else if (tarefasContagem.hoje > 0) {
      alertas.push({
        tipo: 'TAREFAS_HOJE',
        titulo: 'Tarefas para hoje',
        descricao: `${tarefasContagem.hoje} lembrete(s) com vencimento hoje.`,
        quantidade: tarefasContagem.hoje,
        rota: '/tarefas?filtro=HOJE',
      });
    }

    if (alertas.length === 0 && rotinaFeita && elegiveis.length > 0) {
      alertas.push({
        tipo: 'ROTINA_CONCLUIDA',
        titulo: 'Rotina concluída',
        descricao: 'Todos os clientes elegíveis foram contactados hoje.',
        quantidade: contactadosHoje,
        rota: '/cobranca-diaria',
      });
    }

    const mrr = clientesAtivosComercial.reduce(
      (total, cliente) =>
        total + (cliente.valorMensal > 0 ? cliente.valorMensal : 0),
      0
    );
    const arrAno = hoje.getFullYear();
    const arrMesesRestantes = 12 - hoje.getMonth();
    const arr = Math.round(mrr * arrMesesRestantes * 100) / 100;
    const ticketMedio =
      clientesAtivosComercial.length > 0
        ? mrr / clientesAtivosComercial.length
        : 0;
    const conexoes = clientesAtivosComercial.reduce(
      (total, cliente) => total + (cliente.qtdTelas > 0 ? cliente.qtdTelas : 1),
      0
    );

    const variacaoNovosClientes = 0;

    const metaNovosClientesPercentual =
      metaNovosClientes.qtd > 0
        ? Math.min(
            100,
            Math.round((metaClientesAtual / metaNovosClientes.qtd) * 100)
          )
        : 0;
    const metaNovosClientesAtingida =
      metaClientesAtual >= metaNovosClientes.qtd;

    const vencendoQtd = vencendoLista.length;
    const vencendoValor = vencendoLista.reduce((total, m) => total + m.valor, 0);

    const cobrancaAtrasadaQtd = cobrancaAtrasadaAgg._count;
    const cobrancaAtrasadaValor = cobrancaAtrasadaAgg._sum.valor ?? 0;
    const totalPendenteValor = totalPendenteCobrancaAgg._sum.valor ?? 0;
    const inadimplenciaPercentual =
      totalPendenteValor > 0
        ? Math.round((cobrancaAtrasadaValor / totalPendenteValor) * 1000) / 10
        : 0;

    const retencaoPercentual =
      totalClientes > 0
        ? Math.round((clientesResumo.ativos / totalClientes) * 1000) / 10
        : 0;
    const churnPercentual =
      totalClientes > 0
        ? Math.round((clientesResumo.inativos / totalClientes) * 1000) / 10
        : 0;

    const ganhosProximoAnoAno = arrAno + 1;
    const ganhosProximoAno = Math.round(mrr * 12 * 100) / 100;

    return {
      clientes: clientesResumo,
      financeiro: {
        recebidoHoje,
        recebidoMes,
        aReceberEsteMes,
        qtdEsteMes,
        vencemHoje,
        aReceberProximosMeses,
        qtdProximosMeses,
      },
      faturamentoMensal,
      proximosVencimentos,
      clientesAtencao,
      cobrancaDiaria: {
        totalElegiveis: elegiveis.length,
        contactadosHoje,
        contactaveis: contactaveis.length,
        semTelefone,
        naoContactados,
        rotinaFeita,
        etapasFunil,
      },
      alertas,
      tarefas: {
        pendentes: tarefasContagem.pendentes,
        hoje: tarefasContagem.hoje,
        atrasadas: tarefasContagem.atrasadas,
        proximas: tarefasProximas,
      },
      metricas: {
        mrr,
        arr,
        arrMesesRestantes,
        arrAno,
        ticketMedio,
        conexoes,
        novosClientesPeriodo: metaClientesAtual,
        metaClientesAtual,
        metaNovosClientesQtd: metaNovosClientes.qtd,
        metaNovosClientesInicioEm: metaNovosClientes.inicioEm,
        metaNovosClientesFimEm: metaNovosClientes.fimEm,
        metaNovosClientesDias: metaNovosClientes.diasPeriodo,
        metaNovosClientesDiasRestantes: metaNovosClientes.diasRestantes,
        metaNovosClientesEncerrada: metaNovosClientes.encerrada,
        metaNovosClientesPercentual,
        metaNovosClientesAtingida,
        variacaoNovosClientes,
        vencendoQtd,
        vencendoValor,
        cobrancaAtrasadaQtd,
        cobrancaAtrasadaValor,
        retencaoPercentual,
        churnPercentual,
        inadimplenciaPercentual,
        ganhosProximoAno,
        ganhosProximoAnoAno,
      },
    };
  }
}

export const dashboardService = new DashboardService();
