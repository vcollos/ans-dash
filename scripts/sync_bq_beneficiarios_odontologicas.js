import { BigQuery } from '@google-cloud/bigquery'

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const DATASET_ID = process.env.BQ_DATASET ?? 'dash_ans'
const SOURCE_VIEW =
  process.env.BQ_BENEFICIARIOS_ODONTO_SOURCE ??
  'bigdata-467917.datalake_ans.beneficiarios_odontologicas_por_operadora'
const TARGET_TABLE =
  process.env.BQ_BENEFICIARIOS_ODONTO_TABLE ??
  `${PROJECT_ID}.${DATASET_ID}.beneficiarios_odontologicas_por_operadora`
const LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'

function tableRef(name, defaultDataset = DATASET_ID) {
  const normalized = String(name ?? '').trim().replace(/^`|`$/g, '')
  if (!normalized) throw new Error('Referencia de tabela/view vazia.')
  if (normalized.includes('.')) return `\`${normalized}\``
  return `\`${PROJECT_ID}.${defaultDataset}.${normalized}\``
}

const source = tableRef(SOURCE_VIEW, 'datalake_ans')
const target = tableRef(TARGET_TABLE, DATASET_ID)

const porteCase = `
  CASE LOWER(TRIM(CAST(porte_operadora AS STRING)))
    WHEN 'pequeno' THEN 'Pequeno Porte'
    WHEN 'medio' THEN 'Médio Porte'
    WHEN 'médio' THEN 'Médio Porte'
    WHEN 'grande' THEN 'Grande Porte'
    ELSE CASE
      WHEN SAFE_CAST(beneficiarios_total AS INT64) IS NULL THEN NULL
      WHEN SAFE_CAST(beneficiarios_total AS INT64) <= 19999 THEN 'Pequeno Porte'
      WHEN SAFE_CAST(beneficiarios_total AS INT64) <= 99999 THEN 'Médio Porte'
      ELSE 'Grande Porte'
    END
  END
`

async function syncBeneficiariosOdontologicas() {
  const bigquery = new BigQuery({ projectId: PROJECT_ID })

  await bigquery.query({
    location: LOCATION,
    query: `
      CREATE TABLE IF NOT EXISTS ${target} (
        Operadora STRING,
        Periodo DATE,
        Beneficiarios INT64,
        reg_ans STRING NOT NULL,
        Uniodonto STRING,
        ATIVA STRING,
        modalidade STRING,
        competencia STRING,
        dt_carga STRING,
        razao_social STRING,
        cnpj STRING,
        modalidade_operadora STRING,
        beneficiarios_total INT64,
        porte_operadora STRING,
        porte STRING,
        updated_at TIMESTAMP
      )
      PARTITION BY Periodo
      CLUSTER BY reg_ans, modalidade, porte
    `,
  })

  await bigquery.query({
    location: LOCATION,
    query: `
      MERGE ${target} T
      USING (
        SELECT
          CAST(competencia AS STRING) AS competencia,
          SAFE.PARSE_DATE('%Y-%m', CAST(competencia AS STRING)) AS Periodo,
          CAST(dt_carga AS STRING) AS dt_carga,
          REGEXP_REPLACE(CAST(reg_ans AS STRING), r'\\D', '') AS reg_ans,
          CAST(razao_social AS STRING) AS razao_social,
          REGEXP_REPLACE(CAST(cnpj AS STRING), r'\\D', '') AS cnpj,
          CAST(modalidade_operadora AS STRING) AS modalidade_operadora,
          SAFE_CAST(beneficiarios_total AS INT64) AS beneficiarios_total,
          CAST(porte_operadora AS STRING) AS porte_operadora,
          ${porteCase} AS porte
        FROM ${source}
        WHERE competencia IS NOT NULL
          AND reg_ans IS NOT NULL
      ) S
      ON T.competencia = S.competencia
     AND T.reg_ans = S.reg_ans
      WHEN MATCHED THEN UPDATE SET
        Operadora = S.razao_social,
        Periodo = S.Periodo,
        Beneficiarios = S.beneficiarios_total,
        Uniodonto = NULL,
        ATIVA = 'SIM',
        modalidade = S.modalidade_operadora,
        dt_carga = S.dt_carga,
        razao_social = S.razao_social,
        cnpj = S.cnpj,
        modalidade_operadora = S.modalidade_operadora,
        beneficiarios_total = S.beneficiarios_total,
        porte_operadora = S.porte_operadora,
        porte = S.porte,
        updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN INSERT (
        Operadora, Periodo, Beneficiarios, reg_ans, Uniodonto, ATIVA,
        modalidade, competencia, dt_carga, razao_social, cnpj,
        modalidade_operadora, beneficiarios_total, porte_operadora, porte,
        updated_at
      ) VALUES (
        S.razao_social, S.Periodo, S.beneficiarios_total, S.reg_ans, NULL,
        'SIM', S.modalidade_operadora, S.competencia, S.dt_carga,
        S.razao_social, S.cnpj, S.modalidade_operadora,
        S.beneficiarios_total, S.porte_operadora, S.porte,
        CURRENT_TIMESTAMP()
      )
    `,
  })

  await bigquery.query({
    location: LOCATION,
    query: `
      DELETE FROM ${target} T
      WHERE T.competencia IN (SELECT DISTINCT CAST(competencia AS STRING) FROM ${source})
        AND NOT EXISTS (
          SELECT 1
          FROM ${source} S
          WHERE CAST(S.competencia AS STRING) = T.competencia
            AND REGEXP_REPLACE(CAST(S.reg_ans AS STRING), r'\\D', '') = T.reg_ans
        )
    `,
  })

  const [rows] = await bigquery.query({
    location: LOCATION,
    query: `
      SELECT
        MAX(competencia) AS ultima_competencia,
        COUNT(*) AS operadoras,
        SUM(beneficiarios_total) AS beneficiarios
      FROM ${target}
      WHERE competencia = (SELECT MAX(competencia) FROM ${target})
    `,
  })
  console.log('[beneficiarios-odontologicas] sync ok', rows?.[0] ?? {})
}

syncBeneficiariosOdontologicas().catch((error) => {
  console.error('[beneficiarios-odontologicas] falha no sync', error)
  process.exit(1)
})
