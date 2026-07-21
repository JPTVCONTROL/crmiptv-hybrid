import { environment } from '../../../environments/environment';

/** Origem da API (sem /api ou /health), ex.: http://192.168.20.2:3001 */
export function origemApi(): string {
  const url = environment.healthUrl || environment.apiUrl;
  return url.replace(/\/(health|api)\/?$/, '');
}

export function apiUsaLocalhost(): boolean {
  const origem = origemApi();
  return origem.includes('localhost') || origem.includes('127.0.0.1');
}

export function textoBannerApiOffline(): string {
  const origem = origemApi();

  if (apiUsaLocalhost()) {
    return `O backend não responde em ${origem}. Na raiz do projeto, execute npm run dev ou npm run dev:back.`;
  }

  return `O backend não responde em ${origem}. Confirme: PC com npm run dev:back, celular/tablet na mesma Wi-Fi e firewall liberado (crm_back: npm run firewall:api).`;
}

export function textoErroLoginIndisponivel(): string {
  const origem = origemApi();

  if (apiUsaLocalhost()) {
    return `Servidor indisponível. Em outro terminal: cd crm_back → npm run dev. Teste ${origem}/health no navegador.`;
  }

  return `Servidor indisponível em ${origem}. No PC: npm run dev:back. No celular, abra ${origem}/health no navegador (mesma Wi-Fi). Se falhar, rode npm run firewall:api no crm_back como administrador.`;
}

export function textoHintDashboardApiOffline(): string {
  const origem = origemApi();

  if (apiUsaLocalhost()) {
    return `Confirme se o backend está ativo em ${origem} (npm run dev na raiz do projeto).`;
  }

  return `Confirme se o backend está ativo em ${origem} (npm run dev:back no PC) e se o tablet está na mesma Wi-Fi.`;
}
