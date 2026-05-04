import express from 'express'
import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import admin from 'firebase-admin'
import nodemailer from 'nodemailer'
import {
  APPROVAL_STATUS,
  decideUhubMatch,
  isInactiveUhubPerson,
  last4,
  normalizeEmailForUhub,
  normalizePhoneForUhub,
  safeHash,
} from './uhubOnboarding.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const HOST = process.env.SERVER_HOST ?? '0.0.0.0'
const PORT = process.env.SERVER_PORT ?? process.env.PORT ?? 4000
const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const BQ_DATASET = process.env.BQ_DATASET ?? 'dash_ans'
const BQ_MART_DATASET = process.env.BQ_MART_DATASET ?? 'dash_ans'
const BQ_LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'
const BQ_EXPORT_VIEW =
  process.env.BQ_EXPORT_VIEW ?? process.env.BQ_DATASET_VIEW ?? `${BQ_MART_DATASET}.indicadores_curados_snapshot`
const BQ_MART_ANS_TABLE = process.env.BQ_MART_ANS_TABLE ?? process.env.BQ_DATASET_VIEW_ANS ?? ''
const BQ_MART_UNIODONTO_TABLE =
  process.env.BQ_MART_UNIODONTO_TABLE ?? process.env.BQ_DATASET_VIEW_UNIODONTO ?? ''
const BQ_PRESTADORES_TABLE =
  process.env.BQ_PRESTADORES_TABLE ?? `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.prestadores_ativos_uniodonto_origem`
const BQ_OPERADORAS_TABLE = process.env.BQ_OPERADORAS_TABLE ?? `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.operadoras`
const BQ_BENEFICIARIOS_ODONTO_TABLE =
  process.env.BQ_BENEFICIARIOS_ODONTO_TABLE ??
  `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.beneficiarios_odontologicas_por_operadora`
const EXPORT_SQL_PATH = path.resolve(__dirname, '../db/export_indicadores.sql')
const MART_SQL_PATH = path.resolve(__dirname, '../db/materialize_indicadores_mart.sql')
const DIST_DIR = path.resolve(__dirname, '../dist')
const DEFAULT_BQ_AUX_DATASET = 'dash_ans_uploads'
const DEMONSTRACOES_TEMPLATE_CSV = `cd_conta_contabil;vl_saldo_final`
const DEMONSTRACOES_EXAMPLE_CSV = `cd_conta_contabil;vl_saldo_final
311;1200000.00
41;600000.00
46;180000.00
12;800000.00
21;500000.00`
const BQ_AUX_DATASET = process.env.BQ_AUX_DATASET ?? DEFAULT_BQ_AUX_DATASET
const BQ_AUX_DEMONSTRACOES_TABLE = process.env.BQ_AUX_DEMONSTRACOES_TABLE ?? 'demonstracoes_contabeis_auxiliar'
const BQ_AUX_DEMONSTRACOES_LATEST_VIEW =
  process.env.BQ_AUX_DEMONSTRACOES_LATEST_VIEW ?? 'vw_demonstracoes_contabeis_auxiliar_latest'
const BQ_USER_ACCESS_TABLE = process.env.BQ_USER_ACCESS_TABLE ?? 'user_operadora_acessos'
const BQ_USER_PROFILE_TABLE = process.env.BQ_USER_PROFILE_TABLE ?? 'user_profile_completions'
const ENFORCE_USER_ACCESS = (process.env.BQ_ENFORCE_USER_ACCESS ?? 'true')
  .toLowerCase()
  .trim() === 'true'
const USER_ACCESS_CACHE_TTL_MS = Number(process.env.USER_ACCESS_CACHE_TTL_MS ?? 60_000)
const UHUB_API_BASE_URL = String(process.env.UHUB_API_BASE_URL ?? 'https://uhub.uniodonto.coop.br')
  .trim()
  .replace(/\/+$/, '')
const UHUB_API_TOKEN = String(process.env.UHUB_API_TOKEN ?? process.env.UHUB_TOKEN ?? '').trim()
const UHUB_API_TOKEN_PREFIX =
  String(process.env.UHUB_API_TOKEN_PREFIX ?? '').trim() || (UHUB_API_TOKEN ? UHUB_API_TOKEN.slice(0, 8) : null)
const UHUB_API_TIMEOUT_MS = Number(process.env.UHUB_API_TIMEOUT_MS ?? 5_000)
const UHUB_OPERATOR_CACHE_TTL_MS = Number(process.env.UHUB_OPERATOR_CACHE_TTL_MS ?? 10 * 60_000)
const PFC_ONBOARDING_COLLECTION = process.env.PFC_ONBOARDING_COLLECTION ?? 'pfc_users_uhub_link'
const PFC_ONBOARDING_LOG_COLLECTION = process.env.PFC_ONBOARDING_LOG_COLLECTION ?? 'pfc_onboarding_audit_logs'
const PFC_MARKETING_EMAIL = process.env.PFC_MARKETING_EMAIL ?? 'marketing@uniodonto.coop.br'
const SMTP_HOST = String(process.env.SMTP_HOST ?? '').trim()
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587)
const SMTP_USER = String(process.env.SMTP_USER ?? '').trim()
const SMTP_PASS = String(process.env.SMTP_PASS ?? '').trim()
const SMTP_FROM = String(process.env.SMTP_FROM ?? '').trim()
const ADMIN_EMAIL_DOMAINS = String(
  process.env.ACCESS_ADMIN_EMAIL_DOMAINS ?? 'uniodonto.coop.br,collos.com.br,contagbr.com.br',
)
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean)
const BQ_BASE_DEMONSTRACOES_TABLE =
  process.env.BQ_BASE_DEMONSTRACOES_TABLE ?? `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.demonstracoes_contabeis`
const BQ_CONSOLIDATED_DEMONSTRACOES_VIEW =
  process.env.BQ_CONSOLIDATED_DEMONSTRACOES_VIEW ??
  `${BQ_PROJECT_ID}.${BQ_AUX_DATASET}.vw_demonstracoes_contabeis_consolidada`
const BQ_OFFICIAL_INDICATOR_SNAPSHOT =
  process.env.BQ_OFFICIAL_INDICATOR_SNAPSHOT ?? `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.indicadores_curados_snapshot`
const BQ_CONSOLIDATED_INDICATOR_SNAPSHOT =
  process.env.BQ_CONSOLIDATED_INDICATOR_SNAPSHOT ??
  `${BQ_PROJECT_ID}.${BQ_AUX_DATASET}.indicadores_curados_snapshot_consolidado`
const BQ_CONSOLIDATED_MART_ANS_TABLE =
  process.env.BQ_CONSOLIDATED_MART_ANS_TABLE ?? `${BQ_PROJECT_ID}.${BQ_AUX_DATASET}.indicadores_mart_ans_consolidado`
const BQ_CONSOLIDATED_MART_UNIODONTO_TABLE =
  process.env.BQ_CONSOLIDATED_MART_UNIODONTO_TABLE ??
  `${BQ_PROJECT_ID}.${BQ_AUX_DATASET}.indicadores_mart_uniodonto_consolidado`
const SHOULD_REFRESH_CONSOLIDATED_VIEW = (process.env.BQ_REFRESH_CONSOLIDATED_VIEW ?? 'true')
  .toLowerCase()
  .trim() === 'true'
const SHOULD_REFRESH_CONSOLIDATED_INDICATORS = (process.env.BQ_REFRESH_CONSOLIDATED_INDICATORS ?? 'true')
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
const USER_ACCESS_TABLE_REF = parseTableRef(BQ_USER_ACCESS_TABLE, BQ_MART_DATASET)
const USER_PROFILE_TABLE_REF = parseTableRef(BQ_USER_PROFILE_TABLE, BQ_MART_DATASET)
const BASE_DEMONSTRACOES_TABLE_REF = parseTableRef(BQ_BASE_DEMONSTRACOES_TABLE, BQ_DATASET)
const CONSOLIDATED_DEMONSTRACOES_VIEW_REF = parseTableRef(BQ_CONSOLIDATED_DEMONSTRACOES_VIEW, BQ_AUX_DATASET)
const EXPORT_VIEW_REF = parseTableRef(BQ_EXPORT_VIEW, BQ_MART_DATASET)
const OFFICIAL_INDICATOR_SNAPSHOT_REF = parseTableRef(BQ_OFFICIAL_INDICATOR_SNAPSHOT, BQ_MART_DATASET)
const CONSOLIDATED_INDICATOR_SNAPSHOT_REF = parseTableRef(BQ_CONSOLIDATED_INDICATOR_SNAPSHOT, BQ_AUX_DATASET)
const CONSOLIDATED_MART_ANS_REF = parseTableRef(BQ_CONSOLIDATED_MART_ANS_TABLE, BQ_AUX_DATASET)
const CONSOLIDATED_MART_UNIODONTO_REF = parseTableRef(BQ_CONSOLIDATED_MART_UNIODONTO_TABLE, BQ_AUX_DATASET)

const bigquery = new BigQuery({
  projectId: BQ_PROJECT_ID,
})

const QUERY_CACHE_TTL_MS = Number(process.env.QUERY_CACHE_TTL_MS ?? 60_000)
const QUERY_CACHE_MAX_ENTRIES = Number(process.env.QUERY_CACHE_MAX_ENTRIES ?? 250)
const DEFAULT_DEMONSTRACOES_STATUS = 'FECHADO'
const DEFAULT_DEMONSTRACOES_TIPO_ENVIO = 'NORMAL'
const DEFAULT_DEMONSTRACOES_MODALIDADE = 'Cooperativa odontológica'

const queryCache = new Map()
const inFlightQueries = new Map()
const userAccessCache = new Map()
const operatorCatalogCache = {
  entries: [],
  expiresAt: 0,
}
const uhubOperatorCatalogCache = {
  entries: [],
  expiresAt: 0,
}

const RAW_ALLOWED_VIEWS = process.env.BQ_ALLOWED_VIEWS
const LEGACY_BQ_COMPAT_REWRITES = new Map([
  ['bigdata-467917.dash_ans_uploads.indicadores_curados_snapshot_consolidado', 'bigdata-467917.dash_ans.indicadores_curados_snapshot'],
  ['bigdata-467917.dash_ans_uploads.indicadores_mart_ans_consolidado', 'bigdata-467917.dash_ans.indicadores_mart_ans'],
  ['bigdata-467917.dash_ans_uploads.indicadores_mart_uniodonto_consolidado', 'bigdata-467917.dash_ans.indicadores_mart_uniodonto'],
  ['bigdata-467917.dash_ans_uploads.vw_demonstracoes_contabeis_consolidada', 'bigdata-467917.dash_ans.demonstracoes_contabeis'],
])
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
    add(CONSOLIDATED_INDICATOR_SNAPSHOT_REF.fqn)
    add(CONSOLIDATED_MART_ANS_REF.fqn)
    add(CONSOLIDATED_MART_UNIODONTO_REF.fqn)
  }
  return allowed
})()

function rewriteLegacyBigQueryRefs(sql) {
  let rewritten = sql
  for (const [from, to] of LEGACY_BQ_COMPAT_REWRITES.entries()) {
    rewritten = rewritten.replaceAll(`\`${from}\``, `\`${to}\``).replaceAll(from, to)
  }
  return rewritten
}

const SERVER_BOOT_ID = process.env.K_REVISION ?? crypto.randomBytes(8).toString('hex')

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT
const FIREBASE_SERVICE_ACCOUNT_PATH = String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '').trim()

function buildFirebaseAdminOptions() {
  const options = {}
  if (FIREBASE_PROJECT_ID) {
    options.projectId = FIREBASE_PROJECT_ID
  }

  if (!FIREBASE_SERVICE_ACCOUNT_PATH) {
    return options
  }

  try {
    const raw = fs.readFileSync(path.resolve(FIREBASE_SERVICE_ACCOUNT_PATH), 'utf8')
    const serviceAccount = JSON.parse(raw)
    options.credential = admin.credential.cert(serviceAccount)
    if (!options.projectId && serviceAccount?.project_id) {
      options.projectId = serviceAccount.project_id
    }
    console.log(`[server] Firebase Admin usando chave em ${FIREBASE_SERVICE_ACCOUNT_PATH}`)
    return options
  } catch (err) {
    console.error(
      `[server] Falha ao carregar FIREBASE_SERVICE_ACCOUNT_PATH (${FIREBASE_SERVICE_ACCOUNT_PATH}):`,
      err?.message ?? err,
    )
    throw err
  }
}

if (!admin.apps.length) {
  admin.initializeApp(buildFirebaseAdminOptions())
}

const firestore = admin.firestore()
let mailTransporter = null

