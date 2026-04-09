import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy PocketBase API + realtime SSE for local development.
          // In production nginx handles /_pb → PocketBase before node.js.
          '/_pb': {
            target: 'http://127.0.0.1:8090',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/_pb/, ''),
          },
        },
      },
      plugins: [react()],
      define: {
        // Use window.__ENV__ if available (injected at runtime by server), otherwise use build-time env
        'process.env.WP_SITE_URL': JSON.stringify(env.VITE_WP_SITE_URL || env.WP_SITE_URL || ''),
        'process.env.WP_USERNAME': JSON.stringify(env.VITE_WP_USERNAME || env.WP_USERNAME || ''),
        'process.env.WP_APP_PASS': JSON.stringify(env.VITE_WP_APP_PASS || env.WP_APP_PASS || ''),
        'process.env.KEYCLOAK_URL': JSON.stringify(env.VITE_KEYCLOAK_URL || env.KEYCLOAK_URL || ''),
        'process.env.KEYCLOAK_REALM': JSON.stringify(env.VITE_KEYCLOAK_REALM || env.KEYCLOAK_REALM || ''),
        'process.env.KEYCLOAK_CLIENT_ID': JSON.stringify(env.VITE_KEYCLOAK_CLIENT_ID || env.KEYCLOAK_CLIENT_ID || ''),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || ''),
        'process.env.OPENROUTER_MODEL': JSON.stringify(env.VITE_OPENROUTER_MODEL || env.OPENROUTER_MODEL || ''),
        'process.env.DATA_PROVIDER': JSON.stringify(env.VITE_DATA_PROVIDER || env.DATA_PROVIDER || ''),
        'process.env.SCHEDULE_PROVIDER': JSON.stringify(env.VITE_SCHEDULE_PROVIDER || env.SCHEDULE_PROVIDER || ''),
        'process.env.POCKETBASE_URL': JSON.stringify(env.VITE_POCKETBASE_URL || env.POCKETBASE_URL || ''),
        'process.env.ENABLE_OBS_SYNC': JSON.stringify(env.VITE_ENABLE_OBS_SYNC || env.ENABLE_OBS_SYNC || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
