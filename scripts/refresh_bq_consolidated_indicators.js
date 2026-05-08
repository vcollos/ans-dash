import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const JOB_PROJECT_ID = process.env.BQ_JOB_PROJECT_ID ?? PROJECT_ID
const DATASET_ID = process.env.BQ_DATASET ?? 'dash_ans'
const AUX_DATASET_ID = process.env.BQ_AUX_DATASET ?? 'dash_ans_uploads'
const LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'
const OFFICIAL_INDICATOR_SNAPSHOT =
  process.env.BQ_OFFICIAL_INDICATOR_SNAPSHOT ?? `${PROJECT_ID}.${DATASET_ID}.indicadores_curados_snapshot`
const AUX_LATEST_VIEW =
  process.env.BQ_AUX_DEMONSTRACOES_LATEST_VIEW ?? `${PROJECT_ID}.${AUX_DATASET_ID}.vw_demonstracoes_contabeis_auxiliar_latest`
const CONSOLIDATED_INDICATOR_SNAPSHOT =
  process.env.BQ_CONSOLIDATED_INDICATOR_SNAPSHOT ?? `${PROJECT_ID}.${AUX_DATASET_ID}.indicadores_curados_snapshot_consolidado`
const CONSOLIDATED_MART_ANS_TABLE =
  process.env.BQ_CONSOLIDATED_MART_ANS_TABLE ?? `${PROJECT_ID}.${AUX_DATASET_ID}.indicadores_mart_ans_consolidado`
const CONSOLIDATED_MART_UNIODONTO_TABLE =
  process.env.BQ_CONSOLIDATED_MART_UNIODONTO_TABLE ?? `${PROJECT_ID}.${AUX_DATASET_ID}.indicadores_mart_uniodonto_consolidado`
const BENEFICIARIOS_ODONTO_TABLE =
  process.env.BQ_BENEFICIARIOS_ODONTO_TABLE ?? `${PROJECT_ID}.${DATASET_ID}.beneficiarios_odontologicas_por_operadora`
const BQ_MAX_BYTES_BILLED = parseBytesLimit(process.env.BQ_MAX_BYTES_BILLED, 1_073_741_824)
const SHOULD_EXECUTE = process.env.BQ_EXECUTE === 'true'

const MART_SQL_PATH = path.resolve(__dirname, '../db/materialize_indicadores_mart.sql')

function quoteTableRef(name, defaultDataset = DATASET_ID) {
  const normalized = String(name ?? '').trim().replace(/^`|`$/g, '')
  if (!normalized) {
    throw new Error('Nome de tabela/view vazio.')
  }
  if (normalized.includes('.')) return `\`${normalized}\``
  return `\`${PROJECT_ID}.${defaultDataset}.${normalized}\``
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
  console.log(`[bq-consolidated] dry-run ${label}: ${bytes} bytes (${formatBytes(bytes)})`)
  assertWithinBytesLimit(bytes, label)
  return bytes
}