function getMailTransporter() {
  if (!SMTP_HOST || !SMTP_FROM) return null
  if (mailTransporter) return mailTransporter
  mailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })
  return mailTransporter
}

const AUTH_PUBLIC_PATHS = new Set(['/api/health', '/api/auth/status', '/api/onboarding/operators'])
const AUTH_SKIP_ACCESS_CONTEXT_PATHS = new Set([
  '/api/auth/profile',
  '/api/auth/profile/complete',
  '/api/operators',
  '/api/onboarding/operators',
])
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
      claims: decoded,
    }
    if (AUTH_SKIP_ACCESS_CONTEXT_PATHS.has(req.path) || req.path.startsWith('/api/admin/accounts')) {
      req.accessContext = {
        enforced: ENFORCE_USER_ACCESS,
        isAdmin: isPrivilegedDomainEmail(req.user.email),
        operators: [],
        allowedRegAns: [],
        canUploadRegAns: [],
      }
    } else {
      req.accessContext = await resolveUserAccessContext(req.user)
    }
    return next()
  } catch (err) {
    if (err?.code === 'NO_OPERATOR_ACCESS') {
      return res.status(403).json({
        error: err.message,
        code: err.code,
      })
    }
    if (err?.message?.includes(USER_ACCESS_TABLE_REF.objectId) || err?.message?.includes('Dataset')) {
      console.error('[server] Falha ao resolver acesso por operadora', err?.message ?? err)
      return res.status(500).json({ error: 'Falha ao validar acesso do usuário.' })
    }
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

let userAccessTablePromise = null
let userAccessTableReady = false
let userProfileTablePromise = null
let userProfileTableReady = false

function normalizeRegAns(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\D+/g, '')
  return normalized ? normalized : null
}

function normalizeEmail(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized ? normalized : null
}

const KNOWN_EMAIL_OPERATOR_BINDINGS = new Map(
  Object.entries({
    'federacaobnu@uniodontosc.com.br': 'Uniodonto SC (Federação)',
    'contabilidadeuniodontoap@gmail.com': 'Uniodonto AP',
    'gerencia@uniodontojac.com.br': 'Uniodonto Jacareí',
    'claudio@uniodontolondrina.coop.br': 'Uniodonto Londrina',
    'jalves@uniodonto.coop.br': 'Uniodonto Brasil',
    'contabil@uniodontoap.com.br': 'Uniodonto AP',
    'uniodontopinda@gmail.com': 'Uniodonto Pindamonhangaba',
    'contabil@uniodontomt.com.br': 'Uniodonto MT',
    'contabil@uniodonto.mt.gov.br': 'Uniodonto MT',
    'draacilialourenco@uol.com.br': 'Uniodonto Pindamonhangaba',
    'diretoriaoperacional@uniodontosjc.coop.br': 'Uniodonto São José dos Campos',
    'ouvidoria@uniodontoathenas.coop.br': 'Uniodonto Athenas',
    'uniodontocacapava@gmail.com': 'Uniodonto Caçapava',
    'adm@uniodontomt.com.br': 'Uniodonto MT',
    'gerencia@uniodontocatanduva.com.br': 'Uniodonto Catanduva',
    'financeiro@uniodontosjc.coop.br': 'Uniodonto São José dos Campos',
    'juliomaciel@uniodonto.coop.br': 'Uniodonto Brasil',
    'uniodontoamer@uol.com.br': 'Uniodonto Americana',
    'ronaldonemesio@uniodontomaceio.com.br': 'Uniodonto Maceió',
    'gerencia@uniodontorn.com.br': 'Uniodonto RN',
    'eugeniocaraujo@hotmail.com': 'Uniodonto RN',
    'federacao@uniodontosc.com.br': 'Uniodonto SC (Federação)',
    'clovis@uniodonto.coop.br': 'Uniodonto Brasil',
    'diretoria@uniodontopiracicaba.com.br': 'Uniodonto Piracicaba',
    'fernandopaivaposso@gmail.com': 'Uniodonto Poços de Caldas',
    'contato@collos.com.br': 'Collos',
    'vitor@collos.com.br': 'Collos',
  }).map(([email, operatorName]) => [normalizeEmail(email), operatorName]),
)

function normalizeOperatorLookupKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function getEmailDomain(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !normalizedEmail.includes('@')) return null
  return normalizedEmail.split('@').pop() ?? null
}

function isPrivilegedDomainEmail(email) {
  const domain = getEmailDomain(email)
  if (!domain) return false
  return ADMIN_EMAIL_DOMAINS.includes(domain)
}

function getKnownOperatorNameByEmail(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  return KNOWN_EMAIL_OPERATOR_BINDINGS.get(normalizedEmail) ?? null
}

function normalizeDigits(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\D+/g, '')
  return normalized ? normalized : null
}

function computePorteFromBeneficiarios(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  if (numeric <= 19999) return 'Pequeno Porte'
  if (numeric <= 99999) return 'Médio Porte'
  return 'Grande Porte'
}

async function fetchOperatorRegistryMetadata(regAns) {
  const normalizedRegAns = normalizeRegAns(regAns)
  if (!normalizedRegAns) return null
  const [rows] = await bigquery.query({
    query: `
      SELECT
        REGEXP_REPLACE(CAST(REG_ANS AS STRING), r'\\D', '') AS reg_ans,
        REGEXP_REPLACE(CAST(CNPJ AS STRING), r'\\D', '') AS cnpj,
        NULLIF(TRIM(CAST(NOME_FANTASIA AS STRING)), '') AS nome_fantasia,
        NULLIF(TRIM(CAST(RAZAO_SOCIAL AS STRING)), '') AS razao_social,
        NULLIF(TRIM(CAST(MODALIDADE AS STRING)), '') AS modalidade
      FROM \`${BQ_OPERADORAS_TABLE}\`
      WHERE REGEXP_REPLACE(CAST(REG_ANS AS STRING), r'\\D', '') = @regAns
      LIMIT 1
    `,
    params: { regAns: normalizedRegAns },
    location: BQ_LOCATION,
  })
  const row = normalizeBigQueryRows(rows)[0]
  if (!row) return null
  return {
    regAns: normalizedRegAns,
    cnpj: normalizeDigits(row?.cnpj),
    operatorName: toNullableString(row?.nome_fantasia) || toNullableString(row?.razao_social) || null,
    modalidade: toNullableString(row?.modalidade) || null,
  }
}

