import { BigQuery } from '@google-cloud/bigquery'

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const SOURCE_DATASET_ID = process.env.BQ_SOURCE_DATASET ?? 'ans_curated'
const SOURCE_VIEW = process.env.BQ_SOURCE_NORM_VIEW ?? 'vw_demonstracoes_contabeis_norm'
const TARGET_DATASET_ID = process.env.BQ_DATASET ?? 'dash_ans'
const TARGET_TABLE = process.env.BQ_BASE_DEMONSTRACOES_TABLE ?? `${TARGET_DATASET_ID}.demonstracoes_contabeis`
const TARGET_RAW_VIEW = process.env.BQ_BASE_RAW_VIEW ?? `${TARGET_DATASET_ID}.demonstracoes_contabeis_raw`
const SOURCE_RAW_TABLE = process.env.BQ_SOURCE_RAW_TABLE ?? `${PROJECT_ID}.datalake_ans.demonstracoes_contabeis_raw`
const LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'

function qualify(name, defaultDataset = TARGET_DATASET_ID) {
  if (!name) {
    throw new Error('Nome de tabela/view nao informado.')
  }
  if (name.includes('`')) return name
  if (name.includes('.')) return `\`${name}\``
  return `\`${PROJECT_ID}.${defaultDataset}.${name}\``
}

function normalizeRef(name, defaultDataset = TARGET_DATASET_ID) {
  const normalized = String(name ?? '')
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/^"|"$/g, '')
  if (!normalized) {
    throw new Error('Nome de tabela/view nao informado.')
  }
  const parts = normalized.split('.').filter(Boolean)
  if (parts.length === 1) return { projectId: PROJECT_ID, datasetId: defaultDataset, objectId: parts[0] }
  if (parts.length === 2) return { projectId: PROJECT_ID, datasetId: parts[0], objectId: parts[1] }
  return { projectId: parts[0], datasetId: parts[1], objectId: parts[2] }
}

async function dropObjectIfExists(bigquery, name, defaultDataset = TARGET_DATASET_ID) {
  const ref = normalizeRef(name, defaultDataset)
  const [rows] = await bigquery.query({
    query: `
      SELECT table_type
      FROM \`${ref.projectId}.${ref.datasetId}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name = @tableName
      LIMIT 1
    `,
    location: LOCATION,
    params: { tableName: ref.objectId },
  })
  const tableType = rows?.[0]?.table_type ?? null
  if (tableType === 'BASE TABLE') {
    await bigquery.query({ query: `DROP TABLE ${qualify(name, defaultDataset)}`, location: LOCATION })
  } else if (tableType === 'VIEW') {
    await bigquery.query({ query: `DROP VIEW ${qualify(name, defaultDataset)}`, location: LOCATION })
  }
}

const RN518_CATEGORY_BY_GROUP = {
  '12': 'ATIVO_CIRCULANTE',
  '13': 'ATIVO_NAO_CIRCULANTE',
  '21': 'PASSIVO_CIRCULANTE',
  '23': 'PASSIVO_NAO_CIRCULANTE',
  '25': 'PATRIMONIO_LIQUIDO',
  '31': 'RECEITA_PLANO',
  '33': 'OUTRAS_RECEITAS',
  '35': 'RECEITA_FINANCEIRA',
  '36': 'RECEITA_PATRIMONIAL',
  '41': 'DESP_ASSISTENCIAIS',
  '43': 'DESP_COMERCIAIS',
  '44': 'DESP_OPERACIONAIS',
  '45': 'DESP_FINANCEIRAS',
  '46': 'DESP_ADMINISTRATIVAS',
  '47': 'DESP_PATRIMONIAIS',
}

function buildRn518CategoryCase() {
  const whenClauses = Object.entries(RN518_CATEGORY_BY_GROUP)
    .map(([group, category]) => `WHEN grupo = '${group}' THEN '${category}'`)
    .join('\n      ')

  return `
    CASE
      ${whenClauses}
      ELSE 'NAO_CLASSIFICADO'
    END
  `.trim()
}

