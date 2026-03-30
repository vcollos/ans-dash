import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const serverPort = Number(env.SERVER_PORT || 4000)
  const vitePort = Number(env.VITE_PORT || 5173)
  const allowedHosts = String(
    env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1,0.0.0.0,contabil.uniodonto.coop.br,dash.collos.com.br,backdash.collos.com.br',
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const apiProxy = env.VITE_API_PROXY || `http://localhost:${serverPort}`

  return {
    plugins: [react()],
    server: {
      host: env.VITE_HOST || '0.0.0.0',
      port: vitePort,
      strictPort: true,
      allowedHosts,
      proxy: {
        '/api': apiProxy,
      },
      headers: {
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
    preview: {
      host: env.VITE_HOST || '0.0.0.0',
      port: vitePort,
      strictPort: true,
      allowedHosts,
      proxy: {
        '/api': apiProxy,
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
  }
})
