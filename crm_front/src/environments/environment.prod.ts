/**
 * Ambiente de produção (build: ng build / npm run build:prod)
 *
 * Web com Nginx no mesmo domínio:
 *   apiUrl: '/api'  → proxy para o backend (recomendado)
 *
 * App mobile (Capacitor) ou API em outro domínio:
 *   apiUrl: 'https://seudominio.com/api'
 *   ou IP local: 'http://192.168.1.100:3001/api'
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  healthUrl: '/health',
};
