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
const SOURCE_TABLE =
  process.env.BQ_SOURCE_TABLE ?? process.env.BQ_DATASET_VIEW ?? `${MART_DATASET_ID}.indicadores_curados_snapshot`
const ANS_TABLE = process.env.BQ_MART_ANS_TABLE ?? 'indicadores_mart_ans'
const UNIODONTO_TABLE = process.env.BQ_MART_UNIODONTO_TABLE ?? 'indicadores_mart_uniodonto'
const PARTITION_EXPR = process.env.BQ_PARTITION_EXPR ?? process.env.BQ_PARTITION_FIELD ?? 'periodo_raw'
const CLUSTER_FIELDS = (process.env.BQ_CLUSTER_FIELDS ?? 'periodo_id,reg_ans,modalidade,uniodonto')
  .split(',')
  .map((field) => field.trim())
  .filter(Boolean)
const BQ_MAX_BYTES_BILLED = parseBytesLimit(process.env.BQ_MAX_BYTES_BILLED, 1_073_741_824)
const SHOULD_EXECUTE = process.env.BQ_EXECUTE === 'true'
const SHOULD_REPLACE_EXISTING = process.env.BQ_REPLACE_EXISTING === 'true'

const QUERY_PATH = process.env.MART_SQL_PATH
  ? path.resolve(process.cwd(), process.env.MART_SQL_PATH)
  : path.resolve(__dirname, '../db/materialize_indicadores_mart.sql')

function formatTableRef(name, datasetId = DATASET_ID) {
  if (!name) return name
  if (name.includes('`')) return name
  if (name.includes('.')) return `\`${name}\``
  return `\`${PROJECT_ID}.${datasetId}.${name}\``
}

function normalizeTableRef(name, datasetId = DATASET_ID) {
  const normalized = String(name ?? '')
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/^"|"$/g, '')
  if (!normalized) {
    throw new Error('Referencia de tabela/view vazia.')
  }
  const parts = normalized.split('.').filter(Boolean)
  if (parts.length === 1) return { projectId: PROJECT_ID, datasetId, objectId: parts[0] }
  if (parts.length === 2) return { projectId: PROJECT_ID, datasetId: parts[0], objectId: parts[1] }
  return { projectId: parts[0], datasetId: parts[1], objectId: parts[2] }
}

