import prisma from '../config/database.js';
import { configuracaoRepository } from '../repositories/configuracaoRepository.js';
import { calcularStatusCliente } from '../utils/helpers/clienteStatus.js';
import {
  calcularDiasVencimento,
  clienteParticipaCobrancas,
  elegivelCobrancaDiaria,
  resolverDiasAntecedencia,
} from '../utils/helpers/cobrancaDiariaHelpers.js';
import {
  contatoRegistradoHoje,
  telefoneValidoParaWhatsApp,
} from '../utils/helpers/contatoHelpers.js';
import { parseDataSomenteDia } from '../utils/helpers/dateHelpers.js';

import {
  resumirPendenciasCadastro,
  rotaPendenciaCadastro,
  contarCadastrosIncompletos,
} from '../utils/helpers/clienteCadastroHelpers.js';

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
    | 'ROTINA_CONCLUIDA';
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
  }>;
  cobrancaDiaria: {
    totalElegiveis: number;
    contactadosHoje: number;
    contactaveis: number;
    semTelefone: number;
    naoContactados: number;
    rotinaFeita: boolean;
  };
  alertas: AlertaOperacional[];
  metricas: {
    mrr: number;
    arr: number;
    arrMesesRestantes: number;
    arrAno: number;
    ticketMedio: number;
    conexoes: number;
    novosClientes30d: number;
    variacaoNovosClientes: number;
    vencendoQtd: number;
    vencendoValor: number;
    cobrancaAtrasadaQtd: number;
    cobrancaAtrasadaValor: number;
    retencaoPercentual: number;
    churnPercentual: number;
    inadimplenciaPercentual: number;
    permanenciaMediaMeses: number;
    ltvEstimado: number;
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

export class DashboardService {
  async obterResumo(): Promise<DashboardResumo> {
    const [clientes, mensalidades, configuracao, aplicativosCatalogo] = await Promise.all([
      prisma.cliente.findMany({
        select: {
          id: true,
          nome: true,
          telefone: true,
          planoId: true,
          valorMensal: true,
          expiraEm: true,
          incluirCobrancas: true,
          cortesia: true,
          servidor: true,
          usuario: true,
          senha: true,
          aplicativoId: true,
          dispositivos: true,
          macAddress: true,
          qtdTelas: true,
          createdAt: true,
        },
      }),
      prisma.mensalidade.findMany({
        include: {
          cliente: {
            select: {
              id: true,
              nome: true,
              telefone: true,
              expiraEm: true,
              incluirCobrancas: true,
              cortesia: true,
            },
          },
        },
        orderBy: { vencimento: 'asc' },
      }),
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

    const pendentes = mensalidades.filter((m) => m.status === 'PENDENTE');
    const pagos = mensalidades.filter((m) => m.status === 'PAGO');

    const aplicativosRequisitos = new Map(
      aplicativosCatalogo.map((app) => [app.id, app])
    );

    const clientesResumo = {
      total: clientes.length,
      ativos: clientes.filter((c) => calcularStatusCliente(c.expiraEm) === 'ATIVO')
        .length,
      atrasados: clientes.filter(
        (c) => calcularStatusCliente(c.expiraEm) === 'ATRASADO'
      ).length,
      inativos: clientes.filter(
        (c) => calcularStatusCliente(c.expiraEm) === 'INATIVO'
      ).length,
      cortesia: clientes.filter((c) => c.cortesia).length,
      cadastrosIncompletos: contarCadastrosIncompletos(
        clientes,
        aplicativosRequisitos
      ),
    };

    const recebidoHoje = pagos
      .filter((m) => {
        if (!m.pagoEm) return false;
        const pago = new Date(m.pagoEm);
        return (
          pago.getFullYear() === hoje.getFullYear() &&
          pago.getMonth() === hoje.getMonth() &&
          pago.getDate() === hoje.getDate()
        );
      })
      .reduce((total, m) => total + m.valor, 0);

    const recebidoMes = pagos
      .filter((m) => {
        if (!m.pagoEm) return false;
        const pago = new Date(m.pagoEm);
        return (
          pago.getMonth() === hoje.getMonth() &&
          pago.getFullYear() === hoje.getFullYear()
        );
      })
      .reduce((total, m) => total + m.valor, 0);

    const pendentesEsteMes = pendentes.filter((m) => {
      const vencimento = parseDataSomenteDia(m.vencimento);
      return (
        vencimento.getUTCMonth() === hoje.getMonth() &&
        vencimento.getUTCFullYear() === hoje.getFullYear()
      );
    });
    const aReceberEsteMes = pendentesEsteMes.reduce((total, m) => total + m.valor, 0);
    const qtdEsteMes = pendentesEsteMes.length;
    const pendentesCobranca = pendentes.filter((m) =>
      clienteParticipaCobrancas(m.cliente)
    );
    const pendentesProximosMeses = pendentes.filter((m) => {
      const vencimento = parseDataSomenteDia(m.vencimento);
      const inicioProximoMesUtc = Date.UTC(
        hoje.getFullYear(),
        hoje.getMonth() + 1,
        1
      );
      const vencUtc = Date.UTC(
        vencimento.getUTCFullYear(),
        vencimento.getUTCMonth(),
        vencimento.getUTCDate()
      );
      return vencUtc >= inicioProximoMesUtc;
    });
    const aReceberProximosMeses = pendentesProximosMeses.reduce(
      (total, m) => total + m.valor,
      0
    );
    const qtdProximosMeses = pendentesProximosMeses.length;
    const vencemHoje = pendentesCobranca.filter(
      (m) => calcularDiasVencimento(m.vencimento) === 0
    ).length;

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

    const proximosVencimentos = pendentesCobranca
      .filter((m) => {
        const dias = calcularDiasVencimento(m.vencimento);
        return dias >= 0 && dias <= diasAntecedencia;
      })
      .map((m) => ({
        id: m.id,
        clienteId: m.clienteId,
        referencia: m.referencia,
        valor: m.valor,
        vencimento: m.vencimento.toISOString(),
        ultimoContatoEm: m.ultimoContatoEm?.toISOString() ?? null,
        clienteNome: m.cliente.nome,
        telefone: m.cliente.telefone,
      }));

    const pendentesPorCliente = new Map<
      number,
      { id: number; referencia: string; valor: number; vencimento: Date }
    >();
    for (const mensalidade of pendentes) {
      pendentesPorCliente.set(mensalidade.clienteId, {
        id: mensalidade.id,
        referencia: mensalidade.referencia,
        valor: mensalidade.valor,
        vencimento: mensalidade.vencimento,
      });
    }

    const clientesAtencao = clientes
      .filter((cliente) => clienteParticipaCobrancas(cliente))
      .map((cliente) => {
        const pendente = pendentesPorCliente.get(cliente.id);
        return {
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          expiraEm: cliente.expiraEm?.toISOString() ?? null,
          status: calcularStatusCliente(cliente.expiraEm),
          mensalidadePendenteId: pendente?.id ?? null,
          mensalidadeReferencia: pendente?.referencia ?? null,
          mensalidadeValor: pendente?.valor ?? null,
          mensalidadeVencimento: pendente?.vencimento.toISOString() ?? null,
        };
      })
      .filter(
        (cliente): cliente is typeof cliente & { status: 'ATRASADO' | 'INATIVO' } =>
          cliente.status === 'ATRASADO' || cliente.status === 'INATIVO'
      )
      .sort((a, b) => {
        const da = a.expiraEm ? new Date(a.expiraEm).getTime() : 0;
        const db = b.expiraEm ? new Date(b.expiraEm).getTime() : 0;
        return da - db;
      })
      .slice(0, 10);

    const elegiveis = pendentes.filter(
      (m) =>
        elegivelCobrancaDiaria(m.vencimento, diasAntecedencia) &&
        clienteParticipaCobrancas(m.cliente)
    );
    const contactaveis = elegiveis.filter((m) =>
      telefoneValidoParaWhatsApp(m.cliente.telefone)
    );
    const semTelefone = elegiveis.length - contactaveis.length;
    const contactadosHoje = contactaveis.filter((m) =>
      contatoRegistradoHoje(m.ultimoContatoEm)
    ).length;
    const naoContactados = contactaveis.length - contactadosHoje;
    const rotinaFeita =
      contactaveis.length === 0 || contactadosHoje === contactaveis.length;

    const semTelefoneRotina = elegiveis.filter(
      (m) => !telefoneValidoParaWhatsApp(m.cliente.telefone)
    ).length;

    const expiradosSemMensalidade = clientes.filter((cliente) => {
      if (!cliente.expiraEm) return false;
      const status = calcularStatusCliente(cliente.expiraEm);
      if (status === 'ATIVO') return false;
      return !pendentesPorCliente.has(cliente.id);
    }).length;

    const alertas: AlertaOperacional[] = [];

    const pendenciasCadastro = resumirPendenciasCadastro(
      clientes,
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
          'Clientes sem plano, valor, vencimento ou credenciais completas.',
        quantidade: clientesResumo.cadastrosIncompletos,
        rota: '/clientes?incompleto=1',
      });
    }

    if (!rotinaFeita && contactaveis.length > 0) {
      alertas.push({
        tipo: 'ROTINA_PENDENTE',
        titulo: 'Rotina diária pendente',
        descricao: `${naoContactados} cliente(s) ainda não foram contactados hoje.`,
        quantidade: naoContactados,
        rota: '/cobranca-diaria?pendentes=1',
      });
    }

    const atrasadosSemContato = pendentesCobranca.filter((m) => {
      if (calcularDiasVencimento(m.vencimento) >= 0) return false;
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

    if (alertas.length === 0 && rotinaFeita && contactaveis.length > 0) {
      alertas.push({
        tipo: 'ROTINA_CONCLUIDA',
        titulo: 'Rotina concluída',
        descricao: 'Todos os clientes elegíveis foram contactados hoje.',
        quantidade: contactadosHoje,
        rota: '/cobranca-diaria',
      });
    }

    const clientesAtivosLista = clientes.filter(
      (c) =>
        calcularStatusCliente(c.expiraEm) === 'ATIVO' && !c.cortesia
    );
    const mrr = clientesAtivosLista.reduce(
      (total, cliente) => total + (cliente.valorMensal > 0 ? cliente.valorMensal : 0),
      0
    );
    const arrAno = hoje.getFullYear();
    const arrMesesRestantes = 12 - hoje.getMonth();
    const arr = Math.round(mrr * arrMesesRestantes * 100) / 100;
    const ticketMedio =
      clientesAtivosLista.length > 0 ? mrr / clientesAtivosLista.length : 0;
    const conexoes = clientesAtivosLista.reduce(
      (total, cliente) => total + (cliente.qtdTelas > 0 ? cliente.qtdTelas : 1),
      0
    );

    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const sessentaDiasAtras = new Date(hoje);
    sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);

    const novosClientes30d = clientes.filter(
      (cliente) => cliente.createdAt >= trintaDiasAtras
    ).length;
    const novosPeriodoAnterior = clientes.filter(
      (cliente) =>
        cliente.createdAt >= sessentaDiasAtras &&
        cliente.createdAt < trintaDiasAtras
    ).length;
    const variacaoNovosClientes =
      novosPeriodoAnterior === 0
        ? novosClientes30d > 0
          ? 100
          : 0
        : Math.round(
            ((novosClientes30d - novosPeriodoAnterior) / novosPeriodoAnterior) *
              100
          );

    const vencendoLista = pendentesCobranca.filter((m) => {
      const dias = calcularDiasVencimento(m.vencimento);
      return dias >= 0 && dias <= diasAntecedencia;
    });
    const vencendoQtd = vencendoLista.length;
    const vencendoValor = vencendoLista.reduce((total, m) => total + m.valor, 0);

    const cobrancaAtrasadaLista = pendentesCobranca.filter(
      (m) => calcularDiasVencimento(m.vencimento) < 0
    );
    const cobrancaAtrasadaQtd = cobrancaAtrasadaLista.length;
    const cobrancaAtrasadaValor = cobrancaAtrasadaLista.reduce(
      (total, m) => total + m.valor,
      0
    );

    const totalPendenteValor = pendentesCobranca.reduce(
      (total, m) => total + m.valor,
      0
    );
    const inadimplenciaPercentual =
      totalPendenteValor > 0
        ? Math.round((cobrancaAtrasadaValor / totalPendenteValor) * 1000) / 10
        : 0;

    const retencaoPercentual =
      clientes.length > 0
        ? Math.round((clientesResumo.ativos / clientes.length) * 1000) / 10
        : 0;
    const churnPercentual =
      clientes.length > 0
        ? Math.round((clientesResumo.inativos / clientes.length) * 1000) / 10
        : 0;

    const permanenciaMediaMeses =
      clientesAtivosLista.length > 0
        ? clientesAtivosLista.reduce((total, cliente) => {
            const meses =
              (hoje.getTime() - cliente.createdAt.getTime()) /
              (1000 * 60 * 60 * 24 * 30.44);
            return total + Math.max(0, meses);
          }, 0) / clientesAtivosLista.length
        : 0;
    const ltvEstimado = ticketMedio * permanenciaMediaMeses;

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
      },
      alertas,
      metricas: {
        mrr,
        arr,
        arrMesesRestantes,
        arrAno,
        ticketMedio,
        conexoes,
        novosClientes30d,
        variacaoNovosClientes,
        vencendoQtd,
        vencendoValor,
        cobrancaAtrasadaQtd,
        cobrancaAtrasadaValor,
        retencaoPercentual,
        churnPercentual,
        inadimplenciaPercentual,
        permanenciaMediaMeses: Math.round(permanenciaMediaMeses * 10) / 10,
        ltvEstimado: Math.round(ltvEstimado * 100) / 100,
      },
    };
  }
}

export const dashboardService = new DashboardService();
