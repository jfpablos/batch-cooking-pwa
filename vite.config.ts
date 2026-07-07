import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// On GitHub Pages the app is served from https://<user>.github.io/batch-cooking-pwa/
// so production builds need that sub-path as base. Dev keeps the root path.
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/batch-cooking-pwa/' : '/'

  return {
    base,
    server: {
      host: true,
      allowedHosts: true,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192x192.png', 'icon-512x512.png', 'icon-maskable.png'],
        manifest: {
          name: 'BatchFit — Menús para Deportistas',
          short_name: 'BatchFit',
          description: 'Genera tu menú semanal de batch cooking para crossfit',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#F8F9FA',
          theme_color: '#FF6B35',
          orientation: 'portrait-primary',
          icons: [
            {
              src: `${base}icon-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}icon-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}icon-maskable.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cacheId: 'batchfit-v1',
          runtimeCaching: [
            {
              // Todo el backend (auth, datos y Edge Functions) siempre por red:
              // cachear respuestas de Supabase daría datos/sesiones obsoletos.
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'youtube-thumbnails',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
  }
})
