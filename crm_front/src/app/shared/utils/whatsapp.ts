import { formatarData, resolverTelefoneCliente } from './formatters';
import { notificar } from './toast-notifier';
import { confirmarUsuario } from './confirm-notifier';
import { Mensalidade } from '../../core/models';
import {
  formatarTelefoneWhatsApp,
  telefoneValidoParaWhatsApp,
} from './telefone.util';
import {
  MENSAGEM_BLOQUEIO_PADRAO,
  MENSAGEM_COBRANCA_LEMBRETE_PADRAO,
  MENSAGEM_COBRANCA_PADRAO,
  MENSAGEM_RECIBO_PADRAO,
  MENSAGEM_RENOVACAO_PADRAO,
} from './mensagens-padrao';

export { formatarTelefoneWhatsApp, telefoneValidoParaWhatsApp };

export interface DadosMensagemWhatsApp {
  nome: string;
  referencia: string;
  valor: number;
  vencimento: string;
  empresa: string;
  pix?: string;
  tipoPix?: string;
  favorecido?: string;
  expiraEm?: string;
  pagoEm?: string;
}

export interface DadosMensagemCobranca extends DadosMensagemWhatsApp {
  atrasado: boolean;
}

function formatarValorMsg(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataMsg(data: string): string {
  return formatarData(data);
}

function montarLinhaPix(dados: DadosMensagemWhatsApp): string {
  if (!dados.pix?.trim()) return '';
  const tipo = dados.tipoPix?.trim() ? ` (${dados.tipoPix})` : '';
  const favorecido = dados.favorecido?.trim()
    ? `\nFavorecido: ${dados.favorecido}`
    : '';
  return `\n\nPIX${tipo}: ${dados.pix}${favorecido}`;
}

function substituirVariaveis(
  template: string,
  dados: DadosMensagemWhatsApp
): string {
  const pix = dados.pix?.trim() ?? '';
  const tipoPix = dados.tipoPix?.trim() ?? '';
  const favorecido = dados.favorecido?.trim() ?? '';
  const expiraEm = dados.expiraEm?.trim()
    ? formatarDataMsg(dados.expiraEm)
    : formatarDataMsg(dados.vencimento);
  const pagoEm = dados.pagoEm?.trim()
    ? formatarDataMsg(dados.pagoEm)
    : formatarDataMsg(new Date().toISOString());

  const mapa: Record<string, string> = {
    '{nome}': dados.nome,
    '{referencia}': dados.referencia,
    '{valor}': formatarValorMsg(dados.valor),
    '{vencimento}': formatarDataMsg(dados.vencimento),
    '{proximoVencimento}': formatarDataMsg(dados.vencimento),
    '{expiraEm}': expiraEm,
    '{pagoEm}': pagoEm,
    '{empresa}': dados.empresa,
    '{pix}': pix,
    '{tipoPix}': tipoPix,
    '{favorecido}': favorecido,
    '{linhaPix}': montarLinhaPix(dados),
  };

  return Object.entries(mapa).reduce(
    (texto, [chave, valor]) => texto.split(chave).join(valor),
    template
  );
}

function garantirPixNaMensagem(
  mensagem: string,
  dados: DadosMensagemWhatsApp
): string {
  const pix = dados.pix?.trim();
  if (!pix || mensagem.includes(pix)) {
    return mensagem;
  }

  const bloco = montarLinhaPix(dados);
  const assinatura = `— ${dados.empresa}`;
  const indiceAssinatura = mensagem.lastIndexOf(assinatura);

  if (indiceAssinatura >= 0) {
    return (
      mensagem.slice(0, indiceAssinatura).replace(/\s+$/, '') +
      bloco +
      '\n\n' +
      mensagem.slice(indiceAssinatura)
    );
  }

  return `${mensagem.replace(/\s+$/, '')}${bloco}`;
}

export function montarMensagemCobranca(
  dados: DadosMensagemCobranca,
  templateAtrasado?: string | null,
  templateLembrete?: string | null
): string {
  if (dados.atrasado) {
    const template = templateAtrasado?.trim()
      ? templateAtrasado.trim()
      : MENSAGEM_COBRANCA_PADRAO;
    return garantirPixNaMensagem(substituirVariaveis(template, dados), dados);
  }

  const template = templateLembrete?.trim()
    ? templateLembrete.trim()
    : MENSAGEM_COBRANCA_LEMBRETE_PADRAO;

  return garantirPixNaMensagem(substituirVariaveis(template, dados), dados);
}

export function montarMensagemRenovacao(
  dados: DadosMensagemWhatsApp,
  template?: string | null
): string {
  if (template?.trim()) {
    return substituirVariaveis(template.trim(), dados);
  }

  return substituirVariaveis(MENSAGEM_RENOVACAO_PADRAO, dados);
}

export function montarMensagemRecibo(
  dados: DadosMensagemWhatsApp,
  template?: string | null
): string {
  if (template?.trim()) {
    return substituirVariaveis(template.trim(), dados);
  }

  return substituirVariaveis(MENSAGEM_RECIBO_PADRAO, dados);
}

export function montarMensagemBloqueio(
  dados: DadosMensagemWhatsApp,
  template?: string | null
): string {
  if (template?.trim()) {
    return substituirVariaveis(template.trim(), dados);
  }

  return substituirVariaveis(MENSAGEM_BLOQUEIO_PADRAO, dados);
}

export function urlWhatsAppCobranca(
  telefone: string,
  mensagem: string
): string | null {
  const numero = formatarTelefoneWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function abrirWhatsAppCobranca(telefone: string, mensagem: string): void {
  const url = urlWhatsAppCobranca(telefone, mensagem);
  if (!url) {
    notificar(
      'Telefone inválido. Brasil: (62) 99999-9999. Internacional: +351 912 345 678.',
      'warning'
    );
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function urlWhatsAppContato(telefone: string): string | null {
  const numero = formatarTelefoneWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}`;
}

export function abrirWhatsAppContato(telefone: string): void {
  const url = urlWhatsAppContato(telefone);
  if (!url) {
    notificar(
      'Telefone inválido. Brasil: (62) 99999-9999. Internacional: +351 912 345 678.',
      'warning'
    );
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export interface ParamsPosPagamento {
  telefone: string;
  nome: string;
  referencia: string;
  valor: number;
  novoVencimento: string;
  empresa: string;
  templateRenovacao?: string | null;
  cortesia?: boolean;
}

export async function oferecerMensagemRenovacao(
  params: ParamsPosPagamento
): Promise<void> {
  if (!telefoneValidoParaWhatsApp(params.telefone)) {
    return;
  }

  const proximoVencimento = formatarData(params.novoVencimento);
  const mensagem = params.cortesia
    ? `Olá ${params.nome}! Sua cortesia foi renovada. O próximo vencimento será em ${proximoVencimento}.\n\n— ${params.empresa}`
    : montarMensagemRenovacao(
        {
          nome: params.nome,
          referencia: params.referencia,
          valor: params.valor,
          vencimento: params.novoVencimento,
          expiraEm: params.novoVencimento,
          empresa: params.empresa,
        },
        params.templateRenovacao
      );

  if (
    await confirmarUsuario(
      `Deseja abrir o WhatsApp para informar que o próximo vencimento será em ${proximoVencimento}?`,
      'Renovação registrada',
      'Enviar WhatsApp'
    )
  ) {
    abrirWhatsAppCobranca(params.telefone, mensagem);
  }
}

export interface RenovacaoLoteItem {
  id: number;
  nome: string;
  telefone: string;
  mensagem: string;
}

export interface ResultadoRenovacaoLote {
  abertos: number;
  ignorados: number;
  cancelado: boolean;
}

export async function executarRenovacaoEmLote(
  itens: RenovacaoLoteItem[]
): Promise<ResultadoRenovacaoLote> {
  const validos = itens.filter((item) =>
    telefoneValidoParaWhatsApp(item.telefone)
  );
  const ignorados = itens.length - validos.length;

  if (validos.length === 0) {
    return { abertos: 0, ignorados, cancelado: true };
  }

  const enviarTodos = await confirmarUsuario(
    validos.length === 1
      ? `Enviar mensagem de renovação para ${validos[0].nome}?`
      : `Enviar mensagens de renovação para ${validos.length} cliente(s)?` +
          (ignorados > 0
            ? `\n\n${ignorados} cliente(s) serão ignorados por telefone inválido.`
            : '') +
          '\n\nOs chats abrem um por vez. Confirme cada cliente antes de abrir.',
    'Pagamentos registrados',
    validos.length === 1 ? 'Enviar' : 'Continuar'
  );

  if (!enviarTodos) {
    return { abertos: 0, ignorados, cancelado: true };
  }

  const avisoIgnorados =
    ignorados > 0
      ? `\n\n${ignorados} cliente(s) serão ignorados por telefone inválido ou ausente.`
      : '';

  let abertos = 0;
  let cancelado = false;

  for (let indice = 0; indice < validos.length; indice++) {
    const atual = validos[indice];
    const instrucaoLote =
      validos.length > 1
        ? '\n\nOs chats abrem um por vez. Confirme cada cliente antes de abrir.'
        : '';
    const rotulo =
      validos.length === 1
        ? `Abrir WhatsApp para ${atual.nome}?${avisoIgnorados}`
        : `Abrir WhatsApp (${indice + 1}/${validos.length})?\n\nCliente: ${atual.nome}${indice === 0 ? avisoIgnorados : ''}${instrucaoLote}`;

    const confirmado = await confirmarUsuario(rotulo, 'Renovação', 'Abrir');
    if (!confirmado) {
      cancelado = true;
      if (abertos > 0) {
        notificar(
          `Renovação interrompida. ${abertos} WhatsApp(s) aberto(s).`,
          'info'
        );
      }
      break;
    }

    abrirWhatsAppCobranca(atual.telefone, atual.mensagem);
    abertos++;

    if (indice + 1 < validos.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!cancelado && abertos > 0) {
    setTimeout(
      () =>
        notificar(
          `Renovação em lote concluída: ${abertos} WhatsApp(s) aberto(s).`,
          'success'
        ),
      300
    );
  }

  return { abertos, ignorados, cancelado };
}

export function montarItensRenovacaoLote(
  pagamentos: {
    id: number;
    novoVencimento: string;
    valorRenovacao: number;
  }[],
  mensalidades: Pick<
    Mensalidade,
    'id' | 'referencia' | 'clienteId' | 'cliente'
  >[],
  telefones: Map<number, string>,
  nomes: Map<number, string>,
  empresa: string,
  templateRenovacao?: string | null
): RenovacaoLoteItem[] {
  const porId = new Map(mensalidades.map((m) => [m.id, m]));

  return pagamentos
    .map((pagamento) => {
      const mensalidade = porId.get(pagamento.id);
      if (!mensalidade) {
        return null;
      }

      const nome =
        mensalidade.cliente?.nome?.trim() ||
        nomes.get(mensalidade.clienteId) ||
        'Cliente';
      const telefone = resolverTelefoneCliente(
        {
          clienteId: mensalidade.clienteId,
          cliente: mensalidade.cliente
            ? { telefone: mensalidade.cliente.telefone }
            : undefined,
        },
        telefones
      );
      const mensagem = montarMensagemRenovacao(
        {
          nome,
          referencia: mensalidade.referencia,
          valor: pagamento.valorRenovacao,
          vencimento: pagamento.novoVencimento,
          expiraEm: pagamento.novoVencimento,
          empresa,
        },
        templateRenovacao
      );

      return {
        id: pagamento.id,
        nome,
        telefone,
        mensagem,
      };
    })
    .filter((item): item is RenovacaoLoteItem => item !== null);
}

export interface CobrancaLoteItem {
  id: number;
  nome: string;
  telefone: string;
  mensagem: string;
}

export interface ResultadoCobrancaLote {
  abertos: number;
  ignorados: number;
  cancelado: boolean;
  idsEnviados: number[];
}

export async function executarCobrancaEmLote(
  itens: CobrancaLoteItem[],
  onContato?: (id: number) => void | Promise<void>
): Promise<ResultadoCobrancaLote> {
  /**
   * Modo legado com vários confirms — o navegador costuma bloquear window.open
   * após o primeiro. Prefira CobrancaLoteFilaService (fila assistida).
   */
  const validos = itens.filter((item) =>
    telefoneValidoParaWhatsApp(item.telefone)
  );
  const ignorados = itens.length - validos.length;

  if (validos.length === 0) {
    notificar(
      ignorados > 0
        ? 'Nenhum cliente selecionado possui telefone válido cadastrado.'
        : 'Selecione ao menos um cliente para cobrar.',
      'warning'
    );
    return { abertos: 0, ignorados, cancelado: true, idsEnviados: [] };
  }

  const avisoIgnorados =
    ignorados > 0
      ? `\n\n${ignorados} cliente(s) serão ignorados por telefone inválido ou ausente.`
      : '';

  let abertos = 0;
  let cancelado = false;
  const idsEnviados: number[] = [];

  for (let indice = 0; indice < validos.length; indice++) {
    const atual = validos[indice];
    const instrucaoLote =
      validos.length > 1
        ? '\n\nOs chats abrem um por vez. Confirme cada cliente antes de abrir.'
        : '';
    const rotulo =
      validos.length === 1
        ? `Abrir WhatsApp para ${atual.nome}?${avisoIgnorados}`
        : `Abrir WhatsApp (${indice + 1}/${validos.length})?\n\nCliente: ${atual.nome}${indice === 0 ? avisoIgnorados : ''}${instrucaoLote}`;

    const confirmado = await confirmarUsuario(rotulo, 'WhatsApp', 'Abrir');
    if (!confirmado) {
      cancelado = true;
      if (abertos > 0) {
        notificar(`Cobrança interrompida. ${abertos} WhatsApp(s) aberto(s).`, 'info');
      }
      break;
    }

    abrirWhatsAppCobranca(atual.telefone, atual.mensagem);
    abertos++;
    idsEnviados.push(atual.id);

    if (onContato) {
      await onContato(atual.id);
    }

    if (indice + 1 < validos.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!cancelado && abertos > 0) {
    setTimeout(
      () =>
        notificar(
          `Cobrança em lote concluída: ${abertos} WhatsApp(s) aberto(s).`,
          'success'
        ),
      300
    );
  }

  return { abertos, ignorados, cancelado, idsEnviados };
}
