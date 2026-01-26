import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Use window.__ENV__ if available (injected at runtime by server), otherwise use build-time env
        'process.env.DIRECTUS_URL': JSON.stringify(env.DIRECTUS_URL || ''),
        'process.env.DIRECTUS_STATIC_TOKEN': JSON.stringify(env.DIRECTUS_STATIC_TOKEN || ''),
        'process.env.DIRECTUS_SCOREKEEPER_TOKEN': JSON.stringify(env.DIRECTUS_SCOREKEEPER_TOKEN || ''),
        'process.env.WP_SITE_URL': JSON.stringify(env.WP_SITE_URL || ''),
        'process.env.WP_USERNAME': JSON.stringify(env.WP_USERNAME || ''),
        'process.env.WP_APP_PASS': JSON.stringify(env.WP_APP_PASS || ''),
        'process.env.KEYCLOAK_URL': JSON.stringify(env.KEYCLOAK_URL || ''),
        'process.env.KEYCLOAK_REALM': JSON.stringify(env.KEYCLOAK_REALM || ''),
        'process.env.KEYCLOAK_CLIENT_ID': JSON.stringify(env.KEYCLOAK_CLIENT_ID || ''),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY || ''),
        'process.env.OPENROUTER_MODEL': JSON.stringify(env.OPENROUTER_MODEL || ''),
        'process.env.DATA_PROVIDER': JSON.stringify(env.DATA_PROVIDER || ''),
        'process.env.SCHEDULE_PROVIDER': JSON.stringify(env.SCHEDULE_PROVIDER || ''),
        'process.env.POCKETBASE_URL': JSON.stringify(env.POCKETBASE_URL || ''),
        'process.env.ENABLE_OBS_SYNC': JSON.stringify(env.ENABLE_OBS_SYNC || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
