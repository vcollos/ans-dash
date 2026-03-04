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
const BQ_MART_DATASET = process.env.BQ_MART_DATASET ?? 'dash_ans'
const BQ_LOCATION = process.env.BQ_LOCATION ?? 'US'
const BQ_EXPORT_VIEW =
  process.env.BQ_EXPORT_VIEW ?? process.env.BQ_DATASET_VIEW ?? `${BQ_MART_DATASET}.indicadores_curados_snapshot`
const BQ_MART_ANS_TABLE = process.env.BQ_MART_ANS_TABLE ?? process.env.BQ_DATASET_VIEW_ANS ?? ''
const BQ_MART_UNIODONTO_TABLE =
  process.env.BQ_MART_UNIODONTO_TABLE ?? process.env.BQ_DATASET_VIEW_UNIODONTO ?? ''
const BQ_PRESTADORES_TABLE =
  process.env.BQ_PRESTADORES_TABLE ?? `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.prestadores_ativos_uniodonto_origem`
const EXPORT_SQL_PATH = path.resolve(__dirname, '../db/export_indicadores.sql')
const DIST_DIR = path.resolve(__dirname, '../dist')
const DEMONSTRACOES_TEMPLATE_CSV = `competencia;reg_ans;cnpj;cd_conta_contabil;vl_saldo_final;descricao;vl_saldo_inicial;vl_debitos;vl_creditos;moeda;status_fechamento;tipo_envio;versao_envio;dt_envio;sistema_origem;responsavel_nome;responsavel_email;qt_beneficiarios;qt_prestadores;modalidade;porte;observacoes`
const DEMONSTRACOES_EXAMPLE_CSV = `competencia;reg_ans;cnpj;cd_conta_contabil;vl_saldo_final;descricao;vl_saldo_inicial;vl_debitos;vl_creditos;moeda;status_fechamento;tipo_envio;versao_envio;dt_envio;sistema_origem;responsavel_nome;responsavel_email;qt_beneficiarios;qt_prestadores;modalidade;porte;observacoes
2026-01;123456;12345678000190;311;1200000.00;CONTRAPRESTACOES;;;;BRL;FECHADO;NORMAL;1;2026-02-05T18:22:10Z;ERP-EXEMPLO;Maria Silva;maria@operadora.com.br;18234;542;Cooperativa odontologica;Medio Porte;
2026-01;123456;12345678000190;41;600000.00;EVENTOS LIQUIDOS;;;;BRL;FECHADO;NORMAL;1;2026-02-05T18:22:10Z;ERP-EXEMPLO;Maria Silva;maria@operadora.com.br;18234;542;Cooperativa odontologica;Medio Porte;
2026-01;123456;12345678000190;46;180000.00;DESPESAS ADMINISTRATIVAS;;;;BRL;FECHADO;NORMAL;1;2026-02-05T18:22:10Z;ERP-EXEMPLO;Maria Silva;maria@operadora.com.br;18234;542;Cooperativa odontologica;Medio Porte;
2026-01;123456;12345678000190;12;800000.00;ATIVO CIRCULANTE;;;;BRL;FECHADO;NORMAL;1;2026-02-05T18:22:10Z;ERP-EXEMPLO;Maria Silva;maria@operadora.com.br;18234;542;Cooperativa odontologica;Medio Porte;
2026-01;123456;12345678000190;21;500000.00;PASSIVO CIRCULANTE;;;;BRL;FECHADO;NORMAL;1;2026-02-05T18:22:10Z;ERP-EXEMPLO;Maria Silva;maria@operadora.com.br;18234;542;Cooperativa odontologica;Medio Porte;`
const BQ_AUX_DATASET = process.env.BQ_AUX_DATASET ?? process.env.BQ_MART_DATASET ?? BQ_MART_DATASET
const BQ_AUX_DEMONSTRACOES_TABLE = process.env.BQ_AUX_DEMONSTRACOES_TABLE ?? 'demonstracoes_contabeis_auxiliar'
const BQ_AUX_DEMONSTRACOES_LATEST_VIEW =
  process.env.BQ_AUX_DEMONSTRACOES_LATEST_VIEW ?? 'vw_demonstracoes_contabeis_auxiliar_latest'
const BQ_BASE_DEMONSTRACOES_TABLE =
  process.env.BQ_BASE_DEMONSTRACOES_TABLE ?? `${BQ_PROJECT_ID}.${BQ_DATASET}.demonstracoes_contabeis`
