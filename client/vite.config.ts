import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: 3001,
      host: true, // Expose on LAN / Docker (0.0.0.0)
      proxy: {
        // In production, VITE_API_URL is set to the Render backend URL.
        // In dev, requests to /api are proxied to the local Express server.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
