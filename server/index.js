import express from 'express'
import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import admin from 'firebase-admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.SERVER_PORT ?? process.env.PORT ?? 4000
const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const BQ_DATASET = process.env.BQ_DATASET ?? 'datalake_ans'
const BQ_LOCATION = process.env.BQ_LOCATION ?? 'US'
const BQ_EXPORT_VIEW = process.env.BQ_EXPORT_VIEW ?? process.env.BQ_DATASET_VIEW ?? 'indicadores_curados_snapshot'
const BQ_PRESTADORES_TABLE =
  process.env.BQ_PRESTADORES_TABLE ?? `${BQ_PROJECT_ID}.${BQ_DATASET}.prestadores_ativos_uniodonto_origem`
const EXPORT_SQL_PATH = path.resolve(__dirname, '../db/export_indicadores.sql')
const DIST_DIR = path.resolve(__dirname, '../dist')

const bigquery = new BigQuery({
  projectId: BQ_PROJECT_ID,
})

const QUERY_CACHE_TTL_MS = Number(process.env.QUERY_CACHE_TTL_MS ?? 60_000)
const QUERY_CACHE_MAX_ENTRIES = Number(process.env.QUERY_CACHE_MAX_ENTRIES ?? 250)

const queryCache = new Map()
const inFlightQueries = new Map()

const RAW_ALLOWED_VIEWS = process.env.BQ_ALLOWED_VIEWS
const ALLOWED_TABLES = (() => {
  const allowed = new Set()
  const add = (value) => {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) return
    const normalized = trimmed.replace(/^`|`$/g, '').replace(/^"|"$/g, '')
    if (!normalized) return
    allowed.add(normalized)
    const parts = normalized.split('.')
    if (parts.length === 3) {
      allowed.add(parts.slice(1).join('.'))
      allowed.add(parts[2])
    } else if (parts.length === 2) {
      allowed.add(parts[1])
    }
  }
  if (RAW_ALLOWED_VIEWS) {
    RAW_ALLOWED_VIEWS.split(',').forEach(add)
  } else {
    add(BQ_EXPORT_VIEW)
    const normalizedExport = String(BQ_EXPORT_VIEW ?? '').replace(/^`|`$/g, '').replace(/^"|"$/g, '')
    if (normalizedExport && normalizedExport.split('.').length === 1) {
      add(`${BQ_DATASET}.${BQ_EXPORT_VIEW}`)
      add(`${BQ_PROJECT_ID}.${BQ_DATASET}.${BQ_EXPORT_VIEW}`)
    }
    add(BQ_PRESTADORES_TABLE)
  }
  return allowed
})()

const SERVER_BOOT_ID = process.env.K_REVISION ?? crypto.randomBytes(8).toString('hex')

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT_ID,
  })
}

const AUTH_PUBLIC_PATHS = new Set(['/api/health', '/api/auth/status'])

function extractToken(req) {
  const header = req.headers.authorization
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice(7).trim()
    if (token) return token
  }
  const fallback = req.headers['x-auth-token']
  if (typeof fallback === 'string' && fallback.trim()) return fallback.trim()
  return null
}

async function authMiddleware(req, res, next) {
  if (!req.path.startsWith('/api')) return next()
  if (req.method === 'OPTIONS') return next()
  if (AUTH_PUBLIC_PATHS.has(req.path)) return next()
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Autenticacao necessaria.' })
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
    }
    return next()
  } catch (err) {
    console.warn('[server] Token Firebase invalido', err?.message ?? err)
    return res.status(401).json({ error: 'Autenticacao necessaria.' })
  }
}

function getCacheKey(sql) {
  return crypto
    .createHash('sha256')
    .update(`${BQ_PROJECT_ID}.${BQ_DATASET}:${BQ_LOCATION}:${sql}`)
    .digest('hex')
}

function extractCteNames(sql) {
  const trimmed = String(sql ?? '').trim()
  if (!/^with\b/i.test(trimmed)) return new Set()
  const body = trimmed.replace(/^with\b/i, '')
  const names = new Set()
  const regex = /(?:^|,)\s*([a-zA-Z_][\w]*)\s+as\s*\(/gi
  let match = null
  while ((match = regex.exec(body))) {
    names.add(match[1])
  }
  return names
}

function extractTableRefs(sql, cteNames) {
  const refs = new Set()
  const regex = /\b(from|join)\s+([`"][^`"]+[`"]|[a-zA-Z0-9_.:-]+)/gi
  let match = null
  while ((match = regex.exec(sql))) {
    const raw = match[2]
    if (!raw) continue
    const cleaned = raw.replace(/[,)]$/g, '').replace(/^`|`$/g, '').replace(/^"|"$/g, '')
    if (!cleaned || cleaned.startsWith('(')) continue
    if (cleaned.toLowerCase() === 'unnest') continue
    if (cteNames?.has(cleaned)) continue
    refs.add(cleaned)
  }
  return refs
}

