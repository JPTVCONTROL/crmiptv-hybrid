import { Configuracao, Mensalidade, DashboardResumo, AlertaOperacional } from '../../core/models';
import { calcularDias, resolverValorMensalidade, rotuloPrazoVencimento } from './formatters';
import {
  CRONOGRAMA_COBRANCAS_AUTOMACAO,
  CRONOGRAMA_LEMBRETES_AUTOMACAO,
  PontoDisparoAutomacao,
  resolverPontoDisparo,
  elegivelRotinaProgressiva,
  rotuloPontoDisparo,
  tipoRotinaProgressiva,
} from './automacao-disparo';
import {
  montarMensagemBloqueioMensalidade,
  montarMensagemCobrancaMensalidade,
  nomeClienteMensalidade,
} from './cobranca-lote';
import { telefoneValidoParaWhatsApp } from './whatsapp';
import { clienteUltrapassouLimiteCobranca } from './cliente-arquivamento.util';
import { contatoRegistradoHoje } from './contato';

/** Valor padrão quando não há configuração salva. */
export const DIAS_ANTECEDENCIA_LEMBRETE_PADRAO = 5;

/** Janela do card "Próximos vencimentos" no dashboard (funil: até D5). */
export const JANELA_PROXIMOS_VENCIMENTOS_DIAS = DIAS_ANTECEDENCIA_LEMBRETE_PADRAO;

export function resolverDiasAntecedencia(
  configuracao?: Configuracao | null
): number {
  const valor = configuracao?.diasAntecedenciaLembrete;
  if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 1 && valor <= 30) {
    return Math.trunc(valor);
  }
  return DIAS_ANTECEDENCIA_LEMBRETE_PADRAO;
}

export type TipoCobrancaDiaria = 'ATRASADO' | 'A_VENCER';

export interface ItemCobrancaDiaria {
  mensalidadeId: number;
  clienteId: number;
  nome: string;
  referencia: string;
  valor: number;
  vencimento: string;
  dias: number;
  tipo: TipoCobrancaDiaria;
  pontoDisparo?: string | null;
  telefone: string;
  telefoneValido: boolean;
  ultimoContatoEm?: string | null;
  bloqueioEnviadoEm?: string | null;
  mensagem: string;
  mensagemBloqueio?: string;
}

export function tipoCobrancaDiaria(vencimento: string): TipoCobrancaDiaria {
  return calcularDias(vencimento) < 0 ? 'ATRASADO' : 'A_VENCER';
}

export function elegivelCobrancaDiaria(
  vencimento: string,
  diasAntecedencia = DIAS_ANTECEDENCIA_LEMBRETE_PADRAO
): boolean {
  const dias = calcularDias(vencimento);
  return dias < 0 || (dias >= 0 && dias <= diasAntecedencia);
}

/** Rotina diária: apenas dias fixos do funil progressivo (5, 3, 1, 0, -1, -2, -3, -7). */
export function elegivelRotinaCobrancaDiaria(vencimento: string): boolean {
  const dias = calcularDias(vencimento);
  return resolverPontoDisparo(dias) !== null && elegivelRotinaProgressiva(dias);
}

export function clienteEhCortesia(
  cliente?: { cortesia?: boolean | null } | null
): boolean {
  return cliente?.cortesia === true;
}

export function clienteEhSomenteContato(
  cliente?: { somenteContato?: boolean | null } | null
): boolean {
  return cliente?.somenteContato === true;
}

export function clienteParticipaCobrancas(
  cliente?: {
    ativo?: boolean | null;
    incluirCobrancas?: boolean | null;
    cortesia?: boolean | null;
    somenteContato?: boolean | null;
    expiraEm?: string | null;
  } | null
): boolean {
  if (cliente?.ativo === false) {
    return false;
  }
  if (cliente?.somenteContato === true) {
    return false;
  }
  if (clienteEhCortesia(cliente)) {
    return false;
  }
  if (clienteUltrapassouLimiteCobranca(cliente?.expiraEm)) {
    return false;
  }
  return cliente?.incluirCobrancas !== false;
}

export function clienteApareceEmVencimentos(
  cliente?: {
    ativo?: boolean | null;
    incluirCobrancas?: boolean | null;
    somenteContato?: boolean | null;
    expiraEm?: string | null;
  } | null
): boolean {
  if (cliente?.ativo === false) {
    return false;
  }
  if (clienteEhSomenteContato(cliente)) {
    return false;
  }
  if (clienteUltrapassouLimiteCobranca(cliente?.expiraEm)) {
    return false;
  }
  return cliente?.incluirCobrancas !== false;
}

export function rotuloDiasCobrancaDiaria(dias: number): string {
  return rotuloPrazoVencimento(dias);
}

export function rotuloTipoCobrancaDiaria(tipo: TipoCobrancaDiaria): string {
  return tipo === 'ATRASADO' ? 'Cobrança' : 'Lembrete';
}