const BQ_CONSOLIDATED_DEMONSTRACOES_VIEW =
  process.env.BQ_CONSOLIDATED_DEMONSTRACOES_VIEW ??
  `${BQ_PROJECT_ID}.${BQ_AUX_DATASET}.vw_demonstracoes_contabeis_consolidada`
const SHOULD_REFRESH_CONSOLIDATED_VIEW = (process.env.BQ_REFRESH_CONSOLIDATED_VIEW ?? 'true')
  .toLowerCase()
  .trim() === 'true'

function parseTableRef(rawValue, defaultDataset = BQ_DATASET) {
  const normalized = String(rawValue ?? '')
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/^"|"$/g, '')
  if (!normalized) {
    throw new Error('Referencia de tabela/view vazia.')
  }
  const parts = normalized.split('.').filter(Boolean)
  if (parts.length === 1) {
    return {
      projectId: BQ_PROJECT_ID,
      datasetId: defaultDataset,
      objectId: parts[0],
      fqn: `${BQ_PROJECT_ID}.${defaultDataset}.${parts[0]}`,
    }
  }
  if (parts.length === 2) {
    return {
      projectId: BQ_PROJECT_ID,
      datasetId: parts[0],
      objectId: parts[1],
      fqn: `${BQ_PROJECT_ID}.${parts[0]}.${parts[1]}`,
    }
  }
  return {
    projectId: parts[0],
    datasetId: parts[1],
    objectId: parts[2],
    fqn: `${parts[0]}.${parts[1]}.${parts[2]}`,
  }
}

const AUX_DEMONSTRACOES_TABLE_REF = parseTableRef(BQ_AUX_DEMONSTRACOES_TABLE, BQ_AUX_DATASET)
const AUX_DEMONSTRACOES_LATEST_VIEW_REF = parseTableRef(BQ_AUX_DEMONSTRACOES_LATEST_VIEW, BQ_AUX_DATASET)
const BASE_DEMONSTRACOES_TABLE_REF = parseTableRef(BQ_BASE_DEMONSTRACOES_TABLE, BQ_DATASET)
const CONSOLIDATED_DEMONSTRACOES_VIEW_REF = parseTableRef(BQ_CONSOLIDATED_DEMONSTRACOES_VIEW, BQ_AUX_DATASET)
const EXPORT_VIEW_REF = parseTableRef(BQ_EXPORT_VIEW, BQ_MART_DATASET)

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
    add(EXPORT_VIEW_REF.fqn)
    add(BQ_MART_ANS_TABLE)
    add(BQ_MART_UNIODONTO_TABLE)
    const normalizedMartAns = String(BQ_MART_ANS_TABLE ?? '').replace(/^`|`$/g, '').replace(/^"|"$/g, '')
    if (normalizedMartAns && normalizedMartAns.split('.').length === 1) {
      add(`${BQ_MART_DATASET}.${BQ_MART_ANS_TABLE}`)
      add(`${BQ_PROJECT_ID}.${BQ_MART_DATASET}.${BQ_MART_ANS_TABLE}`)
    }
    const normalizedMartUni = String(BQ_MART_UNIODONTO_TABLE ?? '').replace(/^`|`$/g, '').replace(/^"|"$/g, '')
    if (normalizedMartUni && normalizedMartUni.split('.').length === 1) {
      add(`${BQ_MART_DATASET}.${BQ_MART_UNIODONTO_TABLE}`)
      add(`${BQ_PROJECT_ID}.${BQ_MART_DATASET}.${BQ_MART_UNIODONTO_TABLE}`)
    }
    add(BQ_PRESTADORES_TABLE)
    add(AUX_DEMONSTRACOES_LATEST_VIEW_REF.fqn)
    add(CONSOLIDATED_DEMONSTRACOES_VIEW_REF.fqn)
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
const exportQuery = exportQueryTemplate
  .replaceAll('{{DATASET_VIEW}}', formatTableRef(EXPORT_VIEW_REF.fqn))
  .replaceAll('{{PRESTADORES_TABLE}}', formatTableRef(BQ_PRESTADORES_TABLE))

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

