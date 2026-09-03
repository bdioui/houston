import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Était '/grist-widgets/' : le widget était servi en sous-chemin.
  // L'application est maintenant servie à la racine de son domaine.
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,          // écoute en dehors du conteneur
    port: 5173,
    // Le front appelle /api/... en chemin relatif et ne connaît jamais l'URL du
    // backend. Même origine côté navigateur : pas de CORS, et le cookie de
    // session circule tout seul.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://backend:8000',
        changeOrigin: false,   // conserve l'en-tête Origin, que Django vérifie
      },
    },
  },
})
