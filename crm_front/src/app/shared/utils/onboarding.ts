import { Aplicativo, Cliente, Configuracao } from '../../core/models';
import { formatarData } from './formatters';
import { confirmarUsuario } from './confirm-notifier';
import {
  DispositivoCliente,
  parseDispositivos,
  resolverAplicativoCliente,
} from './dispositivos';
import {
  MENSAGEM_APP_PADRAO,
  MENSAGEM_BOAS_VINDAS_PADRAO,
} from './mensagens-padrao';
import {
  abrirWhatsAppCobranca,
  telefoneValidoParaWhatsApp,
} from './whatsapp';

function montarLinksLoja(aplicativo: Aplicativo): string {
  const linhas: { rotulo: string; url?: string | null }[] = [
    { rotulo: 'Android', url: aplicativo.android },
    { rotulo: 'Android TV', url: aplicativo.androidTv },
    { rotulo: 'iOS', url: aplicativo.ios },
    { rotulo: 'Windows', url: aplicativo.windows },
    { rotulo: 'macOS', url: aplicativo.mac },
  ];

  return linhas
    .filter((item) => item.url?.trim())
    .map((item) => `${item.rotulo}: ${item.url!.trim()}`)
    .join('\n');
}

function aplicativoTemConteudoEnvio(aplicativo: Aplicativo): boolean {
  return !!(
    aplicativo.mensagem?.trim() ||
    montarLinksLoja(aplicativo) ||
    aplicativo.tutorial?.trim()
  );
}