const DEMONSTRACOES_MAX_UPLOAD_ROWS = Number(process.env.DEMONSTRACOES_MAX_UPLOAD_ROWS ?? 10_000)
const DEMONSTRACOES_REQUIRED_FIELDS = ['competencia', 'reg_ans', 'cd_conta_contabil', 'vl_saldo_final']
const DEMONSTRACOES_ALLOWED_FIELDS = [
  'competencia',
  'reg_ans',
  'cnpj',
  'cd_conta_contabil',
  'vl_saldo_final',
  'descricao',
  'vl_saldo_inicial',
  'vl_debitos',
  'vl_creditos',
  'moeda',
  'status_fechamento',
  'tipo_envio',
  'versao_envio',
  'dt_envio',
  'sistema_origem',
  'responsavel_nome',
  'responsavel_email',
  'qt_beneficiarios',
  'qt_prestadores',
  'modalidade',
  'porte',
  'observacoes',
]

function normalizeHeaderName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeRowObject(rawRow = {}) {
  const normalized = {}
  Object.entries(rawRow ?? {}).forEach(([key, value]) => {
    const mappedKey = normalizeHeaderName(key)
    if (!mappedKey) return
    normalized[mappedKey] = value
  })
  return normalized
}

function toNullableString(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text : null
}

function parseFlexibleNumber(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  let text = String(value).trim()
  if (!text) return null
  text = text.replace(/\s+/g, '')
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(text)) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d+,\d+$/.test(text)) {
    text = text.replace(',', '.')
  } else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(text)) {
    text = text.replace(/,/g, '')
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '')
  }
  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : null
}

function parseFlexibleInteger(value) {
  const numeric = parseFlexibleNumber(value)
  if (!Number.isFinite(numeric)) return null
  return Number.isInteger(numeric) ? numeric : Math.trunc(numeric)
}

function parseCompetencia(competenciaValue) {
  const raw = toNullableString(competenciaValue)
  if (!raw) return null
  const match = raw.match(/^(\d{4})[-/](0[1-9]|1[0-2])$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const quarter = Math.floor((month - 1) / 3) + 1
  return {
    competencia: `${match[1]}-${match[2]}`,
    ano: year,
    trimestre: quarter,
    data: `${match[1]}-${match[2]}-01`,
  }
}

function parseTimestampValue(value) {
  const text = toNullableString(value)
  if (!text) return null
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function isSingularOperator(name) {
  return /\bsingular\b/i.test(String(name ?? ''))
}

function chunkList(values = [], size = 500) {
  const chunks = []
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size))
  }
  return chunks
}

async function ensureAuxDemonstracoesTable() {
  const dataset = bigquery.dataset(AUX_DEMONSTRACOES_TABLE_REF.datasetId)
  const [datasetExists] = await dataset.exists()
  if (!datasetExists) {
    throw new Error(`Dataset ${AUX_DEMONSTRACOES_TABLE_REF.projectId}.${AUX_DEMONSTRACOES_TABLE_REF.datasetId} não existe.`)
  }

  const table = dataset.table(AUX_DEMONSTRACOES_TABLE_REF.objectId)
  const [tableExists] = await table.exists()
  if (!tableExists) {
    await table.create({
      schema: [
        { name: 'upload_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'uploaded_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'uploaded_by_uid', type: 'STRING' },
        { name: 'uploaded_by_email', type: 'STRING' },
        { name: 'source_file_name', type: 'STRING' },
        { name: 'operator_name', type: 'STRING' },
        { name: 'competencia', type: 'STRING', mode: 'REQUIRED' },
        { name: 'ano', type: 'INT64', mode: 'REQUIRED' },
        { name: 'trimestre', type: 'INT64', mode: 'REQUIRED' },
        { name: 'data', type: 'DATE', mode: 'REQUIRED' },
        { name: 'reg_ans', type: 'STRING', mode: 'REQUIRED' },
        { name: 'cnpj', type: 'STRING' },
        { name: 'cd_conta_contabil', type: 'STRING', mode: 'REQUIRED' },
        { name: 'vl_saldo_final', type: 'FLOAT64', mode: 'REQUIRED' },
        { name: 'descricao', type: 'STRING' },
        { name: 'vl_saldo_inicial', type: 'FLOAT64' },
        { name: 'vl_debitos', type: 'FLOAT64' },
        { name: 'vl_creditos', type: 'FLOAT64' },
        { name: 'moeda', type: 'STRING' },
        { name: 'status_fechamento', type: 'STRING' },
        { name: 'tipo_envio', type: 'STRING' },
        { name: 'versao_envio', type: 'INT64' },
        { name: 'dt_envio', type: 'TIMESTAMP' },
        { name: 'sistema_origem', type: 'STRING' },
        { name: 'responsavel_nome', type: 'STRING' },
        { name: 'responsavel_email', type: 'STRING' },
        { name: 'qt_beneficiarios', type: 'INT64' },
        { name: 'qt_prestadores', type: 'INT64' },
        { name: 'modalidade', type: 'STRING' },
        { name: 'porte', type: 'STRING' },
        { name: 'observacoes', type: 'STRING' },
        { name: 'arquivo_origem', type: 'STRING' },
      ],
      location: BQ_LOCATION,
      timePartitioning: {
        type: 'DAY',
        field: 'uploaded_at',
      },
      clustering: {
        fields: ['reg_ans', 'competencia', 'cd_conta_contabil'],
      },
    })
  }
  return table
}

