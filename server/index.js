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
const BQ_EXPORT_VIEW = process.env.BQ_EXPORT_VIEW ?? process.env.BQ_DATASET_VIEW ?? 'indicadores_curados'
const EXPORT_SQL_PATH = path.resolve(__dirname, '../db/export_indicadores.sql')
const DIST_DIR = path.resolve(__dirname, '../dist')

const bigquery = new BigQuery({
  projectId: BQ_PROJECT_ID,
})

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 20_000)

const QUERY_CACHE_TTL_MS = Number(process.env.QUERY_CACHE_TTL_MS ?? 60_000)
const QUERY_CACHE_MAX_ENTRIES = Number(process.env.QUERY_CACHE_MAX_ENTRIES ?? 250)

const queryCache = new Map()
const inFlightQueries = new Map()

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

function buildCorrelationPrompt(summary) {
  const payload = JSON.stringify(summary, null, 2)
  return [
    'Dados resumidos do painel de correlacao entre despesa comercial e desempenho.',
    'Use somente as informacoes fornecidas para comentar; nao invente dados.',
    'Se |r| < 0.20, diga que nao ha correlacao linear clara.',
    'Se n < 5, indique que a amostra e pequena e evite conclusoes fortes.',
    'Retorne 3 a 5 bullets e uma conclusao final em uma unica frase.',
    '',
    payload,
  ].join('\n')
}

function buildDashboardPrompt(summary) {
  const payload = JSON.stringify(summary, null, 2)
  return [
    'Voce vai gerar comentarios sobre o dashboard com base no resumo abaixo.',
    'Responda em Markdown com blocos titulados exatamente assim:',
    '## Visao geral',
    '## Indicadores',
    '## Ranking',
    '## Tendencias',
    '## Monetarios',
    '## Correlacao (se aplicavel)',
    'Para Indicadores e Tendencias, gere uma linha por item informado (use "- <label>: ...").',
    'Se nao houver dados suficientes em algum bloco, escreva "Sem dados suficientes".',
    'Se |r| < 0.20, diga que nao ha correlacao linear clara.',
    'Se n < 5, indique que a amostra e pequena.',
    '',
    payload,
  ].join('\n')
}

function getTokenLimitPayload(model, maxTokens) {
  const normalized = String(model ?? '').trim().toLowerCase()
  const useCompletionTokens = normalized.startsWith('gpt-5') || normalized.startsWith('o')
  return useCompletionTokens ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }
}

function getTemperaturePayload(model) {
  const normalized = String(model ?? '').trim().toLowerCase()
  const disableTemperature = normalized.startsWith('gpt-5') || normalized.startsWith('o')
  return disableTemperature ? {} : { temperature: 0.3 }
}

async function requestOpenAiAnalysis({ system, prompt, maxTokens = 260 }) {
  if (!OPENAI_API_KEY) {
    const error = new Error('OpenAI API key nao configurada.')
    error.code = 'OPENAI_DISABLED'
    throw error
  }
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API indisponivel no servidor.')
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)
  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              system ??
              'Voce e um analista de performance de operadoras de saude. Escreva comentarios curtos e objetivos em PT-BR.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...getTokenLimitPayload(OPENAI_MODEL, maxTokens),
        ...getTemperaturePayload(OPENAI_MODEL),
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      throw new Error(`OpenAI erro ${response.status}: ${bodyText || 'Falha na requisicao.'}`)
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Resposta vazia da OpenAI.')
    }
    return content.trim()
  } finally {
    clearTimeout(timeout)
  }
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

app.post('/api/analysis/correlation', async (req, res) => {
  const summary = req.body?.summary
  if (!summary || typeof summary !== 'object') {
    return res.status(400).json({ error: 'Resumo invalido para analise.' })
  }
  const summaryText = JSON.stringify(summary)
  if (summaryText.length > 12_000) {
    return res.status(413).json({ error: 'Resumo muito extenso para analise.' })
  }
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OpenAI API key nao configurada.' })
  }
  try {
    const text = await requestOpenAiAnalysis({
      prompt: buildCorrelationPrompt(summary),
      maxTokens: 260,
    })
    return res.json({ text })
  } catch (err) {
    if (err?.code === 'OPENAI_DISABLED') {
      return res.status(503).json({ error: 'OpenAI API key nao configurada.' })
    }
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout ao gerar comentarios.' })
    }
    console.error('[server] falha ao gerar comentarios', err?.message ?? err)
    return res.status(500).json({ error: 'Falha ao gerar comentarios.' })
  }
})

app.post('/api/analysis/dashboard', async (req, res) => {
  const summary = req.body?.summary
  if (!summary || typeof summary !== 'object') {
    return res.status(400).json({ error: 'Resumo invalido para analise.' })
  }
  const summaryText = JSON.stringify(summary)
  if (summaryText.length > 30_000) {
    return res.status(413).json({ error: 'Resumo muito extenso para analise.' })
  }
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OpenAI API key nao configurada.' })
  }
  const indicatorCount = Array.isArray(summary?.indicatorGroups)
    ? summary.indicatorGroups.reduce((sum, group) => sum + (group?.metrics?.length ?? 0), 0)
    : 0
  const trendCount = Array.isArray(summary?.trendStats) ? summary.trendStats.length : 0
  const estimatedTokens = 600 + indicatorCount * 12 + trendCount * 8
  const maxTokens = Math.min(2000, Math.max(700, estimatedTokens))
  try {
    const text = await requestOpenAiAnalysis({
      prompt: buildDashboardPrompt(summary),
      maxTokens,
    })
    return res.json({ text })
  } catch (err) {
    if (err?.code === 'OPENAI_DISABLED') {
      return res.status(503).json({ error: 'OpenAI API key nao configurada.' })
    }
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout ao gerar comentarios.' })
    }
    console.error('[server] falha ao gerar comentarios do dashboard', err?.message ?? err)
    return res.status(500).json({ error: 'Falha ao gerar comentarios do dashboard.' })
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
