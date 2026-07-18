export interface DadosMensagemCobranca {
  nome: string;
  referencia: string;
  valor: number;
  vencimento: string;
  empresa: string;
  atrasado: boolean;
  pix?: string;
  tipoPix?: string;
  favorecido?: string;
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

function montarLinhaPix(dados: DadosMensagemCobranca): string {
  if (!dados.pix?.trim()) return '';
  const tipo = dados.tipoPix?.trim() ? ` (${dados.tipoPix})` : '';
  const favorecido = dados.favorecido?.trim()
    ? `\nFavorecido: ${dados.favorecido}`
    : '';
  return `\n\nPIX${tipo}: ${dados.pix}${favorecido}`;
}

function substituirVariaveis(template: string, dados: DadosMensagemCobranca): string {
  const pix = dados.pix?.trim() ?? '';
  const tipoPix = dados.tipoPix?.trim() ?? '';
  const favorecido = dados.favorecido?.trim() ?? '';

  const mapa: Record<string, string> = {
    '{nome}': dados.nome,
    '{referencia}': dados.referencia,
    '{valor}': formatarValorMsg(dados.valor),
    '{vencimento}': formatarDataMsg(dados.vencimento),
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
  if (template?.trim()) {
    return substituirVariaveis(template.trim(), dados);
  }

  const linhaPix = montarLinhaPix(dados);

  if (dados.atrasado) {
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
