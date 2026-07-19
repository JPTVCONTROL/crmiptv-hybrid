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

export function formatarTelefoneWhatsApp(telefone: string): string | null {
  const numeros = telefone.replace(/\D/g, '');
  if (!numeros) return null;
  if (numeros.startsWith('55') && numeros.length >= 12) return numeros;
  if (numeros.length === 10 || numeros.length === 11) return `55${numeros}`;
  if (numeros.length >= 12) return numeros;
  return null;
}

function formatarValorMsg(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataMsg(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR');
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
    '{expiraEm}': expiraEm,
    '{pagoEm}': pagoEm,
    '{empresa}': dados.empresa,
    '{pix}': pix,
    '{tipoPix}': tipoPix,
    '{favorecido}': favorecido,
  };

  return Object.entries(mapa).reduce(
    (texto, [chave, valor]) => texto.split(chave).join(valor),
    template
  );
}

export function montarMensagemCobranca(
  dados: DadosMensagemCobranca,
  template?: string | null
): string {
  const linhaPix = montarLinhaPix(dados);

  if (dados.atrasado) {
    if (template?.trim()) {
      return substituirVariaveis(template.trim(), dados);
    }

    return substituirVariaveis(
      `Olá {nome}! Sua mensalidade referente a {referencia}, no valor de {valor}, venceu em {vencimento}. Por favor, regularize seu pagamento.${linhaPix}\n\n— {empresa}`,
      dados
    );
  }

  return substituirVariaveis(
    `Olá {nome}! Passando para lembrar da mensalidade {referencia}, no valor de {valor}, com vencimento em {vencimento}.${linhaPix}\n\n— {empresa}`,
    dados
  );
}

export function montarMensagemRenovacao(
  dados: DadosMensagemWhatsApp,
  template?: string | null
): string {
  if (template?.trim()) {
    return substituirVariaveis(template.trim(), dados);
  }

  return substituirVariaveis(
    `Olá {nome}! Recebemos seu pagamento de {valor} referente a {referencia}. Seu plano foi renovado e agora vence em {vencimento}. Obrigado pela preferência!\n\n— {empresa}`,
    dados
  );
}

export function montarMensagemRecibo(
  dados: DadosMensagemWhatsApp,
  template?: string | null
): string {
  if (template?.trim()) {
    return substituirVariaveis(template.trim(), dados);
  }

  return substituirVariaveis(
    `Olá {nome}! Confirmamos o recebimento de {valor} referente a {referencia}, pago em {pagoEm}.\n\n— {empresa}`,
    dados
  );
}

export function montarMensagemBloqueio(
  dados: DadosMensagemWhatsApp,
  template?: string | null
): string {
  if (template?.trim()) {
    return substituirVariaveis(template.trim(), dados);
  }

  const linhaPix = montarLinhaPix(dados);

  return substituirVariaveis(
    `Olá {nome}! Seu acesso foi suspenso por pendência referente a {referencia}, no valor de {valor}, vencida em {vencimento}. Regularize para reativar.${linhaPix}\n\n— {empresa}`,
    dados
  );
}

export function abrirWhatsAppCobranca(telefone: string, mensagem: string): void {
  const numero = formatarTelefoneWhatsApp(telefone);
  if (!numero) {
    alert(
      'Telefone inválido. Cadastre o número com DDD, por exemplo: (62) 99999-9999.'
    );
    return;
  }
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function telefoneValidoParaWhatsApp(telefone?: string | null): boolean {
  if (!telefone?.trim()) return false;
  return formatarTelefoneWhatsApp(telefone) !== null;
}

export interface ParamsPosPagamento {
  telefone: string;
  nome: string;
  referencia: string;
  valor: number;
  novoVencimento: string;
  empresa: string;
  templateRenovacao?: string | null;
}

export function oferecerMensagemRenovacao(params: ParamsPosPagamento): void {
  if (!telefoneValidoParaWhatsApp(params.telefone)) {
    return;
  }

  const mensagem = montarMensagemRenovacao(
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
    confirm('Pagamento registrado! Deseja enviar a mensagem de renovação no WhatsApp?')
  ) {
    abrirWhatsAppCobranca(params.telefone, mensagem);
  }
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
}

export function executarCobrancaEmLote(
  itens: CobrancaLoteItem[]
): ResultadoCobrancaLote {
  const validos = itens.filter((item) =>
    telefoneValidoParaWhatsApp(item.telefone)
  );
  const ignorados = itens.length - validos.length;

  if (validos.length === 0) {
    alert(
      ignorados > 0
        ? 'Nenhum cliente selecionado possui telefone válido cadastrado.'
        : 'Selecione ao menos um cliente para cobrar.'
    );
    return { abertos: 0, ignorados, cancelado: true };
  }

  const avisoIgnorados =
    ignorados > 0
      ? `\n\n${ignorados} cliente(s) serão ignorados por telefone inválido ou ausente.`
      : '';

  let abertos = 0;
  let cancelado = false;

  const abrirIndice = (indice: number): void => {
    if (indice >= validos.length) {
      return;
    }

    const atual = validos[indice];
    const instrucaoLote =
      validos.length > 1
        ? '\n\nOs chats abrem um por vez. Confirme cada cliente antes de abrir.'
        : '';
    const rotulo =
      validos.length === 1
        ? `Abrir WhatsApp para ${atual.nome}?${avisoIgnorados}`
        : `Abrir WhatsApp (${indice + 1}/${validos.length})?\n\nCliente: ${atual.nome}${indice === 0 ? avisoIgnorados : ''}${instrucaoLote}`;

    if (!confirm(rotulo)) {
      cancelado = true;
      if (abertos > 0) {
        alert(`Cobrança interrompida. ${abertos} WhatsApp(s) aberto(s).`);
      }
      return;
    }

    abrirWhatsAppCobranca(atual.telefone, atual.mensagem);
    abertos++;

    if (indice + 1 < validos.length) {
      setTimeout(() => abrirIndice(indice + 1), 500);
      return;
    }

    setTimeout(
      () => alert(`Cobrança em lote concluída: ${abertos} WhatsApp(s) aberto(s).`),
      300
    );
  };

  abrirIndice(0);

  return { abertos, ignorados, cancelado };
}