function formatarValorMsg(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataMsg(data?: string | null): string {
  if (!data?.trim()) return '—';
  return formatarData(data);
}

function substituirVariaveis(
  template: string,
  mapa: Record<string, string>
): string {
  return Object.entries(mapa).reduce(
    (texto, [chave, valor]) => texto.split(chave).join(valor),
    template
  );
}

function mapaVariaveisBoasVindas(
  cliente: Cliente,
  configuracao: Configuracao | null
): Record<string, string> {
  const pix = configuracao?.chavePix?.trim() ?? '';
  const tipoPix = configuracao?.tipoPix?.trim() ?? '';
  const favorecido = configuracao?.favorecidoPix?.trim() ?? '';
  const linhaPix = pix
    ? `\n\nPIX${tipoPix ? ` (${tipoPix})` : ''}: ${pix}${
        favorecido ? `\nFavorecido: ${favorecido}` : ''
      }`
    : '';

  return {
    '{nome}': cliente.nome.trim(),
    '{empresa}': configuracao?.nomeEmpresa?.trim() || 'JPTV',
    '{servidor}': cliente.servidor?.trim() || '—',
    '{usuario}': cliente.usuario?.trim() || '—',
    '{senha}': cliente.senha?.trim() || '—',
    '{app}': cliente.aplicativo?.nome?.trim() || '—',
    '{expiraEm}': formatarDataMsg(cliente.expiraEm),
    '{proximaRenovacao}': formatarDataMsg(cliente.expiraEm),
    '{valor}': formatarValorMsg(cliente.valorMensal ?? 0),
    '{pix}': pix,
    '{tipoPix}': tipoPix,
    '{favorecido}': favorecido,
    '{linhaPix}': linhaPix,
  };
}

function mapaVariaveisApp(
  cliente: Cliente,
  aplicativo: Aplicativo,
  configuracao: Configuracao | null
): Record<string, string> {
  const linksLoja = montarLinksLoja(aplicativo);
  const tutorial = aplicativo.tutorial?.trim() ?? '';
  const mensagemApp =
    aplicativo.mensagem?.trim() ||
    linksLoja ||
    (tutorial ? `Tutorial: ${tutorial}` : '') ||
    'Entre em contato conosco para receber as instruções de instalação.';

  return {
    '{nome}': cliente.nome.trim(),
    '{empresa}': configuracao?.nomeEmpresa?.trim() || 'JPTV',
    '{app}': aplicativo.nome.trim(),
    '{mensagemApp}': mensagemApp,
    '{android}': aplicativo.android?.trim() ?? '',
    '{androidTv}': aplicativo.androidTv?.trim() ?? '',
    '{ios}': aplicativo.ios?.trim() ?? '',
    '{windows}': aplicativo.windows?.trim() ?? '',
    '{mac}': aplicativo.mac?.trim() ?? '',
    '{tutorial}': tutorial,
    '{linksLoja}': linksLoja,
  };
}

export function montarMensagemBoasVindas(
  cliente: Cliente,
  configuracao: Configuracao | null
): string {
  const mapa = mapaVariaveisBoasVindas(cliente, configuracao);
  let template =
    configuracao?.mensagemBoasVindas?.trim() || MENSAGEM_BOAS_VINDAS_PADRAO;

  if (!configuracao?.mensagemBoasVindas?.trim() && mapa['{linhaPix}']) {
    template = template.replace(
      '\n\n— {empresa}',
      `${mapa['{linhaPix}']}\n\n— {empresa}`
    );
  }

  return substituirVariaveis(template, mapa);
}

export function montarMensagemApp(
  cliente: Cliente,
  configuracao: Configuracao | null,
  aplicativo?: Aplicativo | null
): string {
  const app = aplicativo ?? cliente.aplicativo;
  if (!app) {
    return '';
  }

  const mapa = mapaVariaveisApp(cliente, app, configuracao);

  if (app.mensagem?.trim()) {
    return substituirVariaveis(app.mensagem.trim(), mapa);
  }

  return substituirVariaveis(MENSAGEM_APP_PADRAO, mapa);
}

export function temAppParaEnviar(
  cliente: Cliente,
  aplicativo?: Aplicativo | null
): boolean {
  const app = aplicativo ?? cliente.aplicativo;
  if (!app) return false;

  return aplicativoTemConteudoEnvio(app);
}

export function resolverAplicativoDaTela(
  cliente: Cliente,
  disp: DispositivoCliente,
  aplicativos: Aplicativo[]
): Aplicativo | undefined {
  const doCatalogo = resolverAplicativoCliente(disp, aplicativos);
  if (doCatalogo) {
    return doCatalogo as Aplicativo;
  }

  if (disp.aplicativoId && cliente.aplicativo?.id === disp.aplicativoId) {
    return cliente.aplicativo;
  }

  return undefined;
}

export async function oferecerMensagemBoasVindas(
  cliente: Cliente,
  configuracao: Configuracao | null
): Promise<boolean> {
  if (!telefoneValidoParaWhatsApp(cliente.telefone)) {
    return false;
  }

  const mensagem = montarMensagemBoasVindas(cliente, configuracao);
  if (!mensagem.trim()) {
    return false;
  }

  if (
    await confirmarUsuario(
      `Enviar mensagem de conta ativada para ${cliente.nome}?`,
      'Conta ativada',
      'Enviar'
    )
  ) {
    abrirWhatsAppCobranca(cliente.telefone, mensagem);
    return true;
  }

  return false;
}

export async function oferecerAppsDoCliente(
  cliente: Cliente,
  configuracao: Configuracao | null,
  aplicativos: Aplicativo[]
): Promise<void> {
  if (!telefoneValidoParaWhatsApp(cliente.telefone)) {
    return;
  }

  const dispositivos = parseDispositivos(cliente);
  const enviados = new Set<number>();

  for (let i = 0; i < dispositivos.length; i++) {
    const disp = dispositivos[i];
    if (!disp.aplicativoId || enviados.has(disp.aplicativoId)) {
      continue;
    }

    const app = resolverAplicativoDaTela(cliente, disp, aplicativos);
    if (!app || !temAppParaEnviar(cliente, app)) {
      continue;
    }

    const mensagem = montarMensagemApp(cliente, configuracao, app);
    if (!mensagem.trim()) {
      continue;
    }

    const rotuloTela =
      dispositivos.length > 1 ? ` (tela ${i + 1})` : '';
    const confirmado = await confirmarUsuario(
      `Enviar orientações do app ${app.nome}${rotuloTela} para ${cliente.nome}?`,
      'Enviar aplicativo',
      'Enviar'
    );

    if (confirmado) {
      abrirWhatsAppCobranca(cliente.telefone, mensagem);
      enviados.add(disp.aplicativoId);
    }
  }
}

export async function oferecerOnboardingCompleto(
  cliente: Cliente,
  configuracao: Configuracao | null,
  aplicativos: Aplicativo[]
): Promise<void> {
  await oferecerMensagemBoasVindas(cliente, configuracao);
  await oferecerAppsDoCliente(cliente, configuracao, aplicativos);
}