function buildConsolidatedIndicatorSnapshotQuery() {
  const auxLatest = quoteTableRef(AUX_LATEST_VIEW, AUX_DATASET_ID)
  const officialSnapshot = quoteTableRef(OFFICIAL_INDICATOR_SNAPSHOT, DATASET_ID)
  const obm = quoteTableRef(BENEFICIARIOS_ODONTO_TABLE, DATASET_ID)
  const operadoras = `\`${PROJECT_ID}.${DATASET_ID}.operadoras\``
  const uniodontosAtivas = `\`${PROJECT_ID}.${DATASET_ID}.uniodontos_ativas\``
  const uhubCooperativas = `\`${PROJECT_ID}.uhub.cooperativas\``
  const target = quoteTableRef(CONSOLIDATED_INDICATOR_SNAPSHOT, AUX_DATASET_ID)

  return `
    CREATE OR REPLACE TABLE ${target}
    PARTITION BY periodo_raw
    CLUSTER BY periodo_id, reg_ans, modalidade, uniodonto
    AS
    WITH obm_period AS (
      SELECT
        reg_ans,
        Operadora,
        Periodo,
        Beneficiarios,
        Uniodonto,
        ATIVA,
        modalidade,
        porte
      FROM ${obm}
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY reg_ans, Periodo
        ORDER BY Periodo DESC
      ) = 1
    ), obm_latest AS (
      SELECT
        reg_ans,
        Operadora,
        Periodo,
        Beneficiarios,
        Uniodonto,
        ATIVA,
        modalidade,
        porte
      FROM ${obm}
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY reg_ans
        ORDER BY Periodo DESC
      ) = 1
    ), uhub_operadoras_dim AS (
      SELECT
        CAST(reg_ans AS STRING) AS reg_ans,
        INITCAP(LOWER(TRIM(nome_fantasia))) AS nome_fantasia,
        CONCAT(
          'Uniodonto ',
          REGEXP_REPLACE(INITCAP(LOWER(TRIM(nome_fantasia))), r'^Uniodonto\\s+', '')
        ) AS operadora
      FROM ${uhubCooperativas}
      WHERE NULLIF(TRIM(nome_fantasia), '') IS NOT NULL
        AND IFNULL(is_deleted, FALSE) IS FALSE
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY CAST(reg_ans AS STRING)
        ORDER BY IFNULL(ativa, FALSE) DESC, updated_at DESC
      ) = 1
    ), operadoras_dim AS (
      SELECT
        REG_ANS AS reg_ans,
        COALESCE(NULLIF(NOME_FANTASIA, ''), NULLIF(RAZAO_SOCIAL, '')) AS operadora,
        MODALIDADE AS modalidade,
        CASE
          WHEN DATA_DESCREDENCIAMENTO IS NULL THEN 'SIM'
          ELSE 'NAO'
        END AS ativa
      FROM ${operadoras}
    ), uniodonto_dim AS (
      SELECT
        reg_ans,
        'SIM' AS uniodonto
      FROM ${uniodontosAtivas}
    ), official_base AS (
      SELECT
        official.reg_ans,
        COALESCE(uop.operadora, official.nome_operadora) AS nome_operadora,
        uop.nome_fantasia,
        official.modalidade,
        official.uniodonto,
        official.ativa,
        official.qt_beneficiarios,
        official.porte,
        official.ano,
        official.trimestre,
        official.periodo_raw AS periodo_data,
        official.vr_receitas,
        official.vr_despesas,
        official.vr_contraprestacoes,
        official.vr_contraprestacoes_efetivas,
        official.vr_contraprestacoes_pre,
        official.vr_corresponsabilidade_cedida,
        official.vr_creditos_operacoes_saude,
        official.vr_eventos_liquidos,
        official.vr_eventos_a_liquidar,
        official.vr_desp_comerciais,
        official.vr_desp_comerciais_promocoes,
        official.vr_conta_464,
        official.vr_desp_administrativas,
        official.vr_outras_desp_oper,
        official.vr_conta_442129119,
        official.vr_desp_tributos,
        official.vr_receitas_fin,
        official.vr_receitas_patrimoniais,
        official.vr_despesas_fin,
        official.vr_outras_receitas_operacionais,
        official.vr_conta_332129111,
        official.vr_conta_332189111,
        official.vr_ativo_circulante,
        official.vr_conta_1213,
        official.vr_conta_1214,
        official.vr_conta_122,
        official.vr_ativo_permanente,
        official.vr_passivo_circulante,
        official.vr_passivo_nao_circulante,
        official.vr_patrimonio_liquido,
        official.vr_ativos_garantidores,
        official.vr_provisoes_tecnicas,
        official.vr_conta_32,
        official.vr_conta_216,
        official.vr_conta_217,
        official.vr_conta_236,
        official.vr_conta_237,
        official.vr_pl_ajustado,
        official.vr_margem_solvencia_exigida,
        official.vr_conta_61,
        official.qt_prestadores
      FROM ${officialSnapshot} official
      LEFT JOIN uhub_operadoras_dim uop
        ON CAST(official.reg_ans AS STRING) = uop.reg_ans
    ), external_base AS (
      SELECT
        SAFE_CAST(src.reg_ans AS INT64) AS reg_ans,
        COALESCE(
          MAX(uop.operadora),
          MIN(
            IF(
              COALESCE(obm_p.Operadora, obm_l.Operadora, op.operadora) IS NOT NULL
              AND COALESCE(obm_p.Operadora, obm_l.Operadora, op.operadora) <> '',
              COALESCE(obm_p.Operadora, obm_l.Operadora, op.operadora),
              NULL
            )
          )
        ) AS nome_operadora,
        MAX(uop.nome_fantasia) AS nome_fantasia,
        MIN(
          IF(
            COALESCE(src.modalidade, obm_p.modalidade, obm_l.modalidade, op.modalidade) IS NOT NULL
            AND COALESCE(src.modalidade, obm_p.modalidade, obm_l.modalidade, op.modalidade) <> '',
            COALESCE(src.modalidade, obm_p.modalidade, obm_l.modalidade, op.modalidade),
            NULL
          )
        ) AS modalidade,
        LOGICAL_OR(
          CASE
            WHEN LOWER(TRIM(COALESCE(obm_p.Uniodonto, obm_l.Uniodonto, ud.uniodonto))) IN ('sim','s','1','true') THEN TRUE
            WHEN LOWER(TRIM(COALESCE(obm_p.Uniodonto, obm_l.Uniodonto, ud.uniodonto))) IN ('nao','nao','n','0','false') THEN FALSE
            ELSE NULL
          END
        ) AS uniodonto,
        LOGICAL_OR(
          CASE
            WHEN LOWER(TRIM(COALESCE(obm_p.ATIVA, obm_l.ATIVA, op.ativa))) IN ('sim','s','1','true') THEN TRUE
            WHEN LOWER(TRIM(COALESCE(obm_p.ATIVA, obm_l.ATIVA, op.ativa))) IN ('nao','n','0','false') THEN FALSE
            ELSE NULL
          END
        ) AS ativa,
        MAX(SAFE_CAST(src.qt_beneficiarios AS INT64)) AS qt_beneficiarios,
        COALESCE(
          MAX(IF(src.porte IS NOT NULL AND src.porte <> '', CAST(src.porte AS STRING), NULL)),
          MAX(IF(obm_p.porte IS NOT NULL AND obm_p.porte <> '', CAST(obm_p.porte AS STRING), NULL)),
          MAX(IF(obm_l.porte IS NOT NULL AND obm_l.porte <> '', CAST(obm_l.porte AS STRING), NULL))
        ) AS porte,
        SAFE_CAST(src.ano AS INT64) AS ano,
        SAFE_CAST(src.trimestre AS INT64) AS trimestre,
        MAX(DATE(SAFE_CAST(src.ano AS INT64), 1 + (SAFE_CAST(src.trimestre AS INT64) - 1) * 3, 1)) AS periodo_data,
        SUM(IF(src.cd_conta_contabil = '3', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_receitas,
        SUM(IF(src.cd_conta_contabil = '4', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_despesas,
        SUM(IF(src.cd_conta_contabil = '311', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_contraprestacoes,
        SUM(IF(src.cd_conta_contabil = '3111', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_contraprestacoes_efetivas,
        SUM(IF(src.cd_conta_contabil = '311121', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_contraprestacoes_pre,
        SUM(IF(src.cd_conta_contabil = '3117', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_corresponsabilidade_cedida,
        SUM(IF(src.cd_conta_contabil = '1231', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_creditos_operacoes_saude,
        SUM(IF(src.cd_conta_contabil = '41', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_eventos_liquidos,
        SUM(IF(src.cd_conta_contabil = '2111', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_eventos_a_liquidar,
        SUM(IF(src.cd_conta_contabil = '43', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_desp_comerciais,
        SUM(IF(src.cd_conta_contabil = '464119113', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_desp_comerciais_promocoes,
        SUM(IF(src.cd_conta_contabil = '464', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_464,
        SUM(IF(src.cd_conta_contabil = '46', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_desp_administrativas,
        SUM(IF(src.cd_conta_contabil = '44', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_outras_desp_oper,
        SUM(IF(src.cd_conta_contabil = '442129119', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_442129119,
        SUM(IF(src.cd_conta_contabil = '47', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_desp_tributos,
        SUM(IF(src.cd_conta_contabil = '35', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_receitas_fin,
        SUM(IF(src.cd_conta_contabil = '36', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_receitas_patrimoniais,
        SUM(IF(src.cd_conta_contabil = '45', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_despesas_fin,
        SUM(IF(src.cd_conta_contabil = '33', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_outras_receitas_operacionais,
        SUM(IF(src.cd_conta_contabil = '332129111', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_332129111,
        SUM(IF(src.cd_conta_contabil = '332189111', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_332189111,
        SUM(IF(src.cd_conta_contabil = '12', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_ativo_circulante,
        SUM(IF(src.cd_conta_contabil = '1213', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_1213,
        SUM(IF(src.cd_conta_contabil = '1214', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_1214,
        SUM(IF(src.cd_conta_contabil = '122', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_122,
        SUM(IF(src.cd_conta_contabil = '13', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_ativo_permanente,
        SUM(IF(src.cd_conta_contabil = '21', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_passivo_circulante,
        SUM(IF(src.cd_conta_contabil = '23', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_passivo_nao_circulante,
        SUM(IF(src.cd_conta_contabil = '25', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_patrimonio_liquido,
        SUM(IF(src.cd_conta_contabil = '31', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_ativos_garantidores,
        SUM(IF(src.cd_conta_contabil = '32', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_provisoes_tecnicas,
        SUM(IF(src.cd_conta_contabil = '32', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_32,
        SUM(IF(src.cd_conta_contabil = '216', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_216,
        SUM(IF(src.cd_conta_contabil = '217', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_217,
        SUM(IF(src.cd_conta_contabil = '236', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_236,
        SUM(IF(src.cd_conta_contabil = '237', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_237,
        SUM(IF(src.cd_conta_contabil = '2521', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_pl_ajustado,
        SUM(IF(src.cd_conta_contabil = '2522', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_margem_solvencia_exigida,
        SUM(IF(src.cd_conta_contabil = '61', COALESCE(SAFE_CAST(src.vl_saldo_final AS FLOAT64), 0), 0)) AS vr_conta_61,
        MAX(SAFE_CAST(src.qt_prestadores AS INT64)) AS qt_prestadores
      FROM ${auxLatest} src
      LEFT JOIN obm_period obm_p
        ON CAST(src.reg_ans AS STRING) = obm_p.reg_ans
       AND DATE(SAFE_CAST(src.ano AS INT64), 1 + (SAFE_CAST(src.trimestre AS INT64) - 1) * 3, 1) = obm_p.Periodo
      LEFT JOIN obm_latest obm_l
        ON CAST(src.reg_ans AS STRING) = obm_l.reg_ans
      LEFT JOIN operadoras_dim op
        ON CAST(src.reg_ans AS STRING) = op.reg_ans
      LEFT JOIN uniodonto_dim ud
        ON CAST(src.reg_ans AS STRING) = ud.reg_ans
      LEFT JOIN uhub_operadoras_dim uop
        ON CAST(src.reg_ans AS STRING) = uop.reg_ans
      WHERE src.ano IS NOT NULL
        AND src.trimestre IS NOT NULL
        AND LOWER(TRIM(COALESCE(src.modalidade, obm_p.modalidade, obm_l.modalidade, op.modalidade, ''))) IN (
          'odontologia de grupo',
          'cooperativa odontologica',
          'cooperativa odontológica'
        )
      GROUP BY reg_ans, ano, trimestre
    ), combined_base AS (
      SELECT *
      FROM official_base
      UNION ALL
      SELECT external_base.*
      FROM external_base
      LEFT JOIN official_base
        ON official_base.reg_ans = external_base.reg_ans
       AND official_base.ano = external_base.ano
       AND official_base.trimestre = external_base.trimestre
      WHERE official_base.reg_ans IS NULL
    ), lagged AS (
      SELECT
        base.*,
        LAG(vr_eventos_liquidos) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_vr_eventos_liquidos,
        LAG(vr_corresponsabilidade_cedida) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_vr_corresponsabilidade_cedida,
        LAG(vr_contraprestacoes) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_vr_contraprestacoes,
        LAG(vr_provisoes_tecnicas) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_vr_provisoes_tecnicas,
        LAG(qt_beneficiarios) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre) AS prev_qt_beneficiarios,
        COALESCE(vr_eventos_liquidos, 0) - COALESCE(LAG(vr_eventos_liquidos) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_vr_eventos_liquidos,
        COALESCE(vr_corresponsabilidade_cedida, 0) - COALESCE(LAG(vr_corresponsabilidade_cedida) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_vr_corresponsabilidade_cedida,
        COALESCE(vr_contraprestacoes, 0) - COALESCE(LAG(vr_contraprestacoes) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_vr_contraprestacoes,
        COALESCE(vr_provisoes_tecnicas, 0) - COALESCE(LAG(vr_provisoes_tecnicas) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_vr_provisoes_tecnicas,
        COALESCE(qt_beneficiarios, 0) - COALESCE(LAG(qt_beneficiarios) OVER (PARTITION BY reg_ans ORDER BY ano, trimestre), 0) AS delta_qt_beneficiarios
      FROM combined_base base
    )
    SELECT
      lagged.reg_ans,
      lagged.nome_operadora,
      lagged.nome_fantasia,
      lagged.modalidade,
      lagged.uniodonto,
      lagged.ativa,
      lagged.qt_beneficiarios,
      COALESCE(
        lagged.porte,
        CASE
          WHEN lagged.qt_beneficiarios IS NULL THEN NULL
          WHEN lagged.qt_beneficiarios <= 19999 THEN 'Pequeno Porte'
          WHEN lagged.qt_beneficiarios <= 99999 THEN 'Medio Porte'
          ELSE 'Grande Porte'
        END
      ) AS porte,
      lagged.ano,
      lagged.trimestre,
      lagged.periodo_data AS periodo_raw,
      (lagged.ano * 10 + lagged.trimestre) AS periodo_id,
      CONCAT(CAST(lagged.ano AS STRING), 'T', CAST(lagged.trimestre AS STRING)) AS periodo,
      ROW_NUMBER() OVER (PARTITION BY lagged.reg_ans, lagged.ano ORDER BY lagged.trimestre DESC) AS trimestre_rank,
      lagged.vr_receitas,
      lagged.vr_despesas,
      lagged.vr_contraprestacoes,
      lagged.vr_contraprestacoes_efetivas,
      lagged.vr_contraprestacoes_pre,
      lagged.vr_corresponsabilidade_cedida,
      lagged.vr_creditos_operacoes_saude,
      lagged.vr_eventos_liquidos,
      lagged.vr_eventos_a_liquidar,
      lagged.vr_desp_comerciais,
      lagged.vr_desp_comerciais_promocoes,
      lagged.vr_conta_464,
      lagged.vr_desp_administrativas,
      lagged.vr_outras_desp_oper,
      lagged.vr_conta_442129119,
      lagged.vr_desp_tributos,
      lagged.vr_receitas_fin,
      lagged.vr_receitas_patrimoniais,
      lagged.vr_despesas_fin,
      lagged.vr_outras_receitas_operacionais,
      lagged.vr_conta_332129111,
      lagged.vr_conta_332189111,
      lagged.vr_ativo_circulante,
      lagged.vr_conta_1213,
      lagged.vr_conta_1214,
      lagged.vr_conta_122,
      lagged.vr_ativo_permanente,
      lagged.vr_passivo_circulante,
      lagged.vr_passivo_nao_circulante,
      lagged.vr_patrimonio_liquido,
      lagged.vr_ativos_garantidores,
      lagged.vr_provisoes_tecnicas,
      lagged.vr_conta_32,
      lagged.vr_conta_216,
      lagged.vr_conta_217,
      lagged.vr_conta_236,
      lagged.vr_conta_237,
      lagged.vr_pl_ajustado,
      lagged.vr_margem_solvencia_exigida,
      lagged.vr_conta_61,
      COALESCE(lagged.vr_receitas_fin, 0) - COALESCE(lagged.vr_despesas_fin, 0) AS resultado_financeiro,
      COALESCE(lagged.vr_receitas, 0) - COALESCE(lagged.vr_despesas, 0) AS resultado_liquido,
      COALESCE(lagged.vr_receitas, 0) - COALESCE(lagged.vr_despesas, 0) AS resultado_liquido_calculado,
      COALESCE(lagged.vr_receitas, 0) - COALESCE(lagged.vr_despesas, 0) - COALESCE(lagged.vr_conta_61, 0) AS resultado_liquido_final_ans,
      COALESCE(lagged.vr_receitas, 0) - COALESCE(lagged.vr_despesas, 0) AS resultado_liquido_informado,
      lagged.prev_vr_eventos_liquidos,
      lagged.prev_vr_corresponsabilidade_cedida,
      lagged.prev_vr_contraprestacoes,
      lagged.prev_vr_provisoes_tecnicas,
      lagged.prev_qt_beneficiarios,
      lagged.delta_vr_eventos_liquidos,
      lagged.delta_vr_corresponsabilidade_cedida,
      lagged.delta_vr_contraprestacoes,
      lagged.delta_vr_provisoes_tecnicas,
      lagged.delta_qt_beneficiarios,
      lagged.qt_prestadores
    FROM lagged
  `
}

