import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {VitePWA} from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),VitePWA({registerType:'autoUpdate',includeAssets:['benji-icon.svg'],manifest:{name:'Benji — Meu Amigo de Rotina',short_name:'Benji',description:'Rotinas visuais, tranquilas e positivas para crianças.',theme_color:'#176b5b',background_color:'#f5faf8',display:'standalone',start_url:'/',icons:[{src:'/benji-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]},workbox:{cleanupOutdatedCaches:true,navigateFallback:'/index.html',runtimeCaching:[{urlPattern:/^https:\/\/firebasestorage\.googleapis\.com\//,handler:'CacheFirst',options:{cacheName:'benji-media'}}]}})],
})
