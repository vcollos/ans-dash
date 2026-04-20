import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const DATASET_ID = process.env.BQ_DATASET ?? 'dash_ans'
const MART_DATASET_ID = process.env.BQ_MART_DATASET ?? 'dash_ans'
const LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'
const BQ_EXPORT_VIEW =
  process.env.BQ_EXPORT_VIEW ?? process.env.BQ_DATASET_VIEW ?? `${MART_DATASET_ID}.indicadores_curados_snapshot`
const BQ_PRESTADORES_TABLE =
  process.env.BQ_PRESTADORES_TABLE ?? `${PROJECT_ID}.${MART_DATASET_ID}.prestadores_ativos_uniodonto_origem`

const QUERY_PATH = process.env.EXPORT_SQL_PATH
  ? path.resolve(process.cwd(), process.env.EXPORT_SQL_PATH)
  : path.resolve(__dirname, '../db/export_indicadores.sql')

const OUTPUT_PATH = process.env.OUTPUT_PATH
  ? path.resolve(process.cwd(), process.env.OUTPUT_PATH)
  : path.resolve(__dirname, '../public/data/indicadores.csv')

function formatTableRef(name) {
  if (!name) return name
  if (name.includes('`')) return name
  return `\`${name}\``
}

function resolveTableRef(name, defaultDataset = MART_DATASET_ID) {
  const normalized = String(name ?? '')
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/^"|"$/g, '')
  if (!normalized) {
    throw new Error('Referencia de tabela/view vazia para exportacao.')
  }
  const parts = normalized.split('.').filter(Boolean)
  if (parts.length === 1) {
    return `${PROJECT_ID}.${defaultDataset}.${parts[0]}`
  }
  if (parts.length === 2) {
    return `${PROJECT_ID}.${parts[0]}.${parts[1]}`
  }
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

function formatCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
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

async function main() {
  const queryTemplate = fs.readFileSync(QUERY_PATH, 'utf8').trim().replace(/;[\s]*$/, '')
  const exportViewRef = resolveTableRef(BQ_EXPORT_VIEW, MART_DATASET_ID)
  const prestadoresTableRef = resolveTableRef(BQ_PRESTADORES_TABLE, MART_DATASET_ID)
  const queryText = queryTemplate
    .replaceAll('{{DATASET_VIEW}}', formatTableRef(exportViewRef))
    .replaceAll('{{PRESTADORES_TABLE}}', formatTableRef(prestadoresTableRef))
  const bigquery = new BigQuery({ projectId: PROJECT_ID })
  console.log(`[export-bq] Exportando indicadores via BigQuery -> ${OUTPUT_PATH}`)
  const [rows] = await bigquery.query({
    query: queryText,
    location: LOCATION,
    defaultDataset: { projectId: PROJECT_ID, datasetId: DATASET_ID },
  })
  const normalized = rows.map((row) => normalizeBigQueryScalar(row))
  const csv = buildCsv(normalized)
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, csv, 'utf8')
  console.log(`[export-bq] OK: ${normalized.length} linhas`)
}

main().catch((err) => {
  console.error('[export-bq] Falha ao exportar indicadores', err?.message ?? err)
  process.exit(1)
})
