import type { PontoDisparoAutomacao } from './automacaoDisparoHelpers.js';

export const MENSAGENS_PADRAO_POR_PONTO: Record<PontoDisparoAutomacao, string> = {
  LEMBRETE_D5: `Olá {nome}! 👋

📋 *Lembrete amigável*
Passando para avisar com antecedência sobre sua mensalidade:

📅 Referência: {referencia}
💰 Valor: {valor}
⏳ {prazo}

Deixamos o PIX pronto para quando for conveniente — sem pressa.{linhaPix}

— {empresa}`,

  LEMBRETE_D3: `Olá {nome}! 👋

🔔 *Aviso de vencimento*
Lembrete sobre a mensalidade em aberto:

📅 Referência: {referencia}
💰 Valor: {valor}
⏳ {prazo}

PIX disponível abaixo para facilitar o pagamento.{linhaPix}

— {empresa}`,

  LEMBRETE_D1: `Olá {nome}! 👋

⚡ *Lembrete importante*
Sua mensalidade vence em breve:

📅 Referência: {referencia}
💰 Valor: {valor}
⏳ {prazo}

Regularize hoje para manter seu acesso ativo.{linhaPix}

— {empresa}`,

  LEMBRETE_D0: `Olá {nome}! 👋

📌 *Vence hoje*
Hoje é o dia do vencimento:

📅 Referência: {referencia}
💰 Valor: {valor}
📆 Vencimento: {vencimento}

Efetue o pagamento hoje via PIX:{linhaPix}

— {empresa}`,

  COBRANCA_D1: `Olá {nome}! 👋

⚠️ *Pendência identificada*
Identificamos mensalidade em atraso:

📅 Referência: {referencia}
💰 Valor: {valor}
📆 Venceu em: {vencimento}

Seu acesso pode estar suspenso até a regularização.{linhaPix}

— {empresa}`,

  COBRANCA_D2: `Olá {nome}! 👋

🚫 *Acesso suspenso*
A mensalidade segue em aberto:

📅 Referência: {referencia}
💰 Valor: {valor}
📆 Vencida em: {vencimento}

Regularize o quanto antes para reativar seu acesso.{linhaPix}

— {empresa}`,

  COBRANCA_D3: `Olá {nome}! 👋

🚫 *Atraso em aberto*
Sua mensalidade permanece pendente:

📅 Referência: {referencia}
💰 Valor: {valor}
📆 Vencida em: {vencimento}

Evite o cancelamento definitivo — use o PIX abaixo:{linhaPix}

— {empresa}`,

  COBRANCA_D7: `Olá {nome}! 👋

💬 *Queremos te manter conosco*
Já faz uma semana desde o vencimento:

📅 Referência: {referencia}
💰 Valor: {valor}
📆 Vencida em: {vencimento}

Fale conosco ou regularize via PIX para reativar seu acesso:{linhaPix}

— {empresa}`,
};

const PONTOS_VALIDOS = new Set<string>(Object.keys(MENSAGENS_PADRAO_POR_PONTO));

export type MensagensProgressivasMap = Partial<
  Record<PontoDisparoAutomacao, string>
>;

export function criarMensagensProgressivasPadrao(): Record<
  PontoDisparoAutomacao,
  string
> {
  return { ...MENSAGENS_PADRAO_POR_PONTO };
}

export function parsearMensagensProgressivas(
  valor: unknown
): MensagensProgressivasMap {
  if (!valor) return {};

  let bruto: unknown = valor;
  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (!texto) return {};
    try {
      bruto = JSON.parse(texto);
    } catch {
      return {};
    }
  }

  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    return {};
  }

  const resultado: MensagensProgressivasMap = {};
  for (const [chave, conteudo] of Object.entries(bruto)) {
    if (!PONTOS_VALIDOS.has(chave) || typeof conteudo !== 'string') continue;
    const texto = conteudo.trim();
    if (texto) {
      resultado[chave as PontoDisparoAutomacao] = texto;
    }
  }
  return resultado;
}

export function mesclarMensagensProgressivas(
  salvas?: MensagensProgressivasMap | null
): Record<PontoDisparoAutomacao, string> {
  const padrao = criarMensagensProgressivasPadrao();
  if (!salvas) return padrao;

  for (const ponto of Object.keys(padrao) as PontoDisparoAutomacao[]) {
    const custom = salvas[ponto]?.trim();
    if (custom) {
      padrao[ponto] = custom;
    }
  }
  return padrao;
}

export function serializarMensagensProgressivas(
  mapa: MensagensProgressivasMap
): string {
  const filtrado: MensagensProgressivasMap = {};
  for (const ponto of Object.keys(MENSAGENS_PADRAO_POR_PONTO) as PontoDisparoAutomacao[]) {
    const texto = mapa[ponto]?.trim();
    if (texto && texto !== MENSAGENS_PADRAO_POR_PONTO[ponto]) {
      filtrado[ponto] = texto;
    }
  }
  return JSON.stringify(filtrado);
}

export function resolverTemplateProgressivo(
  ponto: PontoDisparoAutomacao | null | undefined,
  overrides?: MensagensProgressivasMap | null,
  fallbackLembrete?: string,
  fallbackCobranca?: string
): string {
  if (ponto) {
    const custom = overrides?.[ponto]?.trim();
    if (custom) return custom;
    if (MENSAGENS_PADRAO_POR_PONTO[ponto]) {
      return MENSAGENS_PADRAO_POR_PONTO[ponto];
    }
  }

  if (ponto?.startsWith('COBRANCA_') && fallbackCobranca?.trim()) {
    return fallbackCobranca.trim();
  }
  if (fallbackLembrete?.trim()) {
    return fallbackLembrete.trim();
  }
  return MENSAGENS_PADRAO_POR_PONTO.LEMBRETE_D3;
}
