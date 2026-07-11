import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('xlsx')) {
            return 'xlsx'
          }

          if (
            id.includes('react-dom') ||
            id.includes('react/jsx-runtime') ||
            id.includes('\\react\\') ||
            id.includes('/react/')
          ) {
            return 'react-core'
          }

          if (id.includes('react-router')) {
            return 'router'
          }

          if (id.includes('firebase')) {
            return 'firebase'
          }

          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'maps'
          }

          if (id.includes('react-icons')) {
            return 'icons'
          }

          return 'vendor'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'trip-documents',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'trip-images', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
      includeAssets: ['familiaNaTrip.png', 'familia.png'],
      manifest: {
        name: 'Familia na Trip',
        short_name: 'Trip Familia',
        display: 'standalone',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        start_url: '/',
        description: 'PWA para organizacao de viagens em familia.',
        icons: [
          {
            src: '/familiaNaTrip.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
