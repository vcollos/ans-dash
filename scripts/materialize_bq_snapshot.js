import { BigQuery } from '@google-cloud/bigquery'

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const DATASET_ID = process.env.BQ_DATASET ?? 'dash_ans'
const MART_DATASET_ID = process.env.BQ_MART_DATASET ?? 'dash_ans'
const SOURCE_VIEW = process.env.BQ_SOURCE_VIEW ?? `${MART_DATASET_ID}.indicadores_curados`
const TARGET_TABLE = process.env.BQ_SNAPSHOT_TABLE ?? `${MART_DATASET_ID}.indicadores_curados_snapshot`
const LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'

function qualify(name, datasetId = DATASET_ID) {
  if (!name) {
    throw new Error('Tabela de origem/destino não informada.')
  }
  if (name.includes('`')) return name
  if (name.includes('.')) return `\`${name}\``
  return `\`${PROJECT_ID}.${datasetId}.${name}\``
}

async function materializeSnapshot() {
  const bigquery = new BigQuery({ projectId: PROJECT_ID })
  const source = qualify(SOURCE_VIEW, MART_DATASET_ID)
  const target = qualify(TARGET_TABLE, MART_DATASET_ID)
  const normalizedTarget = String(TARGET_TABLE).trim().replace(/^`|`$/g, '')
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
  })
  const tableType = existingRows?.[0]?.table_type ?? null
  if (tableType === 'BASE TABLE') {
    await bigquery.query({ query: `DROP TABLE ${target}`, location: LOCATION })
  } else if (tableType === 'VIEW') {
    await bigquery.query({ query: `DROP VIEW ${target}`, location: LOCATION })
  }
  const query = `
CREATE VIEW ${target} AS
SELECT *
FROM ${source}
`
  console.log(`[bq-snapshot] Garantindo view ${TARGET_TABLE} a partir de ${SOURCE_VIEW}...`)
  await bigquery.query({ query, location: LOCATION })
  console.log('[bq-snapshot] View criada/atualizada com sucesso.')
}

materializeSnapshot().catch((err) => {
  console.error('[bq-snapshot] Falha ao materializar snapshot', err)
  process.exit(1)
})
