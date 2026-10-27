import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/listings': 'http://localhost:8000',
      '/offers': 'http://localhost:8000',
      '/orders': 'http://localhost:8000',
      '/webhooks': 'http://localhost:8000',
      '/reviews': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/learn': 'http://localhost:8000',
      '/gemini': 'http://localhost:8000',
      '/compliance': 'http://localhost:8000',
      '/staff': 'http://localhost:8000',
      '/price-refs': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
