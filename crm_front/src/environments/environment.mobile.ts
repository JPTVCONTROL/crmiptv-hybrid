/**
 * Build mobile (Capacitor / APK).
 *
 * Antes de gerar o APK, altere apiUrl para o endereço acessível pelo celular:
 * - Rede local: http://SEU_IP:3001/api  (ex.: http://192.168.1.100:3001/api)
 * - Produção: https://seudominio.com/api
 *
 * O backend deve estar rodando e acessível na mesma rede Wi‑Fi do celular.
 */
export const environment = {
  production: true,
  apiUrl: 'http://192.168.20.2:3001/api',
};