export const ORDEM_PONTOS_FUNIL: PontoDisparoAutomacao[] = [
  ...CRONOGRAMA_LEMBRETES_AUTOMACAO.map(
    (e) => `LEMBRETE_D${e.dias}` as PontoDisparoAutomacao
  ),
  ...CRONOGRAMA_COBRANCAS_AUTOMACAO.map(
    (e) => `COBRANCA_D${e.dias}` as PontoDisparoAutomacao
  ),
];

export function mensalidadeElegivelCobrancaDiaria(
  mensalidade: Pick<Mensalidade, 'status' | 'vencimento' | 'cliente'>
): boolean {
  if (mensalidade.status !== 'PENDENTE') {
    return false;
  }
  if (!clienteParticipaCobrancas(mensalidade.cliente)) {
    return false;
  }
  const dias = calcularDias(mensalidade.vencimento);
  return resolverPontoDisparo(dias) !== null && elegivelRotinaProgressiva(dias);
}

export function filtrarMensalidadesCobrancaDiaria(
  mensalidades: Mensalidade[]
): Mensalidade[] {
  return mensalidades
    .filter((m) => mensalidadeElegivelCobrancaDiaria(m))
    .sort(
      (a, b) =>
        new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
    );
}

export interface EtapaCobrancaDiaria {
  ponto: PontoDisparoAutomacao;
  rotulo: string;
  tipo: TipoCobrancaDiaria;
  itens: ItemCobrancaDiaria[];
}

export function agruparItensPorEtapaFunil(
  itens: ItemCobrancaDiaria[]
): EtapaCobrancaDiaria[] {
  return ORDEM_PONTOS_FUNIL.map((ponto) => {
    const lista = itens.filter((item) => item.pontoDisparo === ponto);
    if (lista.length === 0) {
      return null;
    }
    return {
      ponto,
      rotulo: rotuloPontoDisparo(ponto),
      tipo: lista[0]?.tipo ?? 'A_VENCER',
      itens: lista,
    };
  }).filter((etapa): etapa is EtapaCobrancaDiaria => etapa !== null);
}

export function resumoEtapasFunilHoje(itens: ItemCobrancaDiaria[]): string {
  const etapas = agruparItensPorEtapaFunil(itens);
  if (etapas.length === 0) {
    return 'Nenhuma etapa do funil ativa hoje';
  }
  return etapas
    .map((etapa) => `${etapa.rotulo} (${etapa.itens.length})`)
    .join(' · ');
}

export function montarItensCobrancaDiaria(
  mensalidades: Mensalidade[],
  telefones: Map<number, string>,
  configuracao: Configuracao | null,
  nomes?: Map<number, string>
): ItemCobrancaDiaria[] {
  return filtrarMensalidadesCobrancaDiaria(mensalidades).map((m) => {
    const dias = calcularDias(m.vencimento);
    const tipo = tipoCobrancaDiaria(m.vencimento);
    const pontoDisparo = resolverPontoDisparo(dias);
    const telefone =
      m.cliente?.telefone?.trim() ?? telefones.get(m.clienteId) ?? '';
    const atrasado = tipo === 'ATRASADO';

    return {
      mensalidadeId: m.id,
      clienteId: m.clienteId,
      nome: nomeClienteMensalidade(m, nomes) || 'Cliente',
      referencia: m.referencia,
      valor: resolverValorMensalidade(m),
      vencimento: m.vencimento,
      dias,
      tipo,
      pontoDisparo,
      telefone,
      telefoneValido: telefoneValidoParaWhatsApp(telefone),
      ultimoContatoEm: m.ultimoContatoEm ?? null,
      bloqueioEnviadoEm: m.bloqueioEnviadoEm ?? null,
      mensagem: montarMensagemCobrancaMensalidade(
        m,
        configuracao,
        nomes,
        atrasado,
        undefined,
        pontoDisparo
      ),
      mensagemBloqueio: atrasado
        ? montarMensagemBloqueioMensalidade(m, configuracao, nomes)
        : undefined,
    };
  });
}

export function trackByItemCobrancaDiaria(
  _index: number,
  item: ItemCobrancaDiaria
): number {
  return item.mensalidadeId;
}

export interface ResumoRotinaCobrancaDiaria {
  totalElegiveis: number;
  contactadosHoje: number;
  contactaveis: number;
  semTelefone: number;
  naoContactados: number;
  rotinaFeita: boolean;
  etapasFunil: Array<{
    ponto: PontoDisparoAutomacao;
    rotulo: string;
    tipo: 'LEMBRETE' | 'COBRANCA';
    total: number;
    contactadosHoje: number;
    pendentes: number;
  }>;
}

