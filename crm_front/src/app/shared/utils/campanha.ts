export type TipoCampanha = 'AVISO' | 'PROMOCAO' | 'DATA_COMEMORATIVA';

export type FiltroEnvioCampanha = 'TODOS' | 'PENDENTES' | 'ENVIADOS';

export const ROTULOS_TIPO_CAMPANHA: Record<TipoCampanha, string> = {
  AVISO: 'Aviso',
  PROMOCAO: 'Promoção',
  DATA_COMEMORATIVA: 'Data comemorativa',
};

export const MENSAGEM_CAMPANHA_PADRAO =
  'Olá {nome}! 👋\n\nTemos uma novidade especial para você.\n\nQualquer dúvida, estamos à disposição.';

export function montarMensagemCampanha(template: string, nome: string): string {
  return template.replace(/\{nome\}/g, nome);
}

export function rotuloTipoCampanha(tipo: TipoCampanha): string {
  return ROTULOS_TIPO_CAMPANHA[tipo] ?? tipo;
}
