import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['dash.collos.com.br', 'backdash.collos.com.br'],
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:4000',
    },
    headers: {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      Expires: '0',
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['dash.collos.com.br', 'backdash.collos.com.br'],
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:4000',
    },
    headers: {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      Expires: '0',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
})
