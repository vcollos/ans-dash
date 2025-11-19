import express from 'express'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { runAgent } from './agentRunner.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.SERVER_PORT ?? process.env.PORT ?? 4000
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://ansdashboard:ansdashboard@localhost:5432/ans_dashboard'
const EXPORT_SQL_PATH = path.resolve(__dirname, '../db/export_indicadores.sql')

const pool = new Pool({
  connectionString: DATABASE_URL,
})

const exportQuery = fs.readFileSync(EXPORT_SQL_PATH, 'utf8').trim().replace(/;[\s]*$/, '')

function formatCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv(result) {
  const headers = result.fields.map((field) => field.name)
  const lines = [headers.join(',')]
  for (const row of result.rows) {
    lines.push(headers.map((key) => formatCsvValue(row[key])).join(','))
  }
  return lines.join('\n')
}

const app = express()
app.use(express.json({ limit: '5mb' }))

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (err) {
    console.error('[server] healthcheck failure', err)
    res.status(500).json({ status: 'error' })
  }
})

app.get('/api/indicadores.csv', async (req, res) => {
  const client = await pool.connect()
  try {
    const result = await client.query(exportQuery)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.send(buildCsv(result))
  } catch (err) {
    console.error('[server] falha ao gerar CSV', err)
    res.status(500).json({ error: 'Falha ao gerar CSV de indicadores.' })
  } finally {
    client.release()
  }
})

app.post('/api/query', async (req, res) => {
  const sql = req.body?.sql
  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ error: 'SQL inválido.' })
  }
  const trimmed = sql.trim()
  const sanitized = trimmed.replace(/;+\s*$/g, '')
  if (!/^(with|select)/i.test(trimmed)) {
    return res.status(400).json({ error: 'Apenas consultas SELECT/WITH são permitidas.' })
  }
  if (sanitized.includes(';')) {
    return res.status(400).json({ error: 'Somente uma instrução por requisição é permitida.' })
  }
  const client = await pool.connect()
  try {
    const result = await client.query(sanitized)
    res.json({ rows: result.rows })
  } catch (err) {
    console.error('[server] erro ao executar consulta', err)
    res.status(500).json({ error: 'Falha ao executar consulta' })
  } finally {
    client.release()
  }
})

app.post('/api/agent', async (req, res) => {
  const { question, context } = req.body ?? {}
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Pergunta obrigatória.' })
  }
  try {
    const result = await runAgent(question, context)
    res.json({ answer: result.output_text })
  } catch (err) {
    console.error('[server] erro ao executar agente', err)
    res.status(500).json({ error: 'Falha ao consultar agente OpenAI.' })
  }
})

app.listen(PORT, () => {
  console.log(`[server] API disponível em http://localhost:${PORT}`)
})