function buildConsolidatedIndicatorMartsQuery() {
  const template = fs.readFileSync(MART_SQL_PATH, 'utf8').trim().replace(/;\s*$/, '')
  return template
    .replaceAll('{{SOURCE_TABLE}}', quoteTableRef(CONSOLIDATED_INDICATOR_SNAPSHOT, AUX_DATASET_ID))
    .replaceAll('{{ANS_TABLE}}', quoteTableRef(CONSOLIDATED_MART_ANS_TABLE, AUX_DATASET_ID))
    .replaceAll('{{UNIODONTO_TABLE}}', quoteTableRef(CONSOLIDATED_MART_UNIODONTO_TABLE, AUX_DATASET_ID))
    .replaceAll('{{PARTITION_EXPR}}', 'periodo_raw')
    .replaceAll('{{CLUSTER_FIELDS}}', 'periodo_id, reg_ans, modalidade, uniodonto')
}

async function refreshConsolidatedIndicators() {
  const bigquery = new BigQuery({ projectId: JOB_PROJECT_ID })
  const snapshotQuery = buildConsolidatedIndicatorSnapshotQuery()
  const martQuery = buildConsolidatedIndicatorMartsQuery()

  await dryRunQuery(bigquery, snapshotQuery, CONSOLIDATED_INDICATOR_SNAPSHOT)
  await dryRunQuery(bigquery, martQuery, `${CONSOLIDATED_MART_ANS_TABLE} + ${CONSOLIDATED_MART_UNIODONTO_TABLE}`)
  if (!SHOULD_EXECUTE) {
    console.log('[bq-consolidated] Dry-run concluido. Nenhum artefato foi atualizado. Defina BQ_EXECUTE=true para executar.')
    return
  }

  console.log(`[bq-consolidated] Atualizando ${CONSOLIDATED_INDICATOR_SNAPSHOT}...`)
  await bigquery.query({
    query: snapshotQuery,
    location: LOCATION,
    maximumBytesBilled:
      Number.isFinite(BQ_MAX_BYTES_BILLED) && BQ_MAX_BYTES_BILLED > 0
        ? String(Math.trunc(BQ_MAX_BYTES_BILLED))
        : undefined,
  })
  console.log(`[bq-consolidated] Atualizando ${CONSOLIDATED_MART_ANS_TABLE} e ${CONSOLIDATED_MART_UNIODONTO_TABLE}...`)
  await bigquery.query({
    query: martQuery,
    location: LOCATION,
    maximumBytesBilled:
      Number.isFinite(BQ_MAX_BYTES_BILLED) && BQ_MAX_BYTES_BILLED > 0
        ? String(Math.trunc(BQ_MAX_BYTES_BILLED))
        : undefined,
  })
  console.log('[bq-consolidated] Artefatos consolidados atualizados com sucesso.')
}

refreshConsolidatedIndicators().catch((error) => {
  console.error('[bq-consolidated] Falha ao atualizar artefatos consolidados', error)
  process.exit(1)
})
