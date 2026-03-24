import express from 'express'
import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import admin from 'firebase-admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const HOST = process.env.SERVER_HOST ?? '0.0.0.0'
const PORT = process.env.SERVER_PORT ?? process.env.PORT ?? 4000
const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const BQ_DATASET = process.env.BQ_DATASET ?? 'dash_ans'
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
const BQ_USER_ACCESS_TABLE = process.env.BQ_USER_ACCESS_TABLE ?? 'user_operadora_acessos'
const ENFORCE_USER_ACCESS = (process.env.BQ_ENFORCE_USER_ACCESS ?? 'true')
  .toLowerCase()
  .trim() === 'true'
const USER_ACCESS_CACHE_TTL_MS = Number(process.env.USER_ACCESS_CACHE_TTL_MS ?? 60_000)
const BQ_BASE_DEMONSTRACOES_TABLE =
  process.env.BQ_BASE_DEMONSTRACOES_TABLE ?? `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.demonstracoes_contabeis`
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
const USER_ACCESS_TABLE_REF = parseTableRef(BQ_USER_ACCESS_TABLE, BQ_MART_DATASET)
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
const userAccessCache = new Map()

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

const AUTH_PUBLIC_PATHS = new Set(['/api/health', '/api/auth/status'])
const AUTH_ALLOW_NO_ACCESS_PATHS = new Set(['/api/auth/profile'])

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
    req.accessContext = await resolveUserAccessContext(req.user)
    if (
      req.accessContext?.enforced &&
      !req.accessContext?.isAdmin &&
      !(req.accessContext?.allowedRegAns ?? []).length &&
      !AUTH_ALLOW_NO_ACCESS_PATHS.has(req.path)
    ) {
      throw createNoAccessError()
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

function escapeRegExp(value) {
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

function createNoAccessError(message = 'Usuário sem operadora vinculada.') {
  const error = new Error(message)
  error.code = 'NO_OPERATOR_ACCESS'
  return error
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
  let isAdmin = Boolean(user?.claims?.admin === true || user?.claims?.isAdmin === true)
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

  await ensureUserAccessTable()
  const uid = String(user.uid ?? '').trim() || null
  const email = normalizeEmail(user.email)
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

  const context = createAccessContextFromRows(normalizeBigQueryRows(rows), user)
  setCachedUserAccess(cacheKey, context)
  return context
}

function replaceTableRefInSql(sql, tableRef, replacementRef) {
  const escaped = escapeRegExp(tableRef)
  const pattern = new RegExp(`\\b(from|join)\\s+(?:\\\`${escaped}\\\`|${escaped})(?=\\s|$|,|\\))`, 'gi')
  return sql.replace(pattern, (_full, keyword) => `${keyword} ${replacementRef}`)
}

function prependAclCtes(sql, ctes = []) {
  if (!ctes.length) return sql
  const trimmed = String(sql ?? '').trim()
  if (!trimmed) return trimmed
  if (/^with\b/i.test(trimmed)) {
    return trimmed.replace(/^with\b/i, `WITH ${ctes.join(', ')},`)
  }
  return `WITH ${ctes.join(', ')}\n${trimmed}`
}

function applyUserAccessScopeToSql(sql, accessContext = {}) {
  if (!accessContext?.enforced || accessContext?.isAdmin) {
    return sql
  }
  const allowedRegAns = Array.from(new Set((accessContext.allowedRegAns ?? []).map((value) => normalizeRegAns(value)).filter(Boolean)))
  if (!allowedRegAns.length) {
    throw createNoAccessError()
  }
  const cteNames = extractCteNames(sql)
  const tableRefs = [...extractTableRefs(sql, cteNames)].filter((ref) => ALLOWED_TABLES.has(ref))
  if (!tableRefs.length) {
    const error = new Error('Consulta sem fonte compatível com o escopo de operadora.')
    error.code = 'NO_SCOPE_TABLE'
    throw error
  }
  const predicateValues = allowedRegAns.map((value) => `'${value}'`).join(', ')
  const predicate = `REGEXP_REPLACE(CAST(reg_ans AS STRING), r'\\D', '') IN (${predicateValues})`
  const uniqueRefs = Array.from(new Set(tableRefs))
  const aclCtes = uniqueRefs.map((tableRef, index) => {
    const cteName = `__acl_src_${index}`
    return {
      tableRef,
      cteName,
      expression: `${cteName} AS (SELECT * FROM ${formatTableRef(tableRef)} WHERE ${predicate})`,
    }
  })
  let scopedSql = sql
  aclCtes.forEach(({ tableRef, cteName }) => {
    scopedSql = replaceTableRefInSql(scopedSql, tableRef, cteName)
  })
  return prependAclCtes(
    scopedSql,
    aclCtes.map((item) => item.expression),
  )
}

function hasOperatorUploadAccess(accessContext = {}, regAns) {
  if (!accessContext?.enforced || accessContext?.isAdmin) return true
  const normalizedRegAns = normalizeRegAns(regAns)
  if (!normalizedRegAns) return false
  return (accessContext.canUploadRegAns ?? []).includes(normalizedRegAns)
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

app.get('/api/auth/profile', (req, res) => {
  const accessContext = req.accessContext ?? {
    enforced: ENFORCE_USER_ACCESS,
    isAdmin: false,
    operators: [],
    allowedRegAns: [],
    canUploadRegAns: [],
  }
  const payload = {
    uid: req.user?.uid ?? null,
    email: req.user?.email ?? null,
    enforced: accessContext.enforced,
    isAdmin: accessContext.isAdmin,
    operators: accessContext.operators ?? [],
    allowedRegAns: accessContext.allowedRegAns ?? [],
    canUploadRegAns: accessContext.canUploadRegAns ?? [],
    noAccess: accessContext.enforced && !accessContext.isAdmin && !(accessContext.allowedRegAns ?? []).length,
  }
  res.setHeader('Cache-Control', 'no-store')
  res.json(payload)
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
  const fileName = toNullableString(req.body?.fileName) ?? 'upload.csv'
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
  const cteNames = extractCteNames(sanitized)
  const tableRefs = extractTableRefs(sanitized, cteNames)
  const disallowed = [...tableRefs].filter((ref) => !ALLOWED_TABLES.has(ref))
  if (disallowed.length) {
    return res.status(403).json({
      error: 'Consulta bloqueada. Acesso permitido apenas às views/tabelas autorizadas.',
      tables: disallowed,
    })
  }
  let scopedSql = sanitized
  try {
    scopedSql = applyUserAccessScopeToSql(sanitized, req.accessContext)
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

app.listen(PORT, HOST, () => {
  const publicHost = HOST === '0.0.0.0' ? 'localhost' : HOST
  console.log(`[server] API disponível em http://${publicHost}:${PORT} (bind ${HOST})`)
})
