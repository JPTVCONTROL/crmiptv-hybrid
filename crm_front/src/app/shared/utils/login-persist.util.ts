const SALVAR_DADOS_KEY = 'crm-login-salvar-dados';
const MANTER_CONECTADO_KEY = 'crm-login-manter-conectado';
const EMAIL_KEY = 'crm-login-email';
const SENHA_KEY = 'crm-login-senha';

function lerFlag(chave: string, padrao: boolean): boolean {
  const raw = localStorage.getItem(chave);
  if (raw === null) {
    return padrao;
  }

  return raw === 'true';
}

function codificarSenha(senha: string): string {
  return btoa(unescape(encodeURIComponent(senha)));
}

function decodificarSenha(valor: string): string | null {
  try {
    return decodeURIComponent(escape(atob(valor)));
  } catch {
    return null;
  }
}

export function lerSalvarDadosLogin(): boolean {
  return lerFlag(SALVAR_DADOS_KEY, true);
}

export function lerManterConectadoLogin(): boolean {
  return lerFlag(MANTER_CONECTADO_KEY, true);
}

export function salvarPreferenciasLogin(
  salvarDados: boolean,
  manterConectado: boolean
): void {
  localStorage.setItem(SALVAR_DADOS_KEY, salvarDados ? 'true' : 'false');
  localStorage.setItem(MANTER_CONECTADO_KEY, manterConectado ? 'true' : 'false');
}

export function carregarCredenciaisLogin(): { email: string; senha: string } {
  if (!lerSalvarDadosLogin()) {
    return { email: '', senha: '' };
  }

  const email = localStorage.getItem(EMAIL_KEY) ?? '';
  const senhaCodificada = localStorage.getItem(SENHA_KEY);
  const senha = senhaCodificada ? decodificarSenha(senhaCodificada) ?? '' : '';

  return { email, senha };
}

export function persistirCredenciaisLogin(
  salvarDados: boolean,
  email: string,
  senha: string
): void {
  if (!salvarDados) {
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(SENHA_KEY);
    return;
  }

  localStorage.setItem(EMAIL_KEY, email);
  localStorage.setItem(SENHA_KEY, codificarSenha(senha));
}

export function sessaoPersistenteHabilitada(): boolean {
  return lerManterConectadoLogin();
}
