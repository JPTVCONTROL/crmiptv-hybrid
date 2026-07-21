/**
 * Build mobile (Capacitor / APK).
 *
 * Atualize automaticamente com:
 *   npm run mobile:prepare          — rede Wi-Fi local (192.168.x.x)
 *   npm run mobile:prepare:tailscale — acesso fora de casa (100.x.x.x)
 * Rede local: http://SEU_IP:3001/api — nunca use localhost no APK.
 */
export const environment = {
  production: true,
  apiUrl: 'http://192.168.20.2:3001/api',
  healthUrl: 'http://192.168.20.2:3001/health',
};
