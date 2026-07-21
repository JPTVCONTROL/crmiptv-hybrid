import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jptv.crm',
  appName: 'CRM JPTV',
  webDir: 'www',
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
    url: 'http://100.84.153.18:3001/app',
    cleartext: true,
  },
};

export default config;
