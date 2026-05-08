import { execFileSync } from 'node:child_process'

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'
const DATASETS = (process.env.BQ_INVENTORY_DATASETS ?? 'dash_ans,datalake_ans,dash_ans_historico,dash_ans_uploads')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

const ACTIVE_OBJECTS = new Set([
  'dash_ans.indicadores_curados_snapshot_consolidado',
  'dash_ans.indicadores_mart_ans_consolidado',
  'dash_ans.indicadores_mart_uniodonto_consolidado',
  'dash_ans.prestadores_ativos_uniodonto_origem',
  'dash_ans.demonstracoes_contabeis',
  'dash_ans.demonstracoes_contabeis_auxiliar',
  'dash_ans.vw_demonstracoes_contabeis_auxiliar_latest',
  'dash_ans.vw_demonstracoes_contabeis_consolidada',
  'datalake_ans.beneficiarios_odontologicas_por_operadora',
  'datalake_ans.vw_demonstracoes_contabeis_norm',
])

const LEGACY_PATTERNS = [
  /legacy/i,
  /supabase/i,
  /postgres/i,
  /sqlite/i,
  /upload/i,
  /auxiliar/i,
  /snapshot$/,
  /indicadores_mart_(ans|uniodonto)$/,
  /indicadores_curados$/,
]

function runJson(args) {
  const stdout = execFileSync('bq', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return JSON.parse(stdout)
}

function runText(args) {
  return execFileSync('bq', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function classify(datasetId, tableId) {
  const key = `${datasetId}.${tableId}`
  if (ACTIVE_OBJECTS.has(key)) return 'ativo'
  if (datasetId === 'dash_ans_historico') return 'historico'
  if (datasetId === 'datalake_ans') return 'origem-canonica-ou-revisar'
  if (datasetId === 'dash_ans_uploads') return 'historico-ou-revisar'
  if (LEGACY_PATTERNS.some((pattern) => pattern.test(tableId))) return 'suspeito-legado'
  return 'revisar'
}

function datasetLocation(datasetId) {
  try {
    return runJson(['--quiet=true', 'show', '--format=json', `${PROJECT_ID}:${datasetId}`]).location ?? null
  } catch (err) {
    return `erro: ${err?.stderr?.toString?.().trim() || err?.message || String(err)}`
  }
}

function listObjects(datasetId) {
  const query = `
    SELECT
      table_name,
      table_type,
      creation_time
    FROM \`${PROJECT_ID}.${datasetId}.INFORMATION_SCHEMA.TABLES\`
    ORDER BY table_name
  `
  try {
    return runJson([
      '--quiet=true',
      'query',
      '--format=json',
      `--location=${LOCATION}`,
      '--use_legacy_sql=false',
      query,
    ])
  } catch (err) {
    return [{ table_name: null, table_type: 'ERROR', error: err?.stderr?.toString?.().trim() || err?.message || String(err) }]
  }
}

function validateQuery() {
  try {
    runText(['--quiet=true', 'query', `--location=${LOCATION}`, '--use_legacy_sql=false', 'SELECT 1 AS ok'])
    return true
  } catch {
    return false
  }
}

console.log(`# Inventario BigQuery (${PROJECT_ID}, location=${LOCATION})`)
console.log(`validacao_query: ${validateQuery() ? 'ok' : 'erro'}`)

for (const datasetId of DATASETS) {
  const location = datasetLocation(datasetId)
  console.log(`\n## ${datasetId}`)
  console.log(`location: ${location}`)
  if (String(location).startsWith('erro:')) {
    console.log('status: ausente-ou-inacessivel')
    continue
  }
  const rows = listObjects(datasetId)
  console.log('| objeto | tipo | criado_em | classificacao |')
  console.log('|---|---:|---:|---|')
  for (const row of rows) {
    if (row.error) {
      console.log(`| erro | ${row.table_type} |  | ${String(row.error).replaceAll('|', '/')} |`)
      continue
    }
    const name = row.table_name ?? ''
    console.log(
      `| ${name} | ${row.table_type ?? ''} | ${row.creation_time?.value ?? row.creation_time ?? ''} | ${classify(datasetId, name)} |`,
    )
  }
}
