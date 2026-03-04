import { BigQuery } from '@google-cloud/bigquery'

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const DATASET_ID = process.env.BQ_DATASET ?? 'datalake_ans'
const MART_DATASET_ID = process.env.BQ_MART_DATASET ?? 'dash_ans'
const SOURCE_VIEW = process.env.BQ_SOURCE_VIEW ?? `${MART_DATASET_ID}.indicadores_curados`
const TARGET_TABLE = process.env.BQ_SNAPSHOT_TABLE ?? `${MART_DATASET_ID}.indicadores_curados_snapshot`
const LOCATION = process.env.BQ_LOCATION ?? 'US'
const PARTITION_EXPR = process.env.BQ_PARTITION_EXPR ?? process.env.BQ_PARTITION_FIELD ?? 'periodo_raw'
const CLUSTER_FIELDS = (process.env.BQ_CLUSTER_FIELDS ?? 'periodo_id,reg_ans,modalidade,uniodonto')
  .split(',')
  .map((field) => field.trim())
  .filter(Boolean)
  .slice(0, 4)

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
  const clusterClause = CLUSTER_FIELDS.length ? `\nCLUSTER BY ${CLUSTER_FIELDS.join(', ')}` : ''
  const query = `
CREATE OR REPLACE TABLE ${target}
PARTITION BY ${PARTITION_EXPR}${clusterClause}
AS
SELECT *
FROM ${source}
`
  console.log(`[bq-snapshot] Materializando ${TARGET_TABLE} a partir de ${SOURCE_VIEW}...`)
  await bigquery.query({ query, location: LOCATION })
  console.log('[bq-snapshot] Snapshot criado/atualizado com sucesso.')
}

materializeSnapshot().catch((err) => {
  console.error('[bq-snapshot] Falha ao materializar snapshot', err)
  process.exit(1)
})
