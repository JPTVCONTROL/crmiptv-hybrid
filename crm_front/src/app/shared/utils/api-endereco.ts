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
    return `O backend não responde em ${origem}. Na raiz: npm run api:ensure ou npm run dev:back. Auto ao logar: npm run api:setup.`;
  }

  return `O backend não responde em ${origem}. No PC: npm run api:ensure (ou npm run api:setup uma vez). Tailscale ligado no celular; firewall: npm run api:firewall como admin.`;
}

export function textoErroLoginIndisponivel(): string {
  const origem = origemApi();

  if (apiUsaLocalhost()) {
    return `Servidor indisponível. Na raiz: npm run api:ensure. Teste ${origem}/health no navegador.`;
  }

  return `Servidor indisponível em ${origem}. No PC: npm run api:ensure. No celular, abra ${origem}/health (Tailscale ou mesma Wi-Fi). Se persistir: npm run api:firewall como admin.`;
}

export function textoHintDashboardApiOffline(): string {
  const origem = origemApi();

  if (apiUsaLocalhost()) {
    return `Confirme se o backend está ativo em ${origem} (npm run api:ensure na raiz).`;
  }

  return `Confirme se o backend está ativo em ${origem} (npm run api:ensure no PC) e Tailscale/rede OK no tablet.`;
}
