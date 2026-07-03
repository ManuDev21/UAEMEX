import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.svg'],
      manifest: {
        name: 'Gestion de Activos Institucionales',
        short_name: 'Activos',
        description: 'Sistema Web de Gestion de Activos Institucionales',
        theme_color: '#009975',
        background_color: '#004233',
        display: 'standalone',
        display_override: ['standalone', 'window-controls-overlay', 'browser'],
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'es',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Escaner QR',
            short_name: 'Escaner',
            url: '/scanner',
            icons: [{ src: 'logo.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Inventario',
            short_name: 'Bienes',
            url: '/assets',
            icons: [{ src: 'logo.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/graphql/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