async function refreshAuxDemonstracoesLatestView() {
  const query = `
    CREATE OR REPLACE VIEW \`${AUX_DEMONSTRACOES_LATEST_VIEW_REF.fqn}\` AS
    WITH ranked AS (
      SELECT
        upload_id,
        uploaded_at,
        uploaded_by_uid,
        uploaded_by_email,
        source_file_name,
        operator_name,
        competencia,
        ano,
        trimestre,
        data,
        reg_ans,
        cnpj,
        cd_conta_contabil,
        descricao,
        vl_saldo_inicial,
        vl_saldo_final,
        vl_debitos,
        vl_creditos,
        moeda,
        status_fechamento,
        tipo_envio,
        versao_envio,
        dt_envio,
        sistema_origem,
        responsavel_nome,
        responsavel_email,
        qt_beneficiarios,
        qt_prestadores,
        modalidade,
        porte,
        observacoes,
        arquivo_origem
      FROM \`${AUX_DEMONSTRACOES_TABLE_REF.fqn}\`
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY competencia, reg_ans, cd_conta_contabil
        ORDER BY COALESCE(versao_envio, 0) DESC, uploaded_at DESC
      ) = 1
    )
    SELECT * FROM ranked
  `
  await bigquery.query({ query, location: BQ_LOCATION })
}

async function refreshConsolidatedDemonstracoesView() {
  const query = `
    CREATE OR REPLACE VIEW \`${CONSOLIDATED_DEMONSTRACOES_VIEW_REF.fqn}\` AS
    WITH aux_latest AS (
      SELECT
        data,
        SAFE_CAST(reg_ans AS INT64) AS reg_ans,
        cd_conta_contabil,
        COALESCE(descricao, '') AS descricao,
        vl_saldo_inicial,
        vl_saldo_final,
        ano,
        trimestre,
        arquivo_origem
      FROM \`${AUX_DEMONSTRACOES_LATEST_VIEW_REF.fqn}\`
    ), base_only AS (
      SELECT
        DATE(b.data) AS data,
        SAFE_CAST(b.reg_ans AS INT64) AS reg_ans,
        CAST(b.cd_conta_contabil AS STRING) AS cd_conta_contabil,
        CAST(b.descricao AS STRING) AS descricao,
        SAFE_CAST(b.vl_saldo_inicial AS FLOAT64) AS vl_saldo_inicial,
        SAFE_CAST(b.vl_saldo_final AS FLOAT64) AS vl_saldo_final,
        SAFE_CAST(b.ano AS INT64) AS ano,
        SAFE_CAST(b.trimestre AS INT64) AS trimestre,
        CAST(b.arquivo_origem AS STRING) AS arquivo_origem
      FROM \`${BASE_DEMONSTRACOES_TABLE_REF.fqn}\` b
      LEFT JOIN aux_latest a
        ON SAFE_CAST(b.reg_ans AS STRING) = SAFE_CAST(a.reg_ans AS STRING)
       AND CAST(b.cd_conta_contabil AS STRING) = a.cd_conta_contabil
       AND SAFE_CAST(b.ano AS INT64) = a.ano
       AND SAFE_CAST(b.trimestre AS INT64) = a.trimestre
      WHERE a.reg_ans IS NULL
    )
    SELECT * FROM base_only
    UNION ALL
    SELECT * FROM aux_latest
  `
  await bigquery.query({ query, location: BQ_LOCATION })
}

