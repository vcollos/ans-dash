import { BigQuery } from '@google-cloud/bigquery'

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const DATASET_ID = process.env.BQ_DATASET ?? 'dash_ans'
const MART_DATASET_ID = process.env.BQ_MART_DATASET ?? 'dash_ans'
const SOURCE_VIEW = process.env.BQ_SOURCE_VIEW ?? `${MART_DATASET_ID}.indicadores_curados`
const TARGET_TABLE = process.env.BQ_SNAPSHOT_TABLE ?? `${MART_DATASET_ID}.indicadores_curados_snapshot`
const LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'
const PARTITION_EXPR = process.env.BQ_PARTITION_EXPR ?? process.env.BQ_PARTITION_FIELD ?? 'periodo_raw'
const CLUSTER_FIELDS = (process.env.BQ_CLUSTER_FIELDS ?? 'periodo_id,reg_ans,modalidade,uniodonto')
  .split(',')
  .map((field) => field.trim())
  .filter(Boolean)
const BQ_MAX_BYTES_BILLED = parseBytesLimit(process.env.BQ_MAX_BYTES_BILLED, 1_073_741_824)
const SHOULD_EXECUTE = process.env.BQ_EXECUTE === 'true'
const SHOULD_REPLACE_EXISTING = process.env.BQ_REPLACE_EXISTING === 'true'

function qualify(name, datasetId = DATASET_ID) {
  if (!name) {
    throw new Error('Tabela de origem/destino não informada.')
  }
  if (name.includes('`')) return name
  if (name.includes('.')) return `\`${name}\``
  return `\`${PROJECT_ID}.${datasetId}.${name}\``
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
    defaultDataset: {
      projectId: PROJECT_ID,
      datasetId: DATASET_ID,
    },
  })
  const bytes = Number(job.metadata?.statistics?.totalBytesProcessed ?? job.metadata?.statistics?.query?.totalBytesProcessed ?? 0)
  console.log(`[bq-snapshot] dry-run ${label}: ${bytes} bytes (${formatBytes(bytes)})`)
  assertWithinBytesLimit(bytes, label)
  return bytes
}

async function estimateSnapshotQuery(bigquery, query, source) {
  try {
    return await dryRunQuery(bigquery, query, TARGET_TABLE)
  } catch (err) {
    console.warn('[bq-snapshot] dry-run do DDL completo falhou; estimando leitura da origem.', err?.message ?? err)
    return dryRunQuery(bigquery, `SELECT * FROM ${source}`, SOURCE_VIEW)
  }
}

async function getObjectType(bigquery, targetName) {
  const normalizedTarget = String(targetName).trim().replace(/^`|`$/g, '')
  const targetParts = normalizedTarget.includes('.')
    ? normalizedTarget.split('.').filter(Boolean)
    : [PROJECT_ID, MART_DATASET_ID, normalizedTarget]
  const [projectId, datasetId, objectId] =
    targetParts.length === 3 ? targetParts : [PROJECT_ID, targetParts[0], targetParts[1]]
  const [existingRows] = await bigquery.query({
    query: `
      SELECT table_type
      FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name = @tableName
      LIMIT 1
    `,
    location: LOCATION,
    params: { tableName: objectId },
    maximumBytesBilled:
      Number.isFinite(BQ_MAX_BYTES_BILLED) && BQ_MAX_BYTES_BILLED > 0
        ? String(Math.trunc(BQ_MAX_BYTES_BILLED))
        : undefined,
  })
  return existingRows?.[0]?.table_type ?? null
}

async function dropObjectIfAllowed(bigquery, target, targetName) {
  const tableType = await getObjectType(bigquery, targetName)
  if (!tableType) return
  if (!SHOULD_REPLACE_EXISTING) {
    throw new Error(
      `${targetName} ja existe como ${tableType}. Defina BQ_REPLACE_EXISTING=true junto de BQ_EXECUTE=true para substituir.`,
    )
  }
  if (tableType === 'BASE TABLE') {
    await bigquery.query({ query: `DROP TABLE ${target}`, location: LOCATION })
  } else if (tableType === 'VIEW') {
    await bigquery.query({ query: `DROP VIEW ${target}`, location: LOCATION })
  }
}

async function materializeSnapshot() {
  const bigquery = new BigQuery({ projectId: PROJECT_ID })
  const source = qualify(SOURCE_VIEW, MART_DATASET_ID)
  const target = qualify(TARGET_TABLE, MART_DATASET_ID)
  const clusterValue = CLUSTER_FIELDS.join(', ')
  if (!clusterValue) {
    throw new Error('BQ_CLUSTER_FIELDS nao pode ficar vazio para este script.')
  }
  const query = `
CREATE OR REPLACE TABLE ${target}
PARTITION BY ${PARTITION_EXPR}
CLUSTER BY ${clusterValue}
AS
SELECT *
FROM ${source}
`
  await estimateSnapshotQuery(bigquery, query, source)
  if (!SHOULD_EXECUTE) {
    console.log('[bq-snapshot] Dry-run concluido. Nenhuma tabela foi criada. Defina BQ_EXECUTE=true para executar.')
    return
  }
  await dropObjectIfAllowed(bigquery, target, TARGET_TABLE)
  console.log(`[bq-snapshot] Criando tabela ${TARGET_TABLE} a partir de ${SOURCE_VIEW}...`)
  await bigquery.query({
    query,
    location: LOCATION,
    maximumBytesBilled:
      Number.isFinite(BQ_MAX_BYTES_BILLED) && BQ_MAX_BYTES_BILLED > 0
        ? String(Math.trunc(BQ_MAX_BYTES_BILLED))
        : undefined,
  })
  console.log('[bq-snapshot] Tabela criada/atualizada com sucesso.')
}

materializeSnapshot().catch((err) => {
  console.error('[bq-snapshot] Falha ao materializar snapshot', err)
  process.exit(1)
})
