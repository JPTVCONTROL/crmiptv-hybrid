import { Aplicativo, Cliente, Configuracao } from '../../core/models';
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

function formatarValorMsg(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataMsg(data?: string | null): string {
  if (!data?.trim()) return '—';
  return new Date(data).toLocaleDateString('pt-BR');
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
    '{valor}': formatarValorMsg(cliente.valorMensal ?? 0),
    '{pix}': pix,
    '{tipoPix}': tipoPix,
    '{favorecido}': favorecido,
    '{linhaPix}': linhaPix,
  };
}

function montarLinksApp(aplicativo: Aplicativo): string {
  const linhas: string[] = [];

  if (aplicativo.android?.trim()) {
    linhas.push(`📱 Android: ${aplicativo.android.trim()}`);
  }
  if (aplicativo.androidTv?.trim()) {
    linhas.push(`📺 Android TV: ${aplicativo.androidTv.trim()}`);
  }
  if (aplicativo.ios?.trim()) {
    linhas.push(`🍎 iOS: ${aplicativo.ios.trim()}`);
  }
  if (aplicativo.windows?.trim()) {
    linhas.push(`💻 Windows: ${aplicativo.windows.trim()}`);
  }
  if (aplicativo.mac?.trim()) {
    linhas.push(`🖥 Mac: ${aplicativo.mac.trim()}`);
  }

  return linhas.join('\n');
}

function mapaVariaveisApp(
  cliente: Cliente,
  aplicativo: Aplicativo,
  configuracao: Configuracao | null
): Record<string, string> {
  const links = montarLinksApp(aplicativo);
  const tutorial = aplicativo.tutorial?.trim()
    ? `Tutorial:\n${aplicativo.tutorial.trim()}`
    : '';

  return {
    '{nome}': cliente.nome.trim(),
    '{empresa}': configuracao?.nomeEmpresa?.trim() || 'JPTV',
    '{app}': aplicativo.nome.trim(),
    '{links}': links || '—',
    '{tutorial}': tutorial,
    '{linkAndroid}': aplicativo.android?.trim() || '—',
    '{linkAndroidTv}': aplicativo.androidTv?.trim() || '—',
    '{linkIos}': aplicativo.ios?.trim() || '—',
    '{linkWindows}': aplicativo.windows?.trim() || '—',
    '{linkMac}': aplicativo.mac?.trim() || '—',
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

  return !!(
    app.mensagem?.trim() ||
    app.tutorial?.trim() ||
    app.android?.trim() ||
    app.androidTv?.trim() ||
    app.ios?.trim() ||
    app.windows?.trim() ||
    app.mac?.trim()
  );
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
      `Enviar mensagem de boas-vindas para ${cliente.nome}?`,
      'Cliente cadastrado',
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
      `Enviar links do app ${app.nome}${rotuloTela} para ${cliente.nome}?`,
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
