import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

// https://vite.dev/config/
function createUploadMiddleware() {
  return async function uploadMiddleware(req, res, next) {
    if (req.url !== '/api/upload-dataset' || req.method !== 'POST') return next()
    try {
      const rawBody = await readRequestBody(req)
      const payload = rawBody ? JSON.parse(rawBody) : {}
      const { filename = 'indicadores.csv', content } = payload
      if (!content) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Conteúdo ausente' }))
        return
      }
      const safeName = (filename || 'indicadores.csv').replace(/[^a-zA-Z0-9._-]/g, '_')
      const targetDir = path.resolve(__dirname, 'public/data')
      await fs.promises.mkdir(targetDir, { recursive: true })
      const targetPath = path.join(targetDir, safeName)
      await fs.promises.writeFile(targetPath, content, 'utf8')
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, path: targetPath }))
    } catch (err) {
      console.error('[upload-dataset] erro ao salvar arquivo', err)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Falha ao salvar arquivo' }))
    }
  }
}

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
  configureServer(server) {
    server.middlewares.use(createUploadMiddleware())
  },
  configurePreviewServer(server) {
    server.middlewares.use(createUploadMiddleware())
  },
})
