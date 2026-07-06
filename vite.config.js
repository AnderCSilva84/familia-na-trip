import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