function buildNormalizedUploadRow(rawRow = {}, context = {}) {
  const normalized = normalizeRowObject(rawRow)
  const competenciaParts = parseCompetencia(normalized.competencia)
  if (!competenciaParts) {
    return { error: 'Competência inválida. Use o formato YYYY-MM.' }
  }

  const regAnsText = toNullableString(normalized.reg_ans)?.replace(/\D+/g, '') ?? ''
  if (!regAnsText) {
    return { error: 'reg_ans é obrigatório.' }
  }
  if (context.operatorRegAns && regAnsText !== context.operatorRegAns) {
    return { error: `reg_ans ${regAnsText} não confere com a operadora selecionada (${context.operatorRegAns}).` }
  }

  const conta = toNullableString(normalized.cd_conta_contabil)
  if (!conta) {
    return { error: 'cd_conta_contabil é obrigatório.' }
  }

  const saldoFinal = parseFlexibleNumber(normalized.vl_saldo_final)
  if (!Number.isFinite(saldoFinal)) {
    return { error: 'vl_saldo_final é obrigatório e precisa ser numérico.' }
  }

  const row = {
    competencia: competenciaParts.competencia,
    ano: competenciaParts.ano,
    trimestre: competenciaParts.trimestre,
    data: competenciaParts.data,
    reg_ans: regAnsText,
    cnpj: toNullableString(normalized.cnpj)?.replace(/\D+/g, '') ?? null,
    cd_conta_contabil: conta,
    vl_saldo_final: saldoFinal,
    descricao: toNullableString(normalized.descricao),
    vl_saldo_inicial: parseFlexibleNumber(normalized.vl_saldo_inicial),
    vl_debitos: parseFlexibleNumber(normalized.vl_debitos),
    vl_creditos: parseFlexibleNumber(normalized.vl_creditos),
    moeda: toNullableString(normalized.moeda) ?? 'BRL',
    status_fechamento: toNullableString(normalized.status_fechamento),
    tipo_envio: toNullableString(normalized.tipo_envio),
    versao_envio: parseFlexibleInteger(normalized.versao_envio),
    dt_envio: parseTimestampValue(normalized.dt_envio),
    sistema_origem: toNullableString(normalized.sistema_origem),
    responsavel_nome: toNullableString(normalized.responsavel_nome),
    responsavel_email: toNullableString(normalized.responsavel_email),
    qt_beneficiarios: parseFlexibleInteger(normalized.qt_beneficiarios),
    qt_prestadores: parseFlexibleInteger(normalized.qt_prestadores),
    modalidade: toNullableString(normalized.modalidade),
    porte: toNullableString(normalized.porte),
    observacoes: toNullableString(normalized.observacoes),
  }

  return { row }
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

app.get('/api/import/demonstracoes/template.csv', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Disposition', 'attachment; filename="demonstracoes_contabeis_template.csv"')
  res.send(DEMONSTRACOES_TEMPLATE_CSV)
})

app.get('/api/import/demonstracoes/exemplo.csv', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Disposition', 'attachment; filename="demonstracoes_contabeis_exemplo.csv"')
  res.send(DEMONSTRACOES_EXAMPLE_CSV)
})

