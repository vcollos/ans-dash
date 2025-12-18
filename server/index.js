import express from 'express'
import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { runAgent } from './agentRunner.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.SERVER_PORT ?? process.env.PORT ?? 4000
const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const BQ_DATASET = process.env.BQ_DATASET ?? 'datalake_ans'
const BQ_LOCATION = process.env.BQ_LOCATION ?? 'US'
const EXPORT_SQL_PATH = path.resolve(__dirname, '../db/export_indicadores.sql')

const bigquery = new BigQuery({
  projectId: BQ_PROJECT_ID,
})

const QUERY_CACHE_TTL_MS = Number(process.env.QUERY_CACHE_TTL_MS ?? 60_000)
const QUERY_CACHE_MAX_ENTRIES = Number(process.env.QUERY_CACHE_MAX_ENTRIES ?? 250)

const queryCache = new Map()
const inFlightQueries = new Map()

function getCacheKey(sql) {
  return crypto
    .createHash('sha256')
    .update(`${BQ_PROJECT_ID}.${BQ_DATASET}:${BQ_LOCATION}:${sql}`)
    .digest('hex')
}

function getCachedRows(key) {
  const cached = queryCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    queryCache.delete(key)
    return null
  }
  queryCache.delete(key)
  queryCache.set(key, cached)
  return cached.rows
}

function setCachedRows(key, rows) {
  if (!Number.isFinite(QUERY_CACHE_TTL_MS) || QUERY_CACHE_TTL_MS <= 0) return
  if (!Number.isFinite(QUERY_CACHE_MAX_ENTRIES) || QUERY_CACHE_MAX_ENTRIES <= 0) return
  queryCache.set(key, { rows, expiresAt: Date.now() + QUERY_CACHE_TTL_MS })
  while (queryCache.size > QUERY_CACHE_MAX_ENTRIES) {
    const oldestKey = queryCache.keys().next().value
    if (!oldestKey) break
    queryCache.delete(oldestKey)
  }
}

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

function normalizeBigQueryScalar(value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(normalizeBigQueryScalar)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 1 && keys[0] === 'value') {
      const inner = value.value
      if (inner === null || inner === undefined) return null
      if (typeof inner === 'number') return inner
      if (typeof inner === 'string') {
        const trimmed = inner.trim()
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          const numeric = Number(trimmed)
          if (Number.isFinite(numeric) && Math.abs(numeric) <= Number.MAX_SAFE_INTEGER) {
            return numeric
          }
        }
        return trimmed
      }
      return normalizeBigQueryScalar(inner)
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeBigQueryScalar(v)]))
  }
  return value
}

function normalizeBigQueryRows(rows) {
  return rows.map((row) => normalizeBigQueryScalar(row))
}

async function runBigQuery(queryText) {
  const [rows, metadata] = await bigquery.query({
    query: queryText,
    location: BQ_LOCATION,
    useQueryCache: true,
    defaultDataset: {
      projectId: BQ_PROJECT_ID,
      datasetId: BQ_DATASET,
    },
  })
  const fields = metadata?.schema?.fields ?? []
  return { rows: normalizeBigQueryRows(rows), fields }
}

const app = express()
app.use(express.json({ limit: '5mb' }))

app.get('/api/health', async (req, res) => {
  try {
    await runBigQuery('SELECT 1')
    res.json({ status: 'ok' })
  } catch (err) {
    console.error('[server] healthcheck failure', err)
    res.status(500).json({ status: 'error' })
  }
})

app.get('/api/indicadores.csv', async (req, res) => {
  try {
    const result = await runBigQuery(exportQuery)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.send(buildCsv(result))
  } catch (err) {
    console.error('[server] falha ao gerar CSV', err)
    res.status(500).json({ error: 'Falha ao gerar CSV de indicadores.' })
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

  const cacheEnabled = Number.isFinite(QUERY_CACHE_TTL_MS) && QUERY_CACHE_TTL_MS > 0
  const cacheKey = cacheEnabled ? getCacheKey(sanitized) : null
  if (cacheKey) {
    const cachedRows = getCachedRows(cacheKey)
    if (cachedRows) {
      return res.json({ rows: cachedRows, cache: 'hit' })
    }
    const inflight = inFlightQueries.get(cacheKey)
    if (inflight) {
      try {
        const rows = await inflight
        return res.json({ rows, cache: 'deduped' })
      } catch (err) {
        // deixa cair para executar normalmente
      }
    }
  }

  try {
    const queryPromise = runBigQuery(sanitized)
      .then((result) => result.rows)
      .finally(() => {
        if (cacheKey) {
          inFlightQueries.delete(cacheKey)
        }
      })

    if (cacheKey) {
      inFlightQueries.set(cacheKey, queryPromise)
    }

    const rows = await queryPromise
    if (cacheKey) {
      setCachedRows(cacheKey, rows)
    }
    res.json({ rows, cache: cacheKey ? 'miss' : 'disabled' })
  } catch (err) {
    console.error('[server] erro ao executar consulta', err?.message ?? err, '\nSQL:', sanitized)
    res.status(500).json({ error: 'Falha ao executar consulta' })
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