function getCachedEntry(key) {
  const cached = queryCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    queryCache.delete(key)
    return null
  }
  queryCache.delete(key)
  queryCache.set(key, cached)
  return cached
}

function setCachedEntry(key, entry) {
  if (!Number.isFinite(QUERY_CACHE_TTL_MS) || QUERY_CACHE_TTL_MS <= 0) return
  if (!Number.isFinite(QUERY_CACHE_MAX_ENTRIES) || QUERY_CACHE_MAX_ENTRIES <= 0) return
  queryCache.set(key, { rows: entry.rows, fields: entry.fields ?? [], expiresAt: Date.now() + QUERY_CACHE_TTL_MS })
  while (queryCache.size > QUERY_CACHE_MAX_ENTRIES) {
    const oldestKey = queryCache.keys().next().value
    if (!oldestKey) break
    queryCache.delete(oldestKey)
  }
}

function formatTableRef(name) {
  if (!name) return name
  if (name.includes('`')) return name
  return `\`${name}\``
}

const exportQueryTemplate = fs.readFileSync(EXPORT_SQL_PATH, 'utf8').trim().replace(/;[\s]*$/, '')
const exportQuery = exportQueryTemplate.replaceAll('{{DATASET_VIEW}}', formatTableRef(BQ_EXPORT_VIEW))

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
app.use(authMiddleware)

app.get('/api/auth/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.json({ enabled: true, bootId: SERVER_BOOT_ID, projectId: FIREBASE_PROJECT_ID ?? null })
})

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
  const cteNames = extractCteNames(sanitized)
  const tableRefs = extractTableRefs(sanitized, cteNames)
  const disallowed = [...tableRefs].filter((ref) => !ALLOWED_TABLES.has(ref))
  if (disallowed.length) {
    return res.status(403).json({
      error: 'Consulta bloqueada. Acesso permitido apenas às views/tabelas autorizadas.',
      tables: disallowed,
    })
  }

  const includeFields = Boolean(req.body?.includeFields)
  const cacheEnabled = Number.isFinite(QUERY_CACHE_TTL_MS) && QUERY_CACHE_TTL_MS > 0
  const cacheKey = cacheEnabled ? getCacheKey(sanitized) : null
  if (cacheKey) {
    const cachedEntry = getCachedEntry(cacheKey)
    if (cachedEntry) {
      return res.json({
        rows: cachedEntry.rows,
        fields: includeFields ? cachedEntry.fields ?? [] : undefined,
        cache: 'hit',
      })
    }
    const inflight = inFlightQueries.get(cacheKey)
    if (inflight) {
      try {
        const entry = await inflight
        return res.json({
          rows: entry.rows,
          fields: includeFields ? entry.fields ?? [] : undefined,
          cache: 'deduped',
        })
      } catch {
        // deixa cair para executar normalmente
      }
    }
  }

  try {
    const queryPromise = runBigQuery(sanitized).finally(() => {
      if (cacheKey) {
        inFlightQueries.delete(cacheKey)
      }
    })

    if (cacheKey) {
      inFlightQueries.set(cacheKey, queryPromise)
    }

    const entry = await queryPromise
    if (cacheKey) {
      setCachedEntry(cacheKey, entry)
    }
    res.json({
      rows: entry.rows,
      fields: includeFields ? entry.fields ?? [] : undefined,
      cache: cacheKey ? 'miss' : 'disabled',
    })
  } catch (err) {
    console.error('[server] erro ao executar consulta', err?.message ?? err, '\nSQL:', sanitized)
    res.status(500).json({ error: 'Falha ao executar consulta' })
  }
})

const SHOULD_SERVE_STATIC =
  process.env.SERVE_STATIC === 'true' || (process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR))

if (SHOULD_SERVE_STATIC) {
  app.use(express.static(DIST_DIR))
  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Rota nao encontrada.' })
    }
    return res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[server] API disponível em http://localhost:${PORT}`)
})