app.post('/api/import/singular-demonstracoes', async (req, res) => {
  const operatorName = toNullableString(req.body?.operatorName)
  const operatorRegAns = toNullableString(req.body?.operatorRegAns)?.replace(/\D+/g, '') ?? null
  const fileName = toNullableString(req.body?.fileName) ?? 'upload.csv'
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null

  if (!operatorName || !isSingularOperator(operatorName)) {
    return res.status(400).json({
      error: 'Importação permitida apenas para operadoras Singular selecionadas.',
    })
  }
  if (!rows?.length) {
    return res.status(400).json({ error: 'Nenhuma linha de dados foi enviada.' })
  }
  if (rows.length > DEMONSTRACOES_MAX_UPLOAD_ROWS) {
    return res.status(400).json({
      error: `Arquivo excede o limite de ${DEMONSTRACOES_MAX_UPLOAD_ROWS} linhas por envio.`,
    })
  }

  const unknownFields = new Set()
  rows.forEach((rawRow) => {
    const normalized = normalizeRowObject(rawRow)
    Object.keys(normalized).forEach((field) => {
      if (!DEMONSTRACOES_ALLOWED_FIELDS.includes(field)) {
        unknownFields.add(field)
      }
    })
  })
  if (unknownFields.size) {
    return res.status(400).json({
      error: 'Arquivo contém colunas não suportadas.',
      fields: [...unknownFields].slice(0, 20),
    })
  }

  const normalizedRows = []
  const validationErrors = []
  const duplicateKeys = new Set()
  const seenKeys = new Set()

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2
    const missingFields = DEMONSTRACOES_REQUIRED_FIELDS.filter((field) => {
      const value = normalizeRowObject(rawRow)[field]
      return value === null || value === undefined || String(value).trim() === ''
    })
    if (missingFields.length) {
      validationErrors.push({
        row: rowNumber,
        message: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
      })
      return
    }
    const parsed = buildNormalizedUploadRow(rawRow, { operatorRegAns })
    if (parsed.error) {
      validationErrors.push({ row: rowNumber, message: parsed.error })
      return
    }
    const uniqueKey = `${parsed.row.competencia}|${parsed.row.reg_ans}|${parsed.row.cd_conta_contabil}`
    if (seenKeys.has(uniqueKey)) {
      duplicateKeys.add(uniqueKey)
      validationErrors.push({
        row: rowNumber,
        message: 'Linha duplicada para (competencia, reg_ans, cd_conta_contabil).',
      })
      return
    }
    seenKeys.add(uniqueKey)
    normalizedRows.push(parsed.row)
  })

  if (validationErrors.length) {
    return res.status(400).json({
      error: 'Falha na validação do arquivo.',
      details: validationErrors.slice(0, 50),
      duplicateCount: duplicateKeys.size,
    })
  }

  const uploadId = crypto.randomUUID()
  const uploadedAt = new Date().toISOString()
  const userUid = req.user?.uid ?? null
  const userEmail = req.user?.email ?? null
  const fileOrigin = `singular-upload:${fileName}`
  const records = normalizedRows.map((row) => ({
    upload_id: uploadId,
    uploaded_at: uploadedAt,
    uploaded_by_uid: userUid,
    uploaded_by_email: userEmail,
    source_file_name: fileName,
    operator_name: operatorName,
    competencia: row.competencia,
    ano: row.ano,
    trimestre: row.trimestre,
    data: row.data,
    reg_ans: row.reg_ans,
    cnpj: row.cnpj,
    cd_conta_contabil: row.cd_conta_contabil,
    descricao: row.descricao,
    vl_saldo_inicial: row.vl_saldo_inicial,
    vl_saldo_final: row.vl_saldo_final,
    vl_debitos: row.vl_debitos,
    vl_creditos: row.vl_creditos,
    moeda: row.moeda,
    status_fechamento: row.status_fechamento,
    tipo_envio: row.tipo_envio,
    versao_envio: row.versao_envio,
    dt_envio: row.dt_envio,
    sistema_origem: row.sistema_origem,
    responsavel_nome: row.responsavel_nome,
    responsavel_email: row.responsavel_email,
    qt_beneficiarios: row.qt_beneficiarios,
    qt_prestadores: row.qt_prestadores,
    modalidade: row.modalidade,
    porte: row.porte,
    observacoes: row.observacoes,
    arquivo_origem: fileOrigin,
  }))

  try {
    const table = await ensureAuxDemonstracoesTable()
    const chunks = chunkList(records, 500)
    for (const chunk of chunks) {
      await table.insert(chunk)
    }
    await refreshAuxDemonstracoesLatestView()
    let consolidatedViewWarning = null
    if (SHOULD_REFRESH_CONSOLIDATED_VIEW) {
      try {
        await refreshConsolidatedDemonstracoesView()
      } catch (err) {
        consolidatedViewWarning = err?.message ?? String(err)
      }
    }
    return res.json({
      success: true,
      uploadId,
      insertedRows: records.length,
      auxTable: AUX_DEMONSTRACOES_TABLE_REF.fqn,
      latestView: AUX_DEMONSTRACOES_LATEST_VIEW_REF.fqn,
      consolidatedView: SHOULD_REFRESH_CONSOLIDATED_VIEW ? CONSOLIDATED_DEMONSTRACOES_VIEW_REF.fqn : null,
      warning: consolidatedViewWarning,
    })
  } catch (err) {
    console.error('[server] Falha ao importar demonstracoes Singular', err)
    return res.status(500).json({
      error: 'Falha ao importar arquivo para a tabela auxiliar.',
      details: err?.message ?? String(err),
    })
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