async function listOperatorCatalog({ forceRefresh = false } = {}) {
  const now = Date.now()
  if (!forceRefresh && operatorCatalogCache.entries.length && operatorCatalogCache.expiresAt > now) {
    return operatorCatalogCache.entries
  }

  const [rows] = await bigquery.query({
    query: `
      SELECT
        REGEXP_REPLACE(CAST(REG_ANS AS STRING), r'\\D', '') AS reg_ans,
        NULLIF(TRIM(CAST(CNPJ AS STRING)), '') AS cnpj,
        COALESCE(
          NULLIF(TRIM(CAST(NOME_FANTASIA AS STRING)), ''),
          NULLIF(TRIM(CAST(RAZAO_SOCIAL AS STRING)), '')
        ) AS operator_name,
        NULLIF(TRIM(CAST(MODALIDADE AS STRING)), '') AS modalidade
      FROM \`${BQ_OPERADORAS_TABLE}\`
      WHERE COALESCE(
        NULLIF(TRIM(CAST(NOME_FANTASIA AS STRING)), ''),
        NULLIF(TRIM(CAST(RAZAO_SOCIAL AS STRING)), '')
      ) IS NOT NULL
    `,
    location: BQ_LOCATION,
  })

  const entries = normalizeBigQueryRows(rows)
    .map((row) => {
      const regAns = normalizeRegAns(row?.reg_ans)
      const operatorName = toNullableString(row?.operator_name)
      if (!regAns || !operatorName) return null
      return {
        regAns,
        cnpj: normalizeDigits(row?.cnpj),
        operatorName,
        modalidade: toNullableString(row?.modalidade),
        normalizedName: normalizeOperatorLookupKey(operatorName),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.operatorName.localeCompare(b.operatorName))

  operatorCatalogCache.entries = entries
  operatorCatalogCache.expiresAt = now + Math.max(USER_ACCESS_CACHE_TTL_MS, 60_000)
  return entries
}

function requireUhubConfig() {
  if (!UHUB_API_BASE_URL || !UHUB_API_TOKEN) {
    const error = new Error('Integração UHub não configurada.')
    error.code = 'UHUB_CONFIG_MISSING'
    throw error
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function uhubRequest(pathname, { method = 'GET', body = null } = {}) {
  requireUhubConfig()
  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UHUB_API_TIMEOUT_MS)
    try {
      const response = await fetch(`${UHUB_API_BASE_URL}${pathname}`, {
        method,
        headers: {
          Authorization: `Bearer ${UHUB_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (response.status === 429 && attempt === 0) {
        const retryAfter = Number(response.headers.get('retry-after'))
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500)
        continue
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const error = new Error(payload?.error ?? `UHub respondeu HTTP ${response.status}.`)
        error.status = response.status
        error.payload = payload
        throw error
      }
      return payload
    } catch (err) {
      clearTimeout(timeout)
      lastError = err
      if (attempt === 0) {
        await sleep(250)
        continue
      }
    }
  }
  throw lastError
}

async function uhubSearchPessoaContatos(q) {
  if (!q) return []
  const payload = await uhubRequest('/api/external/catalogo/pessoa_contatos/search', {
    method: 'POST',
    body: { q },
  })
  return Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : []
}

async function uhubPessoaByKey(pessoaId) {
  const payload = await uhubRequest('/api/external/catalogo/pessoas/by-key', {
    method: 'POST',
    body: { id: pessoaId },
  })
  return payload
}

function mapUhubCooperativa(row = {}) {
  const regAns = normalizeRegAns(row.reg_ans_operadora ?? row.codigo_ans ?? row.reg_ans ?? row.REG_ANS)
  const operatorName =
    toNullableString(row.uniodonto) ||
    toNullableString(row.razao_social) ||
    toNullableString(row.raz_social) ||
    toNullableString(row.nome) ||
    toNullableString(row.name)
  const tipo = String(row.tipo ?? row.papel_rede ?? '').trim().toUpperCase()
  if (!regAns || !operatorName) return null
  if (tipo && tipo !== 'SINGULAR') return null
  return {
    regAns,
    operatorName,
    cnpj: normalizeDigits(row.cnpj),
  }
}

async function listUhubOperatorCatalog({ forceRefresh = false } = {}) {
  const now = Date.now()
  if (!forceRefresh && uhubOperatorCatalogCache.entries.length && uhubOperatorCatalogCache.expiresAt > now) {
    return uhubOperatorCatalogCache.entries
  }
  const payload = await uhubRequest('/api/external/catalogo/cooperativas/search', {
    method: 'POST',
    body: { limit: 500 },
  })
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : []
  const entries = rows
    .map(mapUhubCooperativa)
    .filter(Boolean)
    .sort((a, b) => a.operatorName.localeCompare(b.operatorName))
  uhubOperatorCatalogCache.entries = entries
  uhubOperatorCatalogCache.expiresAt = now + Math.max(UHUB_OPERATOR_CACHE_TTL_MS, 60_000)
  return entries
}

async function resolveOperatorMetadata(regAns) {
  const normalizedRegAns = normalizeRegAns(regAns)
  if (!normalizedRegAns) return null
  try {
    const fromUhub = (await listUhubOperatorCatalog()).find((item) => item.regAns === normalizedRegAns)
    if (fromUhub) return fromUhub
  } catch (err) {
    console.warn('[server] Falha ao resolver operadora no UHub', err?.message ?? err)
  }
  return fetchOperatorRegistryMetadata(normalizedRegAns)
}

function getOnboardingDocRef(uid) {
  return firestore.collection(PFC_ONBOARDING_COLLECTION).doc(String(uid))
}

function serializeFirestoreTimestamp(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return value
}

function mapOnboardingDoc(snapshot) {
  if (!snapshot?.exists) return null
  const data = snapshot.data() ?? {}
  return {
    uid: snapshot.id,
    statusAprovacao: data.status_aprovacao ?? APPROVAL_STATUS.PENDING,
    approvalReason: data.approval_reason ?? null,
    uhubPessoaId: data.uhub_pessoa_id ?? null,
    uhubVerificadoEm: serializeFirestoreTimestamp(data.uhub_verificado_em),
    uhubMatchPor: data.uhub_match_por ?? null,
    uhubTokenPrefix: data.uhub_token_prefix ?? null,
    uhubRevalidadoEm: serializeFirestoreTimestamp(data.uhub_revalidado_em),
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    phone: data.phone ?? null,
    phoneNormalized: data.phone_normalized ?? null,
    phoneIsWhatsapp: data.phone_is_whatsapp === true,
    email: data.user_email ?? null,
    jobTitle: data.job_title ?? null,
    roleFunction: data.role_function ?? null,
    department: data.department ?? null,
    regAns: data.reg_ans ?? null,
    operatorName: data.operator_name ?? null,
    createdAt: serializeFirestoreTimestamp(data.created_at),
    updatedAt: serializeFirestoreTimestamp(data.updated_at),
  }
}

async function fetchOnboardingLink(uid) {
  if (!uid) return null
  const snapshot = await getOnboardingDocRef(uid).get()
  return mapOnboardingDoc(snapshot)
}

function canAccessFromApprovalStatus(status) {
  return [APPROVAL_STATUS.AUTO_APPROVED, APPROVAL_STATUS.MANUAL_APPROVED].includes(status)
}

async function auditOnboardingAttempt({ uid, email, phone, result, requestId }) {
  try {
    await firestore.collection(PFC_ONBOARDING_LOG_COLLECTION).add({
      uid: uid ?? null,
      request_id: requestId,
      email_hash: safeHash(email),
      phone_last4: last4(phone),
      status_aprovacao: result?.status ?? null,
      approval_reason: result?.reason ?? null,
      uhub_pessoa_id: result?.uhubPessoaId ?? null,
      uhub_match_por: result?.matchBy ?? null,
      uhub_token_prefix: UHUB_API_TOKEN_PREFIX ?? null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (err) {
    console.warn('[server] Falha ao persistir auditoria de onboarding', err?.message ?? err)
  }
}

async function sendOnboardingEmails({ profile, status, reason }) {
  const transporter = getMailTransporter()
  if (!transporter) return
  const userEmail = normalizeEmail(profile?.email)
  const operatorName = profile?.operatorName ?? profile?.regAns ?? 'Não informado'
  const statusLabel = status === APPROVAL_STATUS.AUTO_APPROVED ? 'auto-aprovada' : 'pendente de aprovação'
  const text = [
    `Cadastro PFC ${statusLabel}.`,
    `Nome: ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
    `Email: ${userEmail ?? ''}`,
    `Uniodonto: ${operatorName}`,
    `Motivo: ${reason ?? 'match_seguro'}`,
  ].join('\n')
  const messages = []
  if (userEmail) {
    messages.push({
      from: SMTP_FROM,
      to: userEmail,
      subject:
        status === APPROVAL_STATUS.AUTO_APPROVED
          ? 'Cadastro PFC liberado'
          : 'Cadastro PFC recebido para ativação',
      text:
        status === APPROVAL_STATUS.AUTO_APPROVED
          ? 'Seu cadastro foi validado no UHub e o acesso ao PFC foi liberado.'
          : 'Seu cadastro foi recebido e passará por ativação pela Uniodonto do Brasil.',
    })
  }
  messages.push({
    from: SMTP_FROM,
    to: PFC_MARKETING_EMAIL,
    subject: `Cadastro PFC ${statusLabel}`,
    text,
  })
  await Promise.all(messages.map((message) => transporter.sendMail(message)))
}

async function verifyUhubOnboarding({ email, phone }) {
  const normalizedEmail = normalizeEmailForUhub(email)
  const normalizedPhone = normalizePhoneForUhub(phone)
  if (!normalizedEmail && !normalizedPhone) {
    return { status: APPROVAL_STATUS.PENDING, reason: 'entrada_invalida' }
  }

  try {
    const [emailResults, phoneResults] = await Promise.all([
      normalizedEmail ? uhubSearchPessoaContatos(normalizedEmail) : Promise.resolve([]),
      normalizedPhone ? uhubSearchPessoaContatos(normalizedPhone) : Promise.resolve([]),
    ])
    const decision = decideUhubMatch({ emailResults, phoneResults })
    if (!decision.approved) {
      return { status: APPROVAL_STATUS.PENDING, reason: decision.reason }
    }
    const person = await uhubPessoaByKey(decision.pessoaId)
    if (!person || isInactiveUhubPerson(person)) {
      return { status: APPROVAL_STATUS.PENDING, reason: 'pessoa_inativa' }
    }
    return {
      status: APPROVAL_STATUS.AUTO_APPROVED,
      reason: 'match_seguro',
      uhubPessoaId: decision.pessoaId,
      matchBy: decision.matchBy,
    }
  } catch (err) {
    console.warn('[server] Verificação UHub caiu para fila manual', err?.message ?? err)
    return { status: APPROVAL_STATUS.PENDING, reason: 'uhub_indisponivel' }
  }
}

async function saveOnboardingLink(user = {}, profile = {}, verification = {}) {
  const uid = String(user.uid ?? '').trim()
  if (!uid) throw new Error('UID Firebase ausente.')
  const now = admin.firestore.FieldValue.serverTimestamp()
  const status = verification.status ?? APPROVAL_STATUS.PENDING
  const payload = {
    user_uid: uid,
    user_email: normalizeEmail(profile.email ?? user.email),
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone: profile.phone,
    phone_normalized: normalizePhoneForUhub(profile.phone),
    phone_is_whatsapp: profile.phoneIsWhatsapp === true,
    job_title: profile.jobTitle,
    role_function: profile.roleFunction,
    department: profile.roleFunction,
    reg_ans: normalizeRegAns(profile.regAns),
    operator_name: profile.operatorName ?? null,
    status_aprovacao: status,
    approval_reason: verification.reason ?? null,
    uhub_pessoa_id: verification.uhubPessoaId ?? null,
    uhub_match_por: verification.matchBy ?? null,
    uhub_token_prefix: verification.uhubPessoaId ? UHUB_API_TOKEN_PREFIX : null,
    updated_at: now,
  }
  if (verification.uhubPessoaId) {
    payload.uhub_verificado_em = now
  }
  await getOnboardingDocRef(uid).set(
    {
      ...payload,
      created_at: now,
    },
    { merge: true },
  )
  return fetchOnboardingLink(uid)
}

async function resolveOperatorByName(operatorName) {
  const normalized = normalizeOperatorLookupKey(operatorName)
  if (!normalized) return null
  const entries = await listOperatorCatalog()
  const exact = entries.find((item) => item.normalizedName === normalized)
  if (exact) return exact
  const contains = entries.find(
    (item) => item.normalizedName.includes(normalized) || normalized.includes(item.normalizedName),
  )
  return contains ?? null
}

async function fetchAccountDescriptionMap(accountCodes = []) {
  const codes = Array.from(
    new Set(
      accountCodes
        .map((value) => toNullableString(value))
        .filter(Boolean),
    ),
  )
  if (!codes.length) return new Map()

  const [rows] = await bigquery.query({
    query: `
      WITH ranked AS (
        SELECT
          CAST(cd_conta_contabil AS STRING) AS cd_conta_contabil,
          NULLIF(TRIM(CAST(descricao AS STRING)), '') AS descricao,
          COUNT(*) AS freq
        FROM \`${BASE_DEMONSTRACOES_TABLE_REF.fqn}\`
        WHERE CAST(cd_conta_contabil AS STRING) IN UNNEST(@codes)
          AND NULLIF(TRIM(CAST(descricao AS STRING)), '') IS NOT NULL
        GROUP BY 1, 2
      )
      SELECT cd_conta_contabil, descricao
      FROM (
        SELECT
          cd_conta_contabil,
          descricao,
          ROW_NUMBER() OVER (PARTITION BY cd_conta_contabil ORDER BY freq DESC, descricao) AS rn
        FROM ranked
      )
      WHERE rn = 1
    `,
    params: { codes },
    location: BQ_LOCATION,
  })

  return normalizeBigQueryRows(rows).reduce((map, row) => {
    const conta = toNullableString(row?.cd_conta_contabil)
    const descricao = toNullableString(row?.descricao)
    if (conta && descricao) {
      map.set(conta, descricao)
    }
    return map
  }, new Map())
}

function _escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getUserAccessCacheKey(user = {}) {
  const uid = String(user.uid ?? '').trim()
  const email = normalizeEmail(user.email)
  return `${uid}|${email ?? ''}`
}

function getCachedUserAccess(cacheKey) {
  if (!cacheKey) return null
  const cached = userAccessCache.get(cacheKey)
  if (!cached) return null
  if (!Number.isFinite(USER_ACCESS_CACHE_TTL_MS) || USER_ACCESS_CACHE_TTL_MS <= 0) {
    userAccessCache.delete(cacheKey)
    return null
  }
  if (cached.expiresAt <= Date.now()) {
    userAccessCache.delete(cacheKey)
    return null
  }
  return cached.value
}

function setCachedUserAccess(cacheKey, value) {
  if (!cacheKey) return
  if (!Number.isFinite(USER_ACCESS_CACHE_TTL_MS) || USER_ACCESS_CACHE_TTL_MS <= 0) return
  userAccessCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + USER_ACCESS_CACHE_TTL_MS,
  })
}

function parseClaimedRegAnsList(claims = {}) {
  const claimed = claims?.allowedRegAns ?? claims?.allowed_reg_ans ?? claims?.regAns ?? claims?.reg_ans ?? null
  if (Array.isArray(claimed)) {
    return claimed.map((item) => normalizeRegAns(item)).filter(Boolean)
  }
  if (typeof claimed === 'string') {
    return claimed
      .split(',')
      .map((item) => normalizeRegAns(item))
      .filter(Boolean)
  }
  return []
}

function createAccessContextFromRows(rows = [], user = {}) {
  const operatorMap = new Map()
  let isAdmin = Boolean(user?.claims?.admin === true || user?.claims?.isAdmin === true || user?.isDomainAdmin === true)
  const claimedRegAns = parseClaimedRegAnsList(user?.claims)
  claimedRegAns.forEach((regAns) => {
    operatorMap.set(regAns, {
      regAns,
      operatorName: null,
      canUpload: true,
    })
  })

  rows.forEach((row) => {
    const role = String(row?.role ?? '')
      .trim()
      .toLowerCase()
    const regAns = normalizeRegAns(row?.reg_ans)
    const operatorName = String(row?.operator_name ?? '').trim() || null
    const canUpload = row?.can_upload === false ? false : true
    if (role === 'admin' || regAns === '*') {
      isAdmin = true
      return
    }
    if (!regAns) return
    const current = operatorMap.get(regAns)
    if (!current) {
      operatorMap.set(regAns, {
        regAns,
        operatorName,
        canUpload,
      })
      return
    }
    operatorMap.set(regAns, {
      regAns,
      operatorName: current.operatorName ?? operatorName,
      canUpload: current.canUpload || canUpload,
    })
  })

  const operators = [...operatorMap.values()].sort((a, b) => {
    const aLabel = a.operatorName ?? a.regAns
    const bLabel = b.operatorName ?? b.regAns
    return aLabel.localeCompare(bLabel)
  })
  const allowedRegAns = operators.map((item) => item.regAns)
  const canUploadRegAns = operators.filter((item) => item.canUpload).map((item) => item.regAns)
  return {
    enforced: ENFORCE_USER_ACCESS,
    isAdmin,
    operators,
    allowedRegAns,
    canUploadRegAns,
  }
}

async function ensureUserAccessTable() {
  if (userAccessTableReady) {
    return bigquery.dataset(USER_ACCESS_TABLE_REF.datasetId).table(USER_ACCESS_TABLE_REF.objectId)
  }
  if (userAccessTablePromise) {
    return userAccessTablePromise
  }
  userAccessTablePromise = (async () => {
    const dataset = bigquery.dataset(USER_ACCESS_TABLE_REF.datasetId)
    const [datasetExists] = await dataset.exists()
    if (!datasetExists) {
      throw new Error(`Dataset ${USER_ACCESS_TABLE_REF.projectId}.${USER_ACCESS_TABLE_REF.datasetId} não existe.`)
    }
    const table = dataset.table(USER_ACCESS_TABLE_REF.objectId)
    const [tableExists] = await table.exists()
    if (!tableExists) {
      await table.create({
        schema: [
          { name: 'user_uid', type: 'STRING' },
          { name: 'user_email', type: 'STRING' },
          { name: 'reg_ans', type: 'STRING' },
          { name: 'operator_name', type: 'STRING' },
          { name: 'can_upload', type: 'BOOL' },
          { name: 'role', type: 'STRING' },
          { name: 'active', type: 'BOOL' },
          { name: 'created_at', type: 'TIMESTAMP' },
          { name: 'updated_at', type: 'TIMESTAMP' },
        ],
        location: BQ_LOCATION,
        clustering: {
          fields: ['user_uid', 'user_email', 'reg_ans'],
        },
      })
    }
    userAccessTableReady = true
    return table
  })()
    .catch((err) => {
      userAccessTableReady = false
      throw err
    })
    .finally(() => {
      userAccessTablePromise = null
    })
  return userAccessTablePromise
}

async function ensureUserProfileTable() {
  if (userProfileTableReady) {
    return bigquery.dataset(USER_PROFILE_TABLE_REF.datasetId).table(USER_PROFILE_TABLE_REF.objectId)
  }
  if (userProfileTablePromise) {
    return userProfileTablePromise
  }
  userProfileTablePromise = (async () => {
    const dataset = bigquery.dataset(USER_PROFILE_TABLE_REF.datasetId)
    const [datasetExists] = await dataset.exists()
    if (!datasetExists) {
      throw new Error(`Dataset ${USER_PROFILE_TABLE_REF.projectId}.${USER_PROFILE_TABLE_REF.datasetId} não existe.`)
    }
    const table = dataset.table(USER_PROFILE_TABLE_REF.objectId)
    const [tableExists] = await table.exists()
    if (!tableExists) {
      await table.create({
        schema: [
          { name: 'user_uid', type: 'STRING' },
          { name: 'user_email', type: 'STRING' },
          { name: 'first_name', type: 'STRING' },
          { name: 'last_name', type: 'STRING' },
          { name: 'phone', type: 'STRING' },
          { name: 'job_title', type: 'STRING' },
          { name: 'department', type: 'STRING' },
          { name: 'reg_ans', type: 'STRING' },
          { name: 'operator_name', type: 'STRING' },
          { name: 'is_completed', type: 'BOOL' },
          { name: 'created_at', type: 'TIMESTAMP' },
          { name: 'updated_at', type: 'TIMESTAMP' },
        ],
        location: BQ_LOCATION,
        clustering: {
          fields: ['user_uid', 'user_email'],
        },
      })
    }
    userProfileTableReady = true
    return table
  })()
    .catch((err) => {
      userProfileTableReady = false
      throw err
    })
    .finally(() => {
      userProfileTablePromise = null
    })
  return userProfileTablePromise
}

async function fetchUserProfile(user = {}) {
  const uid = String(user.uid ?? '').trim() || null
  const email = normalizeEmail(user.email)
  if (!uid && !email) return null
  await ensureUserProfileTable()
  const [rows] = await bigquery.query({
    query: `
      SELECT
        NULLIF(TRIM(CAST(first_name AS STRING)), '') AS first_name,
        NULLIF(TRIM(CAST(last_name AS STRING)), '') AS last_name,
        NULLIF(TRIM(CAST(phone AS STRING)), '') AS phone,
        NULLIF(TRIM(CAST(job_title AS STRING)), '') AS job_title,
        NULLIF(TRIM(CAST(department AS STRING)), '') AS department,
        NULLIF(TRIM(CAST(operator_name AS STRING)), '') AS operator_name,
        REGEXP_REPLACE(CAST(reg_ans AS STRING), r'\\D', '') AS reg_ans,
        LOWER(NULLIF(TRIM(CAST(user_email AS STRING)), '')) AS user_email,
        COALESCE(is_completed, FALSE) AS is_completed
      FROM \`${USER_PROFILE_TABLE_REF.fqn}\`
      WHERE (
        (@uid IS NOT NULL AND CAST(user_uid AS STRING) = @uid)
        OR (@email IS NOT NULL AND LOWER(TRIM(CAST(user_email AS STRING))) = @email)
      )
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `,
    params: { uid, email },
    location: BQ_LOCATION,
  })
  const row = normalizeBigQueryRows(rows)[0]
  if (!row) return null
  return {
    firstName: toNullableString(row?.first_name),
    lastName: toNullableString(row?.last_name),
    phone: toNullableString(row?.phone),
    jobTitle: toNullableString(row?.job_title),
    department: toNullableString(row?.department),
    operatorName: toNullableString(row?.operator_name),
    regAns: normalizeRegAns(row?.reg_ans),
    email: normalizeEmail(row?.user_email),
    isCompleted: row?.is_completed === true,
  }
}

async function upsertUserProfile(user = {}, payload = {}) {
  const uid = String(user.uid ?? '').trim() || null
  const userEmail = normalizeEmail(user.email)
  const email = normalizeEmail(payload.email) ?? userEmail
  const regAns = normalizeRegAns(payload.regAns)
  const operatorName = toNullableString(payload.operatorName)
  await ensureUserProfileTable()
  await bigquery.query({
    query: `
      MERGE \`${USER_PROFILE_TABLE_REF.fqn}\` target
      USING (
        SELECT
          @uid AS user_uid,
          @email AS user_email
      ) source
      ON (
        (
          source.user_uid IS NOT NULL
          AND CAST(target.user_uid AS STRING) = source.user_uid
        )
        OR (
          source.user_email IS NOT NULL
          AND LOWER(TRIM(CAST(target.user_email AS STRING))) = source.user_email
        )
      )
      WHEN MATCHED THEN
        UPDATE SET
          first_name = @first_name,
          last_name = @last_name,
          phone = @phone,
          job_title = @job_title,
          department = @department,
          reg_ans = @reg_ans,
          operator_name = @operator_name,
          is_completed = TRUE,
          updated_at = CURRENT_TIMESTAMP(),
          user_uid = COALESCE(target.user_uid, source.user_uid),
          user_email = COALESCE(target.user_email, source.user_email)
      WHEN NOT MATCHED THEN
        INSERT (
          user_uid,
          user_email,
          first_name,
          last_name,
          phone,
          job_title,
          department,
          reg_ans,
          operator_name,
          is_completed,
          created_at,
          updated_at
        )
        VALUES (
          source.user_uid,
          source.user_email,
          @first_name,
          @last_name,
          @phone,
          @job_title,
          @department,
          @reg_ans,
          @operator_name,
          TRUE,
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
    `,
    params: {
      uid,
      email,
      first_name: toNullableString(payload.firstName),
      last_name: toNullableString(payload.lastName),
      phone: toNullableString(payload.phone),
      job_title: toNullableString(payload.jobTitle),
      department: toNullableString(payload.department),
      reg_ans: regAns,
      operator_name: operatorName,
    },
    location: BQ_LOCATION,
  })
}

async function upsertApprovedUserAccess(user = {}, payload = {}) {
  const uid = String(user.uid ?? '').trim() || null
  const email = normalizeEmail(payload.email ?? user.email)
  const regAns = normalizeRegAns(payload.regAns)
  if (!regAns || (!uid && !email)) return
  await ensureUserAccessTable()
  await bigquery.query({
    query: `
      MERGE \`${USER_ACCESS_TABLE_REF.fqn}\` target
      USING (
        SELECT
          @uid AS user_uid,
          @email AS user_email,
          @reg_ans AS reg_ans
      ) source
      ON (
        REGEXP_REPLACE(CAST(target.reg_ans AS STRING), r'\\D', '') = source.reg_ans
        AND (
          (source.user_uid IS NOT NULL AND CAST(target.user_uid AS STRING) = source.user_uid)
          OR (source.user_email IS NOT NULL AND LOWER(TRIM(CAST(target.user_email AS STRING))) = source.user_email)
        )
      )
      WHEN MATCHED THEN
        UPDATE SET
          operator_name = @operator_name,
          can_upload = TRUE,
          role = 'user',
          active = TRUE,
          updated_at = CURRENT_TIMESTAMP(),
          user_uid = COALESCE(target.user_uid, source.user_uid),
          user_email = COALESCE(target.user_email, source.user_email)
      WHEN NOT MATCHED THEN
        INSERT (
          user_uid,
          user_email,
          reg_ans,
          operator_name,
          can_upload,
          role,
          active,
          created_at,
          updated_at
        )
        VALUES (
          source.user_uid,
          source.user_email,
          source.reg_ans,
          @operator_name,
          TRUE,
          'user',
          TRUE,
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
    `,
    params: {
      uid,
      email,
      reg_ans: regAns,
      operator_name: toNullableString(payload.operatorName),
    },
    location: BQ_LOCATION,
  })
}

function createOnboardingLinkFallback(user = {}, profile = {}, verification = {}) {
  return {
    uid: String(user.uid ?? '').trim() || null,
    statusAprovacao: verification.status ?? APPROVAL_STATUS.PENDING,
    approvalReason: verification.reason ?? null,
    uhubPessoaId: verification.uhubPessoaId ?? null,
    uhubVerificadoEm: verification.uhubPessoaId ? new Date().toISOString() : null,
    uhubMatchPor: verification.matchBy ?? null,
    uhubTokenPrefix: verification.uhubPessoaId ? UHUB_API_TOKEN_PREFIX : null,
    firstName: profile.firstName ?? null,
    lastName: profile.lastName ?? null,
    phone: profile.phone ?? null,
    phoneNormalized: normalizePhoneForUhub(profile.phone),
    phoneIsWhatsapp: profile.phoneIsWhatsapp === true,
    email: normalizeEmail(profile.email ?? user.email),
    jobTitle: profile.jobTitle ?? null,
    roleFunction: profile.roleFunction ?? null,
    department: profile.department ?? profile.roleFunction ?? null,
    regAns: normalizeRegAns(profile.regAns),
    operatorName: profile.operatorName ?? null,
    createdAt: null,
    updatedAt: new Date().toISOString(),
  }
}

async function buildAuthProfilePayload(reqUser = {}, accessContext = {}) {
  let registrationProfile = null
  let onboardingLink = null
  try {
    onboardingLink = await fetchOnboardingLink(reqUser?.uid)
  } catch (err) {
    console.warn('[server] Falha ao carregar status de aprovação do usuário', err?.message ?? err)
  }
  if (!onboardingLink && (accessContext?.canUploadRegAns ?? []).length > 0) {
    try {
      registrationProfile = await fetchUserProfile(reqUser)
    } catch (err) {
      console.warn('[server] Falha ao carregar perfil complementar do usuário', err?.message ?? err)
    }
  }
  let operators = accessContext?.operators ?? []
  if (accessContext?.isAdmin) {
    try {
      const allOperators = (await listUhubOperatorCatalog()).map((item) => ({
        regAns: item.regAns,
        operatorName: item.operatorName,
        canUpload: true,
      }))
      operators = allOperators
    } catch (err) {
      console.warn('[server] Falha ao carregar catálogo de operadoras para perfil admin', err?.message ?? err)
    }
  }
  const allowedRegAns = accessContext?.isAdmin
    ? operators.map((item) => item.regAns)
    : accessContext?.allowedRegAns ?? []
  const canUploadRegAns = accessContext?.isAdmin
    ? operators.map((item) => item.regAns)
    : accessContext?.canUploadRegAns ?? []
  return {
    uid: reqUser?.uid ?? null,
    email: reqUser?.email ?? null,
    enforced: accessContext?.enforced === true,
    isAdmin: accessContext?.isAdmin === true,
    operators,
    allowedRegAns,
    canUploadRegAns,
    noAccess: false,
    approvalStatus: onboardingLink?.statusAprovacao ?? null,
    approvalReason: onboardingLink?.approvalReason ?? null,
    canAccess: onboardingLink
      ? canAccessFromApprovalStatus(onboardingLink.statusAprovacao)
      : accessContext?.isAdmin === true || (accessContext?.canUploadRegAns ?? []).length > 0,
    uhubLink: onboardingLink
      ? {
          uhubPessoaId: onboardingLink.uhubPessoaId,
          uhubVerificadoEm: onboardingLink.uhubVerificadoEm,
          uhubMatchPor: onboardingLink.uhubMatchPor,
          uhubRevalidadoEm: onboardingLink.uhubRevalidadoEm,
        }
      : null,
    requiresProfileCompletion: accessContext?.isAdmin || (!onboardingLink && (accessContext?.canUploadRegAns ?? []).length > 0)
      ? false
      : !onboardingLink || !onboardingLink.statusAprovacao || onboardingLink.statusAprovacao === APPROVAL_STATUS.REJECTED,
    registrationProfile: onboardingLink
      ? {
          firstName: onboardingLink.firstName ?? null,
          lastName: onboardingLink.lastName ?? null,
          phone: onboardingLink.phone ?? null,
          phoneIsWhatsapp: onboardingLink.phoneIsWhatsapp === true,
          email: onboardingLink.email ?? null,
          jobTitle: onboardingLink.jobTitle ?? null,
          roleFunction: onboardingLink.roleFunction ?? null,
          department: onboardingLink.department ?? null,
          regAns: onboardingLink.regAns ?? null,
          operatorName: onboardingLink.operatorName ?? null,
          isCompleted: true,
        }
      : registrationProfile
        ? {
            firstName: registrationProfile.firstName ?? null,
            lastName: registrationProfile.lastName ?? null,
            phone: registrationProfile.phone ?? null,
            phoneIsWhatsapp: false,
            email: registrationProfile.email ?? null,
            jobTitle: registrationProfile.jobTitle ?? null,
            roleFunction: registrationProfile.department ?? null,
            department: registrationProfile.department ?? null,
            regAns: registrationProfile.regAns ?? null,
            operatorName: registrationProfile.operatorName ?? null,
          isCompleted: registrationProfile.isCompleted === true,
        }
      : null,
  }
}

async function resolveUserAccessContext(user = {}) {
  if (!ENFORCE_USER_ACCESS) {
    return {
      enforced: false,
      isAdmin: true,
      operators: [],
      allowedRegAns: [],
      canUploadRegAns: [],
    }
  }
  const cacheKey = getUserAccessCacheKey(user)
  const cached = getCachedUserAccess(cacheKey)
  if (cached) {
    return cached
  }

  const uid = String(user.uid ?? '').trim() || null
  const email = normalizeEmail(user.email)
  const isDomainAdmin = isPrivilegedDomainEmail(email)
  if (isDomainAdmin) {
    const context = createAccessContextFromRows([], { ...user, isDomainAdmin })
    setCachedUserAccess(cacheKey, context)
    return context
  }
  const onboardingLink = await fetchOnboardingLink(uid).catch(() => null)
  if (onboardingLink && canAccessFromApprovalStatus(onboardingLink.statusAprovacao) && onboardingLink.regAns) {
    const context = createAccessContextFromRows(
      [
        {
          reg_ans: onboardingLink.regAns,
          operator_name: onboardingLink.operatorName,
          can_upload: true,
          role: 'user',
        },
      ],
      { ...user, isDomainAdmin: false },
    )
    setCachedUserAccess(cacheKey, context)
    return context
  }

  await ensureUserAccessTable()
  const query = `
    SELECT
      REGEXP_REPLACE(CAST(reg_ans AS STRING), r'\\D', '') AS reg_ans,
      NULLIF(TRIM(CAST(operator_name AS STRING)), '') AS operator_name,
      COALESCE(can_upload, TRUE) AS can_upload,
      LOWER(NULLIF(TRIM(CAST(role AS STRING)), '')) AS role
    FROM \`${USER_ACCESS_TABLE_REF.fqn}\`
    WHERE COALESCE(active, TRUE) IS TRUE
      AND (
        (@uid IS NOT NULL AND CAST(user_uid AS STRING) = @uid)
        OR (@email IS NOT NULL AND LOWER(TRIM(CAST(user_email AS STRING))) = @email)
      )
  `
  const [rows] = await bigquery.query({
    query,
    params: {
      uid,
      email,
    },
    location: BQ_LOCATION,
  })
  const normalizedRows = normalizeBigQueryRows(rows)
  const inferredRows = []
  if (!isDomainAdmin && !normalizedRows.length && email) {
    const knownOperatorName = getKnownOperatorNameByEmail(email)
    if (knownOperatorName) {
      const resolvedOperator = await resolveOperatorByName(knownOperatorName)
      if (resolvedOperator?.regAns) {
        inferredRows.push({
          reg_ans: resolvedOperator.regAns,
          operator_name: resolvedOperator.operatorName,
          can_upload: true,
          role: 'user',
        })
      }
    }
  }

  const context = createAccessContextFromRows([...normalizedRows, ...inferredRows], {
    ...user,
    isDomainAdmin,
  })
  setCachedUserAccess(cacheKey, context)
  return context
}

function applyUserAccessScopeToSql(sql) {
  // Leitura do dashboard e exportacao ficam liberadas para qualquer usuario autenticado.
  // O vinculo por operadora segue valendo apenas para upload/importacao.
  return sql
}

function hasOperatorUploadAccess(accessContext = {}, regAns) {
  if (!accessContext?.enforced || accessContext?.isAdmin) return true
  const normalizedRegAns = normalizeRegAns(regAns)
  if (!normalizedRegAns) return false
  return (accessContext.canUploadRegAns ?? []).includes(normalizedRegAns)
}

const DEMONSTRACOES_MAX_UPLOAD_ROWS = Number(process.env.DEMONSTRACOES_MAX_UPLOAD_ROWS ?? 10_000)
const DEMONSTRACOES_REQUIRED_FIELDS = ['cd_conta_contabil', 'vl_saldo_final']
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

function chunkList(values = [], size = 500) {
  const chunks = []
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size))
  }
  return chunks
}

function quoteTableRef(ref) {
  return `\`${ref.fqn}\``
}

async function ensureDataset(datasetId) {
  const dataset = bigquery.dataset(datasetId)
  const [datasetExists] = await dataset.exists()
  if (!datasetExists) {
    await dataset.create({ location: BQ_LOCATION })
  }
  return dataset
}

function formatMaterializeTableRef(name, datasetId = BQ_DATASET) {
  const normalized = String(name ?? '').trim().replace(/^`|`$/g, '')
  if (!normalized) return normalized
  if (normalized.includes('.')) return `\`${normalized}\``
  return `\`${BQ_PROJECT_ID}.${datasetId}.${normalized}\``
}

function buildConsolidatedIndicatorSnapshotQuery() {
  const auxLatest = quoteTableRef(AUX_DEMONSTRACOES_LATEST_VIEW_REF)
  const officialSnapshot = quoteTableRef(OFFICIAL_INDICATOR_SNAPSHOT_REF)
  const obm = formatMaterializeTableRef(BQ_BENEFICIARIOS_ODONTO_TABLE, BQ_MART_DATASET)
  const operadoras = `\`${BQ_PROJECT_ID}.${BQ_DATASET}.operadoras\``
  const uniodontosAtivas = `\`${BQ_PROJECT_ID}.${BQ_DATASET}.uniodontos_ativas\``
  const target = quoteTableRef(CONSOLIDATED_INDICATOR_SNAPSHOT_REF)

  return `
    CREATE OR REPLACE TABLE ${target}
    PARTITION BY periodo_raw
    CLUSTER BY periodo_id, reg_ans, modalidade, uniodonto
    AS
    WITH obm_period AS (
      SELECT
        reg_ans,
        Operadora,
        Periodo,
        Beneficiarios,
        Uniodonto,
        ATIVA,
        modalidade,
        porte
      FROM ${obm}
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY reg_ans, Periodo
        ORDER BY Periodo DESC
      ) = 1
    ), obm_latest AS (
      SELECT
        reg_ans,
        Operadora,
        Periodo,
        Beneficiarios,
        Uniodonto,
        ATIVA,
        modalidade,
        porte
      FROM ${obm}
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY reg_ans
        ORDER BY Periodo DESC
      ) = 1
    ), operadoras_dim AS (
      SELECT
        REG_ANS AS reg_ans,
        COALESCE(NULLIF(NOME_FANTASIA, ''), NULLIF(RAZAO_SOCIAL, '')) AS operadora,
        MODALIDADE AS modalidade,
        CASE
          WHEN DATA_DESCREDENCIAMENTO IS NULL THEN 'SIM'
          ELSE 'NÃO'
        END AS ativa
      FROM ${operadoras}
    ), uniodonto_dim AS (
      SELECT
        reg_ans,
        'SIM' AS uniodonto
      FROM ${uniodontosAtivas}
    ), official_base AS (
      SELECT
        reg_ans,
        nome_operadora,
        modalidade,
        uniodonto,
        ativa,
        qt_beneficiarios,
        porte,
        ano,
        trimestre,
        periodo_raw AS periodo_data,
        vr_receitas,
        vr_despesas,
        vr_contraprestacoes,
        vr_contraprestacoes_efetivas,
        vr_contraprestacoes_pre,
        vr_corresponsabilidade_cedida,
        vr_creditos_operacoes_saude,
        vr_eventos_liquidos,
        vr_eventos_a_liquidar,
        vr_desp_comerciais,
        vr_desp_comerciais_promocoes,
        vr_conta_464,
        vr_desp_administrativas,
        vr_outras_desp_oper,
        vr_conta_442129119,
        vr_desp_tributos,
        vr_receitas_fin,
        vr_receitas_patrimoniais,
        vr_despesas_fin,
        vr_outras_receitas_operacionais,
        vr_conta_332129111,
        vr_conta_332189111,
        vr_ativo_circulante,
        vr_conta_1213,
        vr_conta_1214,
        vr_conta_122,
        vr_ativo_permanente,
        vr_passivo_circulante,
        vr_passivo_nao_circulante,
        vr_patrimonio_liquido,
        vr_ativos_garantidores,
        vr_provisoes_tecnicas,
        vr_conta_32,
        vr_conta_216,
        vr_conta_217,
        vr_conta_236,
        vr_conta_237,
        vr_pl_ajustado,
        vr_margem_solvencia_exigida,
        vr_conta_61,
        qt_prestadores
      FROM ${officialSnapshot}
    ), external_base AS (
      SELECT
        SAFE_CAST(src.reg_ans AS INT64) AS reg_ans,
        MIN(
          IF(
            COALESCE(obm_p.Operadora, obm_l.Operadora, op.operadora) IS NOT NULL
            AND COALESCE(obm_p.Operadora, obm_l.Operadora, op.operadora) <> '',
            COALESCE(obm_p.Operadora, obm_l.Operadora, op.operadora),
            NULL
          )
        ) AS nome_operadora,
        MIN(
          IF(
            COALESCE(src.modalidade, obm_p.modalidade, obm_l.modalidade, op.modalidade) IS NOT NULL
            AND COALESCE(src.modalidade, obm_p.modalidade, obm_l.modalidade, op.modalidade) <> '',
            COALESCE(src.modalidade, obm_p.modalidade, obm_l.modalidade, op.modalidade),
            NULL
          )
        ) AS modalidade,
        LOGICAL_OR(
          CASE
            WHEN LOWER(TRIM(COALESCE(obm_p.Uniodonto, obm_l.Uniodonto, ud.uniodonto))) IN ('sim','s','1','true') THEN TRUE
            WHEN LOWER(TRIM(COALESCE(obm_p.Uniodonto, obm_l.Uniodonto, ud.uniodonto))) IN ('nao','não','não','n','0','false') THEN FALSE
            ELSE NULL
          END
        ) AS uniodonto,
        LOGICAL_OR(
          CASE
            WHEN LOWER(TRIM(COALESCE(obm_p.ATIVA, obm_l.ATIVA, op.ativa))) IN ('sim','s','1','true') THEN TRUE
            WHEN LOWER(TRIM(COALESCE(obm_p.ATIVA, obm_l.ATIVA, op.ativa))) IN ('nao','não','não','n','0','false') THEN FALSE
            ELSE NULL
          END
        ) AS ativa,
        MAX(SAFE_CAST(src.qt_beneficiarios AS INT64)) AS qt_beneficiarios,
        COALESCE(
          MAX(IF(src.porte IS NOT NULL AND src.porte <> '', CAST(src.porte AS STRING), NULL)),
          MAX(IF(obm_p.porte IS NOT NULL AND obm_p.porte <> '', CAST(obm_p.porte AS STRING), NULL)),
          MAX(IF(obm_l.porte IS NOT NULL AND obm_l.porte <> '', CAST(obm_l.porte AS STRING), NULL))
        ) AS porte,
        SAFE_CAST(src.ano AS INT64) AS ano,
        SAFE_CAST(src.trimestre AS INT64) AS trimestre,
        MAX(DATE(SAFE_CAST(src.ano AS INT64), 1 + (SAFE_CAST(src.trimestre AS INT64) - 1) * 3, 1)) AS periodo_data,
        SUM(IF(src.cd_conta_contabil = '3', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_receitas,
        SUM(IF(src.cd_conta_contabil = '4', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_despesas,
        SUM(IF(src.cd_conta_contabil = '311', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_contraprestacoes,
        SUM(IF(src.cd_conta_contabil = '3111', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_contraprestacoes_efetivas,
        SUM(IF(src.cd_conta_contabil = '311121', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_contraprestacoes_pre,
        SUM(IF(src.cd_conta_contabil = '3117', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_corresponsabilidade_cedida,
        SUM(IF(src.cd_conta_contabil = '1231', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_creditos_operacoes_saude,
        SUM(IF(src.cd_conta_contabil = '41', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_eventos_liquidos,
        SUM(IF(src.cd_conta_contabil = '2111', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_eventos_a_liquidar,
        SUM(IF(src.cd_conta_contabil = '43', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_desp_comerciais,
        SUM(IF(src.cd_conta_contabil = '464119113', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_desp_comerciais_promocoes,
        SUM(IF(src.cd_conta_contabil = '464', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_464,
        SUM(IF(src.cd_conta_contabil = '46', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_desp_administrativas,
        SUM(IF(src.cd_conta_contabil = '44', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_outras_desp_oper,
        SUM(IF(src.cd_conta_contabil = '442129119', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_442129119,
        SUM(IF(src.cd_conta_contabil = '47', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_desp_tributos,
        SUM(IF(src.cd_conta_contabil = '35', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_receitas_fin,
        SUM(IF(src.cd_conta_contabil = '36', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_receitas_patrimoniais,
        SUM(IF(src.cd_conta_contabil = '45', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_despesas_fin,
        SUM(IF(src.cd_conta_contabil = '33', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_outras_receitas_operacionais,
        SUM(IF(src.cd_conta_contabil = '332129111', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_332129111,
        SUM(IF(src.cd_conta_contabil = '332189111', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_332189111,
        SUM(IF(src.cd_conta_contabil = '12', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_ativo_circulante,
        SUM(IF(src.cd_conta_contabil = '1213', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_1213,
        SUM(IF(src.cd_conta_contabil = '1214', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_1214,
        SUM(IF(src.cd_conta_contabil = '122', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_122,
        SUM(IF(src.cd_conta_contabil = '13', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_ativo_permanente,
        SUM(IF(src.cd_conta_contabil = '21', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_passivo_circulante,
        SUM(IF(src.cd_conta_contabil = '23', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_passivo_nao_circulante,
        SUM(IF(src.cd_conta_contabil = '25', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_patrimonio_liquido,
        SUM(IF(src.cd_conta_contabil = '31', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_ativos_garantidores,
        SUM(IF(src.cd_conta_contabil = '32', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_provisoes_tecnicas,
        SUM(IF(src.cd_conta_contabil = '32', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_32,
        SUM(IF(src.cd_conta_contabil = '216', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_216,
        SUM(IF(src.cd_conta_contabil = '217', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_217,
        SUM(IF(src.cd_conta_contabil = '236', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_236,
        SUM(IF(src.cd_conta_contabil = '237', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_237,
        SUM(IF(src.cd_conta_contabil = '2521', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_pl_ajustado,
        SUM(IF(src.cd_conta_contabil = '2522', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_margem_solvencia_exigida,
        SUM(IF(src.cd_conta_contabil = '61', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_61,
        MAX(SAFE_CAST(src.qt_prestadores AS INT64)) AS qt_prestadores
      FROM ${auxLatest} src
      LEFT JOIN obm_period obm_p
        ON CAST(src.reg_ans AS STRING) = obm_p.reg_ans
       AND DATE(SAFE_CAST(src.ano AS INT64), 1 + (SAFE_CAST(src.trimestre AS INT64) - 1) * 3, 1) = obm_p.Periodo
      LEFT JOIN obm_latest obm_l
        ON CAST(src.reg_ans AS STRING) = obm_l.reg_ans
      LEFT JOIN operadoras_dim op
        ON CAST(src.reg_ans AS STRING) = op.reg_ans
      LEFT JOIN uniodonto_dim ud
        ON CAST(src.reg_ans AS STRING) = ud.reg_ans
      WHERE src.ano IS NOT NULL
        AND src.trimestre IS NOT NULL
        AND LOWER(TRIM(COALESCE(src.modalidade, obm_p.modalidade, obm_l.modalidade, op.modalidade, ''))) IN (
          'odontologia de grupo',
          'cooperativa odontológica'
        )
      GROUP BY reg_ans, ano, trimestre
    ), combined_base AS (
      SELECT *
      FROM official_base
      UNION ALL
      SELECT external_base.*
      FROM external_base
      LEFT JOIN official_base
        ON official_base.reg_ans = external_base.reg_ans
       AND official_base.ano = external_base.ano
       AND official_base.trimestre = external_base.trimestre
      WHERE official_base.reg_ans IS NULL
    ), lagged AS (
      SELECT
        base.*,
        LAG(vr_eventos_liquidos) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_vr_eventos_liquidos,
        LAG(vr_corresponsabilidade_cedida) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_vr_corresponsabilidade_cedida,
        LAG(vr_contraprestacoes) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_vr_contraprestacoes,
        LAG(vr_provisoes_tecnicas) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_vr_provisoes_tecnicas,
        LAG(qt_beneficiarios) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_qt_beneficiarios,
        COALESCE(vr_eventos_liquidos, 0) - COALESCE(LAG(vr_eventos_liquidos) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_vr_eventos_liquidos,
        COALESCE(vr_corresponsabilidade_cedida, 0) - COALESCE(LAG(vr_corresponsabilidade_cedida) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_vr_corresponsabilidade_cedida,
        COALESCE(vr_contraprestacoes, 0) - COALESCE(LAG(vr_contraprestacoes) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_vr_contraprestacoes,
        COALESCE(vr_provisoes_tecnicas, 0) - COALESCE(LAG(vr_provisoes_tecnicas) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_vr_provisoes_tecnicas,
        COALESCE(qt_beneficiarios, 0) - COALESCE(LAG(qt_beneficiarios) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_qt_beneficiarios
      FROM combined_base base
    )
    SELECT
      lagged.reg_ans,
      lagged.nome_operadora,
      lagged.modalidade,
      lagged.uniodonto,
      lagged.ativa,
      lagged.qt_beneficiarios,
      COALESCE(
        lagged.porte,
        CASE
          WHEN lagged.qt_beneficiarios IS NULL THEN NULL
          WHEN lagged.qt_beneficiarios <= 19999 THEN 'Pequeno Porte'
          WHEN lagged.qt_beneficiarios <= 99999 THEN 'Médio Porte'
          ELSE 'Grande Porte'
        END
      ) AS porte,
      lagged.ano,
      lagged.trimestre,
      lagged.periodo_data AS periodo_raw,
      (lagged.ano * 10 + lagged.trimestre) AS periodo_id,
      CONCAT(CAST(lagged.ano AS STRING), 'T', CAST(lagged.trimestre AS STRING)) AS periodo,
      ROW_NUMBER() OVER (PARTITION BY lagged.reg_ans, lagged.ano ORDER BY lagged.trimestre DESC) AS trimestre_rank,
      lagged.vr_receitas,
      lagged.vr_despesas,
      lagged.vr_contraprestacoes,
      lagged.vr_contraprestacoes_efetivas,
      lagged.vr_contraprestacoes_pre,
      lagged.vr_corresponsabilidade_cedida,
      lagged.vr_creditos_operacoes_saude,
      lagged.vr_eventos_liquidos,
      lagged.vr_eventos_a_liquidar,
      lagged.vr_desp_comerciais,
      lagged.vr_desp_comerciais_promocoes,
      lagged.vr_conta_464,
      lagged.vr_desp_administrativas,
      lagged.vr_outras_desp_oper,
      lagged.vr_conta_442129119,
      lagged.vr_desp_tributos,
      lagged.vr_receitas_fin,
      lagged.vr_receitas_patrimoniais,
      lagged.vr_despesas_fin,
      lagged.vr_outras_receitas_operacionais,
      lagged.vr_conta_332129111,
      lagged.vr_conta_332189111,
      lagged.vr_ativo_circulante,
      lagged.vr_conta_1213,
      lagged.vr_conta_1214,
      lagged.vr_conta_122,
      lagged.vr_ativo_permanente,
      lagged.vr_passivo_circulante,
      lagged.vr_passivo_nao_circulante,
      lagged.vr_patrimonio_liquido,
      lagged.vr_ativos_garantidores,
      lagged.vr_provisoes_tecnicas,
      lagged.vr_conta_32,
      lagged.vr_conta_216,
      lagged.vr_conta_217,
      lagged.vr_conta_236,
      lagged.vr_conta_237,
      lagged.vr_pl_ajustado,
      lagged.vr_margem_solvencia_exigida,
      lagged.vr_conta_61,
      COALESCE(lagged.vr_receitas_fin, 0) - COALESCE(lagged.vr_despesas_fin, 0) AS resultado_financeiro,
      COALESCE(lagged.vr_receitas, 0) - COALESCE(lagged.vr_despesas, 0) AS resultado_liquido,
      COALESCE(lagged.vr_receitas, 0) - COALESCE(lagged.vr_despesas, 0) AS resultado_liquido_calculado,
      COALESCE(lagged.vr_receitas, 0) - COALESCE(lagged.vr_despesas, 0) - COALESCE(lagged.vr_conta_61, 0) AS resultado_liquido_final_ans,
      COALESCE(lagged.vr_receitas, 0) - COALESCE(lagged.vr_despesas, 0) AS resultado_liquido_informado,
      lagged.prev_vr_eventos_liquidos,
      lagged.prev_vr_corresponsabilidade_cedida,
      lagged.prev_vr_contraprestacoes,
      lagged.prev_vr_provisoes_tecnicas,
      lagged.prev_qt_beneficiarios,
      lagged.delta_vr_eventos_liquidos,
      lagged.delta_vr_corresponsabilidade_cedida,
      lagged.delta_vr_contraprestacoes,
      lagged.delta_vr_provisoes_tecnicas,
      lagged.delta_qt_beneficiarios,
      lagged.qt_prestadores
    FROM lagged
  `
}

function buildConsolidatedIndicatorMartsQuery() {
  const template = fs.readFileSync(MART_SQL_PATH, 'utf8').trim().replace(/;\s*$/, '')
  return template
    .replaceAll('{{SOURCE_TABLE}}', formatMaterializeTableRef(CONSOLIDATED_INDICATOR_SNAPSHOT_REF.fqn, CONSOLIDATED_INDICATOR_SNAPSHOT_REF.datasetId))
    .replaceAll('{{ANS_TABLE}}', formatMaterializeTableRef(CONSOLIDATED_MART_ANS_REF.fqn, CONSOLIDATED_MART_ANS_REF.datasetId))
    .replaceAll(
      '{{UNIODONTO_TABLE}}',
      formatMaterializeTableRef(CONSOLIDATED_MART_UNIODONTO_REF.fqn, CONSOLIDATED_MART_UNIODONTO_REF.datasetId),
    )
    .replaceAll('{{PARTITION_EXPR}}', 'periodo_raw')
    .replaceAll('{{CLUSTER_FIELDS}}', 'periodo_id, reg_ans, modalidade, uniodonto')
}

async function refreshConsolidatedIndicatorArtifacts() {
  await ensureDataset(CONSOLIDATED_INDICATOR_SNAPSHOT_REF.datasetId)
  const snapshotQuery = buildConsolidatedIndicatorSnapshotQuery()
  await bigquery.query({ query: snapshotQuery, location: BQ_LOCATION })
  const martQuery = buildConsolidatedIndicatorMartsQuery()
  await bigquery.query({ query: martQuery, location: BQ_LOCATION })
}

async function ensureAuxDemonstracoesTable() {
  const dataset = await ensureDataset(AUX_DEMONSTRACOES_TABLE_REF.datasetId)

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

async function inferBaseDemonstracoesSchemaMode() {
  const [rows] = await bigquery.query({
    query: `
      SELECT LOWER(column_name) AS column_name
      FROM \`${BASE_DEMONSTRACOES_TABLE_REF.projectId}.${BASE_DEMONSTRACOES_TABLE_REF.datasetId}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @tableName
    `,
    params: { tableName: BASE_DEMONSTRACOES_TABLE_REF.objectId },
    location: BQ_LOCATION,
  })

  const columnSet = new Set(normalizeBigQueryRows(rows).map((row) => toNullableString(row?.column_name).toLowerCase()).filter(Boolean))
  if (columnSet.has('reg_ans') && columnSet.has('valor') && columnSet.has('operadora')) return 'curated_valor'
  if (columnSet.has('registro_operadora')) return 'legacy_registro_operadora'
  if (columnSet.has('reg_ans') && columnSet.has('vl_saldo_final') && columnSet.has('vl_saldo_inicial') && columnSet.has('data')) {
    return 'raw_uppercase'
  }

  throw new Error(
    `Schema base não suportado em ${BASE_DEMONSTRACOES_TABLE_REF.fqn}. Colunas encontradas: ${[...columnSet].sort().join(', ')}`,
  )
}

function buildBaseDemonstracoesProjectionSql(schemaMode) {
  if (schemaMode === 'curated_valor') {
    return `
      SELECT
        DATE(SAFE_CAST(b.ano AS INT64), 1 + (SAFE_CAST(b.trimestre AS INT64) - 1) * 3, 1) AS data,
        SAFE_CAST(b.reg_ans AS INT64) AS reg_ans,
        CAST(b.cd_conta_contabil AS STRING) AS cd_conta_contabil,
        CAST(b.descricao AS STRING) AS descricao,
        CAST(NULL AS FLOAT64) AS vl_saldo_inicial,
        SAFE_CAST(b.valor AS FLOAT64) AS vl_saldo_final,
        SAFE_CAST(b.ano AS INT64) AS ano,
        SAFE_CAST(b.trimestre AS INT64) AS trimestre,
        CAST(NULL AS STRING) AS arquivo_origem
      FROM \`${BASE_DEMONSTRACOES_TABLE_REF.fqn}\` b
    `
  }

  if (schemaMode === 'legacy_registro_operadora') {
    return `
      SELECT
        DATE(b.data) AS data,
        SAFE_CAST(b.registro_operadora AS INT64) AS reg_ans,
        CAST(b.cd_conta_contabil AS STRING) AS cd_conta_contabil,
        CAST(b.descricao AS STRING) AS descricao,
        SAFE_CAST(b.vl_saldo_inicial AS FLOAT64) AS vl_saldo_inicial,
        SAFE_CAST(b.vl_saldo_final AS FLOAT64) AS vl_saldo_final,
        SAFE_CAST(b.ano AS INT64) AS ano,
        SAFE_CAST(b.trimestre AS INT64) AS trimestre,
        CAST(b.arquivo_origem AS STRING) AS arquivo_origem
      FROM \`${BASE_DEMONSTRACOES_TABLE_REF.fqn}\` b
    `
  }

  return `
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
  `
}

async function refreshConsolidatedDemonstracoesView() {
  const schemaMode = await inferBaseDemonstracoesSchemaMode()
  const baseProjectionSql = buildBaseDemonstracoesProjectionSql(schemaMode)
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
    ), base_data AS (
      SELECT base.*
      FROM (
        ${baseProjectionSql}
      ) base
    ), aux_only AS (
      SELECT a.*
      FROM aux_latest a
      LEFT JOIN base_data base
        ON SAFE_CAST(base.reg_ans AS STRING) = SAFE_CAST(a.reg_ans AS STRING)
       AND base.cd_conta_contabil = a.cd_conta_contabil
       AND base.ano = a.ano
       AND base.trimestre = a.trimestre
      WHERE base.reg_ans IS NULL
    )
    SELECT * FROM base_data
    UNION ALL
    SELECT * FROM aux_only
  `
  await bigquery.query({ query, location: BQ_LOCATION })
}

function buildUploadBatchMetadata(rawMetadata = {}, context = {}) {
  const competenciaText = toNullableString(rawMetadata?.competencia)
  const competenciaParts = competenciaText ? parseCompetencia(competenciaText) : null
  if (competenciaText && !competenciaParts) {
    return { error: 'Competência do formulário é inválida. Use o formato YYYY-MM.' }
  }

  const qtBeneficiarios = parseFlexibleInteger(rawMetadata?.qt_beneficiarios)
  const qtPrestadores = parseFlexibleInteger(rawMetadata?.qt_prestadores)
  const computedPorte = computePorteFromBeneficiarios(qtBeneficiarios)
  const responsavelEmail = normalizeEmail(rawMetadata?.responsavel_email) ?? normalizeEmail(context.userEmail)

  return {
    metadata: {
      competencia: competenciaParts?.competencia ?? null,
      cnpj: normalizeDigits(rawMetadata?.cnpj) ?? context.operatorMetadata?.cnpj ?? null,
      status_fechamento: toNullableString(rawMetadata?.status_fechamento) || DEFAULT_DEMONSTRACOES_STATUS,
      tipo_envio: toNullableString(rawMetadata?.tipo_envio) || DEFAULT_DEMONSTRACOES_TIPO_ENVIO,
      versao_envio: parseFlexibleInteger(rawMetadata?.versao_envio) ?? 1,
      dt_envio: parseTimestampValue(rawMetadata?.dt_envio) ?? null,
      sistema_origem: toNullableString(rawMetadata?.sistema_origem) || 'UPLOAD_MANUAL',
      responsavel_nome: toNullableString(rawMetadata?.responsavel_nome) || null,
      responsavel_email: responsavelEmail,
      qt_beneficiarios: qtBeneficiarios,
      qt_prestadores: qtPrestadores,
      modalidade: toNullableString(rawMetadata?.modalidade) || context.operatorMetadata?.modalidade || DEFAULT_DEMONSTRACOES_MODALIDADE,
      porte: toNullableString(rawMetadata?.porte) || computedPorte,
      observacoes: toNullableString(rawMetadata?.observacoes) || null,
    },
  }
}

function buildNormalizedUploadRow(rawRow = {}, context = {}) {
  const normalized = normalizeRowObject(rawRow)
  const batchMetadata = context.batchMetadata ?? {}

  const competenciaText = toNullableString(normalized.competencia) || batchMetadata.competencia
  const competenciaParts = parseCompetencia(competenciaText)
  if (!competenciaParts) {
    return { error: 'Competência inválida. Use o formato YYYY-MM.' }
  }
  if (batchMetadata.competencia && toNullableString(normalized.competencia) && competenciaParts.competencia !== batchMetadata.competencia) {
    return { error: `Competência ${competenciaParts.competencia} não confere com o formulário (${batchMetadata.competencia}).` }
  }

  const regAnsText = normalizeRegAns(normalized.reg_ans) ?? normalizeRegAns(context.operatorRegAns)
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

  const descricaoByCode = context.accountDescriptionMap?.get(conta) ?? null
  const descricao = descricaoByCode || toNullableString(normalized.descricao) || null
  if (!descricao) {
    return { error: `Descrição não encontrada para a conta ${conta}.` }
  }

  const qtBeneficiarios = parseFlexibleInteger(normalized.qt_beneficiarios) ?? batchMetadata.qt_beneficiarios
  const qtPrestadores = parseFlexibleInteger(normalized.qt_prestadores) ?? batchMetadata.qt_prestadores
  const computedPorte = computePorteFromBeneficiarios(qtBeneficiarios)

  const row = {
    competencia: competenciaParts.competencia,
    ano: competenciaParts.ano,
    trimestre: competenciaParts.trimestre,
    data: competenciaParts.data,
    reg_ans: regAnsText,
    cnpj: normalizeDigits(normalized.cnpj) ?? batchMetadata.cnpj ?? null,
    cd_conta_contabil: conta,
    vl_saldo_final: saldoFinal,
    descricao,
    vl_saldo_inicial: parseFlexibleNumber(normalized.vl_saldo_inicial),
    vl_debitos: parseFlexibleNumber(normalized.vl_debitos),
    vl_creditos: parseFlexibleNumber(normalized.vl_creditos),
    moeda: toNullableString(normalized.moeda) || 'BRL',
    status_fechamento: toNullableString(normalized.status_fechamento) || batchMetadata.status_fechamento || DEFAULT_DEMONSTRACOES_STATUS,
    tipo_envio: toNullableString(normalized.tipo_envio) || batchMetadata.tipo_envio || DEFAULT_DEMONSTRACOES_TIPO_ENVIO,
    versao_envio: parseFlexibleInteger(normalized.versao_envio) ?? batchMetadata.versao_envio ?? 1,
    dt_envio: parseTimestampValue(normalized.dt_envio) ?? batchMetadata.dt_envio ?? null,
    sistema_origem: toNullableString(normalized.sistema_origem) || batchMetadata.sistema_origem || null,
    responsavel_nome: toNullableString(normalized.responsavel_nome) || batchMetadata.responsavel_nome || null,
    responsavel_email: normalizeEmail(normalized.responsavel_email) ?? batchMetadata.responsavel_email,
    qt_beneficiarios: qtBeneficiarios,
    qt_prestadores: qtPrestadores,
    modalidade: toNullableString(normalized.modalidade) || batchMetadata.modalidade || DEFAULT_DEMONSTRACOES_MODALIDADE,
    porte: toNullableString(normalized.porte) || batchMetadata.porte || computedPorte,
    observacoes: toNullableString(normalized.observacoes) || batchMetadata.observacoes || null,
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

app.get('/api/auth/profile', async (req, res) => {
  const accessContext = req.accessContext ?? {
    enforced: ENFORCE_USER_ACCESS,
    isAdmin: false,
    operators: [],
    allowedRegAns: [],
    canUploadRegAns: [],
  }
  try {
    const payload = await buildAuthProfilePayload(req.user, accessContext)
    res.setHeader('Cache-Control', 'no-store')
    return res.json(payload)
  } catch (err) {
    console.error('[server] Falha ao carregar perfil do usuário', err)
    return res.status(500).json({ error: 'Falha ao carregar perfil do usuário.' })
  }
})

async function handleOperatorsList(_req, res) {
  try {
    const operators = (await listUhubOperatorCatalog())
      .map((item) => ({
        regAns: item.regAns,
        operatorName: item.operatorName,
      }))
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ operators })
  } catch (err) {
    console.error('[server] Falha ao listar Uniodontos pelo UHub', err)
    return res.status(500).json({ error: 'Falha ao carregar lista de operadoras.' })
  }
}

app.get('/api/onboarding/operators', handleOperatorsList)
app.get('/api/operators', handleOperatorsList)

app.post('/api/auth/profile/complete', async (req, res) => {
  const firstName = toNullableString(req.body?.firstName)
  const lastName = toNullableString(req.body?.lastName)
  const phone = toNullableString(req.body?.phone)
  const phoneIsWhatsapp = req.body?.phoneIsWhatsapp === true
  const profileEmail = normalizeEmail(req.body?.email ?? req.user?.email)
  const jobTitle = toNullableString(req.body?.jobTitle)
  const roleFunction = toNullableString(req.body?.roleFunction ?? req.body?.department)
  const department = roleFunction
  const regAns = normalizeRegAns(req.body?.regAns)
  const authenticatedEmail = normalizeEmail(req.user?.email)
  const isPrivilegedUser = isPrivilegedDomainEmail(authenticatedEmail)

  if (!firstName || !lastName || !phone || !profileEmail || !jobTitle || !roleFunction) {
    return res.status(400).json({
      error: 'Preencha todos os campos obrigatórios: Nome, Sobrenome, Telefone, E-mail, Cargo e Função.',
    })
  }
  if (authenticatedEmail && profileEmail !== authenticatedEmail) {
    return res.status(400).json({ error: 'O e-mail informado deve ser o mesmo do login atual.' })
  }
  if (!isPrivilegedUser && !regAns) {
    return res.status(400).json({ error: 'Selecione a Uniodonto vinculada para concluir o cadastro.' })
  }

  try {
    let operatorMetadata = null
    if (regAns) {
      operatorMetadata = await resolveOperatorMetadata(regAns)
      if (!operatorMetadata && !isPrivilegedUser) {
        return res.status(400).json({ error: 'Operadora inválida para o vínculo informado.' })
      }
    }
    const requestId = crypto.randomUUID()
    const profilePayload = {
      firstName,
      lastName,
      phone,
      phoneIsWhatsapp,
      email: profileEmail,
      jobTitle,
      roleFunction,
      department,
      regAns: regAns ?? null,
      operatorName: operatorMetadata?.operatorName ?? null,
    }
    const verification = isPrivilegedUser
      ? { status: APPROVAL_STATUS.MANUAL_APPROVED, reason: 'usuario_admin' }
      : await verifyUhubOnboarding({ email: profileEmail, phone })

    await upsertUserProfile(req.user, {
      ...profilePayload,
    })

    if (canAccessFromApprovalStatus(verification.status)) {
      await upsertApprovedUserAccess(req.user, profilePayload)
    }

    let onboardingLink = createOnboardingLinkFallback(req.user, profilePayload, verification)
    try {
      onboardingLink = await saveOnboardingLink(req.user, profilePayload, verification)
    } catch (err) {
      console.warn('[server] Falha ao persistir vínculo de onboarding no Firestore', err?.message ?? err)
    }

    await auditOnboardingAttempt({
      uid: req.user?.uid,
      email: profileEmail,
      phone: normalizePhoneForUhub(phone),
      result: {
        status: verification.status,
        reason: verification.reason,
        uhubPessoaId: verification.uhubPessoaId,
        matchBy: verification.matchBy,
      },
      requestId,
    })

    sendOnboardingEmails({
      profile: profilePayload,
      status: verification.status,
      reason: verification.reason,
    }).catch((err) => {
      console.warn('[server] Falha ao enviar e-mail de onboarding', err?.message ?? err)
    })

    userAccessCache.delete(getUserAccessCacheKey(req.user))
    const accessContext = canAccessFromApprovalStatus(verification.status)
      ? await resolveUserAccessContext(req.user)
      : {
          enforced: ENFORCE_USER_ACCESS,
          isAdmin: isPrivilegedUser,
          operators: [],
          allowedRegAns: [],
          canUploadRegAns: [],
        }
    const payload = await buildAuthProfilePayload(req.user, accessContext)
    payload.approvalStatus = onboardingLink?.statusAprovacao ?? payload.approvalStatus
    res.setHeader('Cache-Control', 'no-store')
    return res.json(payload)
  } catch (err) {
    console.error('[server] Falha ao concluir perfil do usuário', err)
    return res.status(500).json({ error: 'Falha ao concluir cadastro do usuário.' })
  }
})

function ensureAdminRequest(req, res) {
  if (isPrivilegedDomainEmail(req.user?.email) || req.user?.claims?.admin === true || req.user?.claims?.isAdmin === true) {
    return true
  }
  res.status(403).json({ error: 'Acesso administrativo necessário.' })
  return false
}

app.get('/api/admin/accounts/pending', async (req, res) => {
  if (!ensureAdminRequest(req, res)) return
  try {
    const [pendingSnapshot, reviewSnapshot] = await Promise.all([
      firestore
        .collection(PFC_ONBOARDING_COLLECTION)
        .where('status_aprovacao', '==', APPROVAL_STATUS.PENDING)
        .limit(100)
        .get(),
      firestore
        .collection(PFC_ONBOARDING_COLLECTION)
        .where('status_aprovacao', '==', APPROVAL_STATUS.PENDING_REVIEW)
        .limit(100)
        .get(),
    ])
    const accounts = [...pendingSnapshot.docs, ...reviewSnapshot.docs].map(mapOnboardingDoc)
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ accounts })
  } catch (err) {
    console.error('[server] Falha ao listar contas pendentes', err)
    return res.status(500).json({ error: 'Falha ao listar contas pendentes.' })
  }
})

app.post('/api/admin/accounts/:uid/approve', async (req, res) => {
  if (!ensureAdminRequest(req, res)) return
  const uid = String(req.params.uid ?? '').trim()
  if (!uid) return res.status(400).json({ error: 'UID inválido.' })
  try {
    const ref = getOnboardingDocRef(uid)
    const snapshot = await ref.get()
    if (!snapshot.exists) return res.status(404).json({ error: 'Conta não encontrada.' })
    const current = mapOnboardingDoc(snapshot)
    await ref.set(
      {
        status_aprovacao: APPROVAL_STATUS.MANUAL_APPROVED,
        approval_reason: 'aprovado_admin',
        approved_by_email: normalizeEmail(req.user?.email),
        approved_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    userAccessCache.delete(getUserAccessCacheKey({ uid, email: current?.email }))
    return res.json({ account: await fetchOnboardingLink(uid) })
  } catch (err) {
    console.error('[server] Falha ao aprovar conta', err)
    return res.status(500).json({ error: 'Falha ao aprovar conta.' })
  }
})

app.post('/api/admin/accounts/:uid/reject', async (req, res) => {
  if (!ensureAdminRequest(req, res)) return
  const uid = String(req.params.uid ?? '').trim()
  if (!uid) return res.status(400).json({ error: 'UID inválido.' })
  try {
    const ref = getOnboardingDocRef(uid)
    const snapshot = await ref.get()
    if (!snapshot.exists) return res.status(404).json({ error: 'Conta não encontrada.' })
    await ref.set(
      {
        status_aprovacao: APPROVAL_STATUS.REJECTED,
        approval_reason: toNullableString(req.body?.reason) ?? 'rejeitado_admin',
        rejected_by_email: normalizeEmail(req.user?.email),
        rejected_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return res.json({ account: await fetchOnboardingLink(uid) })
  } catch (err) {
    console.error('[server] Falha ao rejeitar conta', err)
    return res.status(500).json({ error: 'Falha ao rejeitar conta.' })
  }
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
    const scopedQuery = applyUserAccessScopeToSql(exportQuery, req.accessContext)
    const result = await runBigQuery(scopedQuery)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.send(buildCsv(result))
  } catch (err) {
    if (err?.code === 'NO_OPERATOR_ACCESS' || err?.code === 'NO_SCOPE_TABLE') {
      return res.status(403).json({ error: err.message, code: err.code })
    }
    console.error('[server] falha ao gerar CSV', err)
    res.status(500).json({ error: 'Falha ao gerar CSV de indicadores.' })
  }
})

app.get('/api/import/operadora-demonstracoes/context', async (req, res) => {
  const operatorRegAns = normalizeRegAns(req.query?.reg_ans)
  if (!operatorRegAns) {
    return res.status(400).json({ error: 'Registro ANS da operadora é obrigatório.' })
  }
  if (!hasOperatorUploadAccess(req.accessContext, operatorRegAns)) {
    return res.status(403).json({
      error: 'Usuário sem permissão para enviar dados desta operadora.',
      code: 'OPERATOR_UPLOAD_FORBIDDEN',
    })
  }

  try {
    const scopedOperator = (req.accessContext?.operators ?? []).find((item) => item.regAns === operatorRegAns)
    const operatorMetadata = await fetchOperatorRegistryMetadata(operatorRegAns)
    res.setHeader('Cache-Control', 'no-store')
    return res.json({
      regAns: operatorRegAns,
      operatorName: scopedOperator?.operatorName ?? operatorMetadata?.operatorName ?? null,
      cnpj: operatorMetadata?.cnpj ?? null,
      modalidade: operatorMetadata?.modalidade ?? DEFAULT_DEMONSTRACOES_MODALIDADE,
      statusFechamento: DEFAULT_DEMONSTRACOES_STATUS,
      tipoEnvio: DEFAULT_DEMONSTRACOES_TIPO_ENVIO,
      versaoEnvio: 1,
      responsavelEmail: normalizeEmail(req.user?.email) ?? null,
    })
  } catch (err) {
    console.error('[server] Falha ao carregar contexto da operadora', err)
    return res.status(500).json({
      error: 'Falha ao carregar dados da operadora para o formulário.',
      details: err?.message ?? String(err),
    })
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

async function handleOperadoraDemonstracoesUpload(req, res) {
  const operatorName = toNullableString(req.body?.operatorName)
  const operatorRegAns = normalizeRegAns(req.body?.operatorRegAns)
  const fileName = toNullableString(req.body?.fileName) || 'upload.csv'
  const rawMetadata = req.body?.metadata ?? {}
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null

  if (!operatorName) {
    return res.status(400).json({ error: 'Operadora é obrigatória.' })
  }
  if (!operatorRegAns) {
    return res.status(400).json({ error: 'Registro ANS da operadora é obrigatório.' })
  }
  if (!hasOperatorUploadAccess(req.accessContext, operatorRegAns)) {
    return res.status(403).json({
      error: 'Usuário sem permissão para enviar dados desta operadora.',
      code: 'OPERATOR_UPLOAD_FORBIDDEN',
    })
  }
  if (req.accessContext?.enforced && !req.accessContext?.isAdmin) {
    const scopedOperator = (req.accessContext?.operators ?? []).find((item) => item.regAns === operatorRegAns)
    if (scopedOperator?.operatorName) {
      const expectedName = scopedOperator.operatorName.trim().toLowerCase()
      const currentName = String(operatorName).trim().toLowerCase()
      if (expectedName && currentName && expectedName !== currentName) {
        return res.status(400).json({
          error: `Operadora selecionada não corresponde ao vínculo de acesso para reg_ans ${operatorRegAns}.`,
        })
      }
    }
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

  let operatorMetadata = null
  try {
    operatorMetadata = await fetchOperatorRegistryMetadata(operatorRegAns)
  } catch (err) {
    console.error('[server] Falha ao buscar cadastro da operadora', err)
    return res.status(500).json({
      error: 'Falha ao carregar cadastro da operadora.',
      details: err?.message ?? String(err),
    })
  }

  const batchMetadataResult = buildUploadBatchMetadata(rawMetadata, {
    operatorRegAns,
    operatorMetadata,
    userEmail: req.user?.email ?? null,
  })
  if (batchMetadataResult.error) {
    return res.status(400).json({ error: batchMetadataResult.error })
  }
  const batchMetadata = batchMetadataResult.metadata

  const accountCodes = rows
    .map((rawRow) => normalizeRowObject(rawRow))
    .map((row) => toNullableString(row.cd_conta_contabil))
    .filter(Boolean)
  let accountDescriptionMap = new Map()
  try {
    accountDescriptionMap = await fetchAccountDescriptionMap(accountCodes)
  } catch (err) {
    console.error('[server] Falha ao resolver descricoes de contas', err)
    return res.status(500).json({
      error: 'Falha ao carregar o dicionário de contas contábeis.',
      details: err?.message ?? String(err),
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
    const parsed = buildNormalizedUploadRow(rawRow, {
      operatorRegAns,
      batchMetadata,
      accountDescriptionMap,
    })
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
  const fileOrigin = `operadora-upload:${fileName}`
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
    dt_envio: row.dt_envio ?? uploadedAt,
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
    const refreshWarnings = []
    if (SHOULD_REFRESH_CONSOLIDATED_VIEW) {
      try {
        await refreshConsolidatedDemonstracoesView()
      } catch (err) {
        refreshWarnings.push(err?.message ?? String(err))
      }
    }
    if (SHOULD_REFRESH_CONSOLIDATED_INDICATORS) {
      try {
        await refreshConsolidatedIndicatorArtifacts()
      } catch (err) {
        refreshWarnings.push(err?.message ?? String(err))
      }
    }
    return res.json({
      success: true,
      uploadId,
      insertedRows: records.length,
      auxTable: AUX_DEMONSTRACOES_TABLE_REF.fqn,
      latestView: AUX_DEMONSTRACOES_LATEST_VIEW_REF.fqn,
      consolidatedView: SHOULD_REFRESH_CONSOLIDATED_VIEW ? CONSOLIDATED_DEMONSTRACOES_VIEW_REF.fqn : null,
      indicatorSnapshot: SHOULD_REFRESH_CONSOLIDATED_INDICATORS ? CONSOLIDATED_INDICATOR_SNAPSHOT_REF.fqn : null,
      indicatorMartAns: SHOULD_REFRESH_CONSOLIDATED_INDICATORS ? CONSOLIDATED_MART_ANS_REF.fqn : null,
      indicatorMartUniodonto: SHOULD_REFRESH_CONSOLIDATED_INDICATORS ? CONSOLIDATED_MART_UNIODONTO_REF.fqn : null,
      warning: refreshWarnings.length ? refreshWarnings.join(' | ') : null,
    })
  } catch (err) {
    console.error('[server] Falha ao importar demonstracoes da operadora', err)
    return res.status(500).json({
      error: 'Falha ao importar arquivo para a tabela auxiliar.',
      details: err?.message ?? String(err),
    })
  }
}

app.post('/api/import/operadora-demonstracoes', handleOperadoraDemonstracoesUpload)
app.post('/api/import/singular-demonstracoes', handleOperadoraDemonstracoesUpload)

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
  const rewrittenSql = rewriteLegacyBigQueryRefs(sanitized)
  const cteNames = extractCteNames(rewrittenSql)
  const tableRefs = extractTableRefs(rewrittenSql, cteNames)
  const disallowed = [...tableRefs].filter((ref) => !ALLOWED_TABLES.has(ref))
  if (disallowed.length) {
    return res.status(403).json({
      error: 'Consulta bloqueada. Acesso permitido apenas às views/tabelas autorizadas.',
      tables: disallowed,
    })
  }
  let scopedSql = rewrittenSql
  try {
    scopedSql = applyUserAccessScopeToSql(rewrittenSql, req.accessContext)
  } catch (err) {
    if (err?.code === 'NO_OPERATOR_ACCESS' || err?.code === 'NO_SCOPE_TABLE') {
      return res.status(403).json({ error: err.message, code: err.code })
    }
    console.error('[server] Falha ao aplicar escopo de acesso na consulta', err?.message ?? err)
    return res.status(500).json({ error: 'Falha ao validar escopo da consulta.' })
  }

  const includeFields = Boolean(req.body?.includeFields)
  const cacheEnabled = Number.isFinite(QUERY_CACHE_TTL_MS) && QUERY_CACHE_TTL_MS > 0
  const cacheKey = cacheEnabled ? getCacheKey(scopedSql) : null
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
    const queryPromise = runBigQuery(scopedSql).finally(() => {
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
    console.error('[server] erro ao executar consulta', err?.message ?? err, '\nSQL:', scopedSql)
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

if (SHOULD_REFRESH_CONSOLIDATED_INDICATORS) {
  refreshConsolidatedIndicatorArtifacts()
    .then(() => {
      console.log(
        `[server] Indicadores consolidados atualizados em ${CONSOLIDATED_INDICATOR_SNAPSHOT_REF.fqn}, ${CONSOLIDATED_MART_ANS_REF.fqn} e ${CONSOLIDATED_MART_UNIODONTO_REF.fqn}`,
      )
    })
    .catch((err) => {
      console.error('[server] Falha ao atualizar indicadores consolidados no boot', err?.message ?? err)
    })
}

app.listen(PORT, HOST, () => {
  const publicHost = HOST === '0.0.0.0' ? 'localhost' : HOST
  console.log(`[server] API disponível em http://${publicHost}:${PORT} (bind ${HOST})`)
})