export function agruparResumoEtapasFunilHoje(
  mensalidades: Mensalidade[]
): ResumoRotinaCobrancaDiaria['etapasFunil'] {
  const porPonto = new Map<
    PontoDisparoAutomacao,
    ResumoRotinaCobrancaDiaria['etapasFunil'][number]
  >();

  for (const mensalidade of filtrarMensalidadesCobrancaDiaria(mensalidades)) {
    const dias = calcularDias(mensalidade.vencimento);
    const ponto = resolverPontoDisparo(dias);
    if (!ponto) {
      continue;
    }

    const atual = porPonto.get(ponto) ?? {
      ponto,
      rotulo: rotuloPontoDisparo(ponto),
      tipo: tipoRotinaProgressiva(ponto),
      total: 0,
      contactadosHoje: 0,
      pendentes: 0,
    };

    atual.total += 1;
    if (contatoRegistradoHoje(mensalidade.ultimoContatoEm)) {
      atual.contactadosHoje += 1;
    } else {
      atual.pendentes += 1;
    }

    porPonto.set(ponto, atual);
  }

  return ORDEM_PONTOS_FUNIL.filter((ponto) => porPonto.has(ponto)).map(
    (ponto) => porPonto.get(ponto)!
  );
}

export function montarResumoRotinaCobrancaDiaria(
  mensalidades: Mensalidade[]
): ResumoRotinaCobrancaDiaria {
  const elegiveis = filtrarMensalidadesCobrancaDiaria(mensalidades);
  const contactaveis = elegiveis.filter((mensalidade) =>
    telefoneValidoParaWhatsApp(mensalidade.cliente?.telefone ?? '')
  );
  const contactadosHoje = elegiveis.filter((mensalidade) =>
    contatoRegistradoHoje(mensalidade.ultimoContatoEm)
  ).length;
  const totalElegiveis = elegiveis.length;
  const naoContactados = totalElegiveis - contactadosHoje;

  return {
    totalElegiveis,
    contactadosHoje,
    contactaveis: contactaveis.length,
    semTelefone: totalElegiveis - contactaveis.length,
    naoContactados,
    rotinaFeita: totalElegiveis === 0 || contactadosHoje === totalElegiveis,
    etapasFunil: agruparResumoEtapasFunilHoje(mensalidades),
  };
}

export function montarProximosVencimentosDashboard(
  mensalidades: Mensalidade[]
): DashboardResumo['proximosVencimentos'] {
  return mensalidades
    .filter((mensalidade) => {
      if (mensalidade.status !== 'PENDENTE') {
        return false;
      }
      if (!clienteParticipaCobrancas(mensalidade.cliente)) {
        return false;
      }
      const dias = calcularDias(mensalidade.vencimento);
      return dias >= 0 && dias <= JANELA_PROXIMOS_VENCIMENTOS_DIAS;
    })
    .sort(
      (a, b) =>
        new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
    )
    .map((mensalidade) => ({
      id: mensalidade.id,
      clienteId: mensalidade.clienteId,
      referencia: mensalidade.referencia,
      valor: resolverValorMensalidade(mensalidade),
      vencimento: mensalidade.vencimento,
      ultimoContatoEm: mensalidade.ultimoContatoEm ?? null,
      clienteNome: mensalidade.cliente?.nome?.trim() || 'Cliente',
      telefone: mensalidade.cliente?.telefone ?? '',
    }));
}

function ajustarAlertasRotinaDashboard(
  alertas: AlertaOperacional[],
  rotina: ResumoRotinaCobrancaDiaria
): AlertaOperacional[] {
  const demais = alertas.filter(
    (alerta) =>
      alerta.tipo !== 'ROTINA_PENDENTE' && alerta.tipo !== 'ROTINA_CONCLUIDA'
  );

  if (rotina.naoContactados > 0) {
    demais.push({
      tipo: 'ROTINA_PENDENTE',
      titulo: 'Rotina diária pendente',
      descricao: `${rotina.naoContactados} cliente(s) ainda não foram contactados hoje.`,
      quantidade: rotina.naoContactados,
      rota: '/cobranca-diaria?pendentes=1',
    });
  } else if (rotina.totalElegiveis > 0 && rotina.rotinaFeita) {
    demais.push({
      tipo: 'ROTINA_CONCLUIDA',
      titulo: 'Rotina concluída',
      descricao: 'Todos os clientes elegíveis foram contactados hoje.',
      quantidade: rotina.contactadosHoje,
      rota: '/cobranca-diaria',
    });
  }

  return demais;
}

/** Alinha rotina do dashboard com a página Cobrança Diária (mesma base de mensalidades). */
export function sincronizarResumoDashboardRotina(
  resumo: DashboardResumo,
  mensalidades: Mensalidade[]
): DashboardResumo {
  const cobrancaDiaria = montarResumoRotinaCobrancaDiaria(mensalidades);
  const proximosVencimentos = montarProximosVencimentosDashboard(mensalidades);
  const vencendoValor = proximosVencimentos.reduce(
    (total, item) => total + item.valor,
    0
  );
  const vencemHoje = proximosVencimentos.filter(
    (item) => calcularDias(item.vencimento) === 0
  ).length;

  return {
    ...resumo,
    cobrancaDiaria,
    proximosVencimentos,
    financeiro: {
      ...resumo.financeiro,
      vencemHoje,
    },
    metricas: {
      ...resumo.metricas,
      vencendoQtd: proximosVencimentos.length,
      vencendoValor,
    },
    alertas: ajustarAlertasRotinaDashboard(resumo.alertas ?? [], cobrancaDiaria),
  };
}

export { rotuloPontoDisparo };