async function refreshBaseView() {
  const bigquery = new BigQuery({ projectId: PROJECT_ID })
  const source = qualify(SOURCE_VIEW, SOURCE_DATASET_ID)
  const target = qualify(TARGET_TABLE, TARGET_DATASET_ID)
  const sourceRaw = qualify(SOURCE_RAW_TABLE, SOURCE_DATASET_ID)
  const targetRaw = qualify(TARGET_RAW_VIEW, TARGET_DATASET_ID)
  const rn518CategoryCase = buildRn518CategoryCase()

  const query = `
CREATE VIEW ${target} AS
WITH source AS (
  SELECT
    CAST(reg_ans AS STRING) AS reg_ans,
    SAFE_CAST(ano_competencia AS INT64) AS ano,
    SAFE_CAST(trimestre_competencia AS INT64) AS trimestre,
    CAST(cd_conta_contabil AS STRING) AS cd_conta_contabil,
    CAST(descricao AS STRING) AS descricao,
    SAFE_CAST(vl_saldo_final AS FLOAT64) AS valor
  FROM ${source}
  WHERE reg_ans IS NOT NULL
    AND ano_competencia IS NOT NULL
    AND trimestre_competencia IS NOT NULL
    AND cd_conta_contabil IS NOT NULL
),
classified AS (
  SELECT
    reg_ans,
    ano,
    trimestre,
    cd_conta_contabil,
    descricao,
    valor,
    SUBSTR(cd_conta_contabil, 1, 1) AS classe,
    SUBSTR(cd_conta_contabil, 1, LEAST(LENGTH(cd_conta_contabil), 2)) AS grupo,
    SUBSTR(cd_conta_contabil, 1, LEAST(LENGTH(cd_conta_contabil), 3)) AS subgrupo
  FROM source
)
SELECT
  reg_ans,
  ano,
  trimestre,
  cd_conta_contabil,
  descricao,
  valor,
  classe,
  grupo,
  subgrupo,
  CASE classe
    WHEN '1' THEN 'ATIVO'
    WHEN '2' THEN 'PASSIVO'
    WHEN '3' THEN 'RECEITA'
    WHEN '4' THEN 'DESPESA'
    WHEN '6' THEN 'IMPOSTOS'
    WHEN '7' THEN 'OUTROS'
    ELSE 'NAO_CLASSIFICADO'
  END AS classe_normativa,
  ${rn518CategoryCase} AS categoria_rn518,
  CAST(NULL AS STRING) AS operadora,
  CAST(NULL AS STRING) AS modalidade,
  CAST(NULL AS STRING) AS uniodonto,
  CAST(NULL AS STRING) AS ativa,
  CAST(NULL AS INT64) AS beneficiarios,
  CAST(NULL AS STRING) AS porte,
  CAST(NULL AS INT64) AS Prestadores,
  CAST(NULL AS STRING) AS Singular
FROM classified
`
  const rawQuery = `CREATE VIEW ${targetRaw} AS SELECT * FROM ${sourceRaw}`

  await dropObjectIfExists(bigquery, TARGET_TABLE, TARGET_DATASET_ID)
  await dropObjectIfExists(bigquery, TARGET_RAW_VIEW, TARGET_DATASET_ID)
  console.log(`[bq-base] Garantindo views ${TARGET_TABLE} e ${TARGET_RAW_VIEW} a partir de ${SOURCE_DATASET_ID}...`)
  await bigquery.query({ query, location: LOCATION })
  await bigquery.query({ query: rawQuery, location: LOCATION })
  console.log('[bq-base] Views de compatibilidade criadas/atualizadas com sucesso.')
}

refreshBaseView().catch((error) => {
  console.error('[bq-base] Falha ao atualizar views de demonstracoes', error)
  process.exit(1)
})
