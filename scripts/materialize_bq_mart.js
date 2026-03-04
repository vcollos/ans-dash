import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const DATASET_ID = process.env.BQ_DATASET ?? 'datalake_ans'
const MART_DATASET_ID = process.env.BQ_MART_DATASET ?? 'dash_ans'
const LOCATION = process.env.BQ_LOCATION ?? 'US'
const SOURCE_TABLE =
  process.env.BQ_SOURCE_TABLE ?? process.env.BQ_DATASET_VIEW ?? `${MART_DATASET_ID}.indicadores_curados_snapshot`
const ANS_TABLE = process.env.BQ_MART_ANS_TABLE ?? 'indicadores_mart_ans'
const UNIODONTO_TABLE = process.env.BQ_MART_UNIODONTO_TABLE ?? 'indicadores_mart_uniodonto'
const PARTITION_EXPR = process.env.BQ_PARTITION_EXPR ?? process.env.BQ_PARTITION_FIELD ?? 'periodo_raw'
const CLUSTER_FIELDS = (process.env.BQ_CLUSTER_FIELDS ?? 'periodo_id,reg_ans,modalidade,uniodonto')
  .split(',')
  .map((field) => field.trim())
  .filter(Boolean)

const QUERY_PATH = process.env.MART_SQL_PATH
  ? path.resolve(process.cwd(), process.env.MART_SQL_PATH)
  : path.resolve(__dirname, '../db/materialize_indicadores_mart.sql')

function formatTableRef(name, datasetId = DATASET_ID) {
  if (!name) return name
  if (name.includes('`')) return name
  if (name.includes('.')) return `\`${name}\``
  return `\`${PROJECT_ID}.${datasetId}.${name}\``
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
  console.log('[bq-mart] Materializando tabelas de indicadores (ANS + Uniodonto)...')
  await bigquery.query({ query, location: LOCATION, defaultDataset: { projectId: PROJECT_ID, datasetId: DATASET_ID } })
  console.log('[bq-mart] Tabelas materializadas com sucesso.')
}

materializeMart().catch((err) => {
  console.error('[bq-mart] Falha ao materializar tabelas', err)
  process.exit(1)
})