function parseBytesLimit(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

function formatBytes(bytes) {
  const numeric = Number(bytes)
  if (!Number.isFinite(numeric)) return 'desconhecido'
  if (numeric < 1024) return `${numeric} B`
  if (numeric < 1024 ** 2) return `${(numeric / 1024).toFixed(2)} KiB`
  if (numeric < 1024 ** 3) return `${(numeric / 1024 ** 2).toFixed(2)} MiB`
  return `${(numeric / 1024 ** 3).toFixed(2)} GiB`
}

function assertWithinBytesLimit(bytes, label) {
  if (!Number.isFinite(BQ_MAX_BYTES_BILLED) || BQ_MAX_BYTES_BILLED <= 0) return
  if (Number(bytes) > BQ_MAX_BYTES_BILLED) {
    throw new Error(
      `${label} excede BQ_MAX_BYTES_BILLED=${BQ_MAX_BYTES_BILLED} (${formatBytes(BQ_MAX_BYTES_BILLED)}). ` +
        `Estimado: ${bytes} (${formatBytes(bytes)}).`,
    )
  }
}

async function dryRunQuery(bigquery, query, label) {
  const [job] = await bigquery.createQueryJob({
    query,
    location: LOCATION,
    dryRun: true,
    useQueryCache: false,
    maximumBytesBilled:
      Number.isFinite(BQ_MAX_BYTES_BILLED) && BQ_MAX_BYTES_BILLED > 0
        ? String(Math.trunc(BQ_MAX_BYTES_BILLED))
        : undefined,
    defaultDataset: { projectId: PROJECT_ID, datasetId: DATASET_ID },
  })
  const bytes = Number(job.metadata?.statistics?.totalBytesProcessed ?? job.metadata?.statistics?.query?.totalBytesProcessed ?? 0)
  console.log(`[bq-mart] dry-run ${label}: ${bytes} bytes (${formatBytes(bytes)})`)
  assertWithinBytesLimit(bytes, label)
  return bytes
}

async function estimateMartQuery(bigquery, query) {
  try {
    return await dryRunQuery(bigquery, query, `${ANS_TABLE} + ${UNIODONTO_TABLE}`)
  } catch (err) {
    console.warn('[bq-mart] dry-run do DDL completo falhou; estimando leitura da origem.', err?.message ?? err)
    const sourceBytes = await dryRunQuery(
      bigquery,
      `SELECT * FROM ${formatTableRef(SOURCE_TABLE, DATASET_ID)}`,
      SOURCE_TABLE,
    )
    const estimatedBytes = sourceBytes * 2
    console.log(`[bq-mart] estimativa conservadora para duas marts: ${estimatedBytes} bytes (${formatBytes(estimatedBytes)})`)
    assertWithinBytesLimit(estimatedBytes, `${ANS_TABLE} + ${UNIODONTO_TABLE}`)
    return estimatedBytes
  }
}

async function getObjectType(bigquery, name, datasetId = DATASET_ID) {
  const ref = normalizeTableRef(name, datasetId)
  const [rows] = await bigquery.query({
    query: `
      SELECT table_type
      FROM \`${ref.projectId}.${ref.datasetId}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name = @tableName
      LIMIT 1
    `,
    location: LOCATION,
    params: { tableName: ref.objectId },
    maximumBytesBilled:
      Number.isFinite(BQ_MAX_BYTES_BILLED) && BQ_MAX_BYTES_BILLED > 0
        ? String(Math.trunc(BQ_MAX_BYTES_BILLED))
        : undefined,
  })
  return rows?.[0]?.table_type ?? null
}

async function dropObjectIfAllowed(bigquery, name, datasetId = DATASET_ID) {
  const tableType = await getObjectType(bigquery, name, datasetId)
  if (!tableType) return
  if (!SHOULD_REPLACE_EXISTING) {
    throw new Error(`${name} ja existe como ${tableType}. Defina BQ_REPLACE_EXISTING=true junto de BQ_EXECUTE=true para substituir.`)
  }
  if (tableType === 'BASE TABLE') {
    await bigquery.query({ query: `DROP TABLE ${formatTableRef(name, datasetId)}`, location: LOCATION })
  } else if (tableType === 'VIEW') {
    await bigquery.query({ query: `DROP VIEW ${formatTableRef(name, datasetId)}`, location: LOCATION })
  }
}

function applyTemplate(template) {
  const clusterValue = CLUSTER_FIELDS.length ? CLUSTER_FIELDS.join(', ') : ''
  if (!clusterValue) {
    throw new Error('BQ_CLUSTER_FIELDS nao pode ficar vazio para este script.')
  }
  return template
    .replaceAll('{{SOURCE_TABLE}}', formatTableRef(SOURCE_TABLE, DATASET_ID))
    .replaceAll('{{ANS_TABLE}}', formatTableRef(ANS_TABLE, MART_DATASET_ID))
    .replaceAll('{{UNIODONTO_TABLE}}', formatTableRef(UNIODONTO_TABLE, MART_DATASET_ID))
    .replaceAll('{{PARTITION_EXPR}}', PARTITION_EXPR)
    .replaceAll('{{CLUSTER_FIELDS}}', clusterValue)
}

async function materializeMart() {
  const queryTemplate = fs.readFileSync(QUERY_PATH, 'utf8').trim().replace(/;\s*$/, '')
  const query = applyTemplate(queryTemplate)
  const bigquery = new BigQuery({ projectId: PROJECT_ID })
  await estimateMartQuery(bigquery, query)
  if (!SHOULD_EXECUTE) {
    console.log('[bq-mart] Dry-run concluido. Nenhuma tabela foi criada. Defina BQ_EXECUTE=true para executar.')
    return
  }
  await dropObjectIfAllowed(bigquery, ANS_TABLE, MART_DATASET_ID)
  await dropObjectIfAllowed(bigquery, UNIODONTO_TABLE, MART_DATASET_ID)
  console.log('[bq-mart] Criando tabelas de indicadores (ANS + Uniodonto)...')
  await bigquery.query({
    query,
    location: LOCATION,
    defaultDataset: { projectId: PROJECT_ID, datasetId: DATASET_ID },
    maximumBytesBilled:
      Number.isFinite(BQ_MAX_BYTES_BILLED) && BQ_MAX_BYTES_BILLED > 0
        ? String(Math.trunc(BQ_MAX_BYTES_BILLED))
        : undefined,
  })
  console.log('[bq-mart] Tabelas criadas/atualizadas com sucesso.')
}

materializeMart().catch((err) => {
  console.error('[bq-mart] Falha ao materializar tabelas', err)
  process.exit(1)
})
