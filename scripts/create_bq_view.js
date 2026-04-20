import { BigQuery } from '@google-cloud/bigquery'

const PROJECT_ID = process.env.BQ_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'bigdata-467917'
const SOURCE_DATASET_ID = process.env.BQ_DATASET ?? 'dash_ans'
const DERIVED_DATASET_ID = process.env.BQ_MART_DATASET ?? 'dash_ans'
const FULL_VIEW = process.env.BQ_FULL_VIEW ?? 'vw_demonstracoes_contabeis_full'
const FULL_SOURCE_TABLE = process.env.BQ_FULL_SOURCE_TABLE ?? 'demonstracoes_contabeis'
const RAW_TABLE = process.env.BQ_RAW_TABLE ?? 'demonstracoes_contabeis_raw'
const SOURCE_TABLE = process.env.BQ_SOURCE_TABLE ?? FULL_VIEW
const TARGET_VIEW = process.env.BQ_VIEW ?? 'indicadores_curados'
const LOCATION = process.env.BQ_LOCATION ?? 'southamerica-east1'
const SHOULD_CREATE_FULL_VIEW = (process.env.BQ_CREATE_FULL_VIEW ?? 'false').toLowerCase() === 'true'

function parseTableRef(name, defaultDataset = DERIVED_DATASET_ID) {
  const normalized = String(name ?? '')
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/^"|"$/g, '')
  if (!normalized) {
    throw new Error('Nome de tabela/view vazio.')
  }
  const parts = normalized.split('.').filter(Boolean)
  if (parts.length === 1) {
    return { projectId: PROJECT_ID, datasetId: defaultDataset, objectId: parts[0] }
  }
  if (parts.length === 2) {
    return { projectId: PROJECT_ID, datasetId: parts[0], objectId: parts[1] }
  }
  return { projectId: parts[0], datasetId: parts[1], objectId: parts[2] }
}

function qualified(name, defaultDataset = DERIVED_DATASET_ID) {
  const ref = parseTableRef(name, defaultDataset)
  return `\`${ref.projectId}.${ref.datasetId}.${ref.objectId}\``
}

function safeFloat(expr) {
  return `SAFE_CAST(${expr} AS FLOAT64)`
}

function safeInt(expr) {
  return `SAFE_CAST(${expr} AS INT64)`
}

function buildFullViewSql(sourceTableName, mode) {
  const target = qualified(FULL_VIEW, DERIVED_DATASET_ID)
  const source = qualified(sourceTableName, SOURCE_DATASET_ID)
  const obm = qualified('operadoras_beneficiarios_modalidade', SOURCE_DATASET_ID)
  const prestadores = qualified('prestadores_proprios', SOURCE_DATASET_ID)
  const operadoras = qualified('operadoras', SOURCE_DATASET_ID)
  const uniodontosAtivas = qualified('uniodontos_ativas', SOURCE_DATASET_ID)

  let dcSelect = ''
  if (mode === 'raw_uppercase') {
    dcSelect = `
  SELECT
    DATA AS data,
    REG_ANS AS reg_ans,
    CD_CONTA_CONTABIL AS cd_conta_contabil,
    DESCRICAO AS descricao,
    VL_SALDO_INICIAL AS vl_saldo_inicial,
    VL_SALDO_FINAL AS vl_saldo_final,
    ano,
    trimestre,
    arquivo_origem,
    DATE(CAST(ano AS INT64), 1 + (CAST(trimestre AS INT64) - 1) * 3, 1) AS Periodo,
    CAST(NULL AS STRING) AS Operadora,
    CAST(NULL AS INT64) AS Beneficiarios,
    CAST(NULL AS STRING) AS Uniodonto,
    CAST(NULL AS STRING) AS ATIVA,
    CAST(NULL AS STRING) AS modalidade,
    CAST(NULL AS STRING) AS porte,
    CAST(NULL AS INT64) AS Prestadores
  FROM ${source}
`
  } else if (mode === 'legacy_registro_operadora') {
    dcSelect = `
  SELECT
    data,
    registro_operadora AS reg_ans,
    cd_conta_contabil,
    descricao,
    vl_saldo_inicial,
    vl_saldo_final,
    ano,
    trimestre,
    arquivo_origem,
    DATE(CAST(ano AS INT64), 1 + (CAST(trimestre AS INT64) - 1) * 3, 1) AS Periodo,
    CAST(NULL AS STRING) AS Operadora,
    CAST(NULL AS INT64) AS Beneficiarios,
    CAST(NULL AS STRING) AS Uniodonto,
    CAST(NULL AS STRING) AS ATIVA,
    CAST(NULL AS STRING) AS modalidade,
    CAST(NULL AS STRING) AS porte,
    CAST(NULL AS INT64) AS Prestadores
  FROM ${source}
`
  } else if (mode === 'curated_valor') {
    dcSelect = `
  SELECT
    CAST(NULL AS DATE) AS data,
    reg_ans,
    cd_conta_contabil,
    descricao,
    CAST(NULL AS FLOAT64) AS vl_saldo_inicial,
    SAFE_CAST(valor AS FLOAT64) AS vl_saldo_final,
    CAST(ano AS INT64) AS ano,
    CAST(trimestre AS INT64) AS trimestre,
    CAST(NULL AS STRING) AS arquivo_origem,
    operadora AS Operadora,
    DATE(CAST(ano AS INT64), 1 + (CAST(trimestre AS INT64) - 1) * 3, 1) AS Periodo,
    CAST(beneficiarios AS INT64) AS Beneficiarios,
    uniodonto AS Uniodonto,
    ativa AS ATIVA,
    modalidade,
    porte,
    CAST(Prestadores AS INT64) AS Prestadores
  FROM ${source}
`
  } else {
    throw new Error(`Modo de schema desconhecido para FULL view: ${mode}`)
  }

  return `
CREATE OR REPLACE VIEW ${target} AS
WITH dc AS (
${dcSelect.trimEnd()}
),
obm_period AS (
  SELECT
    reg_ans,
    Operadora,
    Periodo,
    Beneficiarios,
    Uniodonto,
    ATIVA,
    modalidade
  FROM ${obm}
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY reg_ans, Periodo
    ORDER BY Periodo DESC
  ) = 1
),
obm_latest AS (
  SELECT
    reg_ans,
    Operadora,
    Periodo,
    Beneficiarios,
    Uniodonto,
    ATIVA,
    modalidade
  FROM ${obm}
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY reg_ans
    ORDER BY Periodo DESC
  ) = 1
),
operadoras_dim AS (
  SELECT
    REG_ANS AS reg_ans,
    COALESCE(NULLIF(NOME_FANTASIA, ''), NULLIF(RAZAO_SOCIAL, '')) AS Operadora,
    MODALIDADE AS modalidade,
    CASE
      WHEN DATA_DESCREDENCIAMENTO IS NULL THEN 'SIM'
      ELSE 'NÃO'
    END AS ATIVA
  FROM ${operadoras}
),
uniodonto_dim AS (
  SELECT
    reg_ans,
    'SIM' AS Uniodonto
  FROM ${uniodontosAtivas}
),
prestadores_dim AS (
  SELECT
    reg_ans,
    COUNT(*) AS Prestadores
  FROM ${prestadores}
  GROUP BY reg_ans
)
SELECT
  dc.data,
  dc.reg_ans,
  dc.cd_conta_contabil,
  dc.descricao,
  dc.vl_saldo_inicial,
  dc.vl_saldo_final,
  dc.ano,
  dc.trimestre,
  dc.arquivo_origem,
  COALESCE(NULLIF(dc.Operadora, ''), obm_p.Operadora, obm_l.Operadora, op.Operadora) AS Operadora,
  dc.Periodo,
  COALESCE(dc.Beneficiarios, obm_p.Beneficiarios, obm_l.Beneficiarios) AS Beneficiarios,
  COALESCE(NULLIF(dc.Uniodonto, ''), obm_p.Uniodonto, obm_l.Uniodonto, ud.Uniodonto) AS Uniodonto,
  COALESCE(NULLIF(dc.ATIVA, ''), obm_p.ATIVA, obm_l.ATIVA, op.ATIVA) AS ATIVA,
  COALESCE(NULLIF(dc.modalidade, ''), obm_p.modalidade, obm_l.modalidade, op.modalidade) AS modalidade,
  COALESCE(
    NULLIF(dc.porte, ''),
    CASE
      WHEN COALESCE(dc.Beneficiarios, obm_p.Beneficiarios, obm_l.Beneficiarios) IS NULL THEN NULL
      WHEN COALESCE(dc.Beneficiarios, obm_p.Beneficiarios, obm_l.Beneficiarios) <= 19999 THEN 'Pequeno Porte'
      WHEN COALESCE(dc.Beneficiarios, obm_p.Beneficiarios, obm_l.Beneficiarios) <= 99999 THEN 'Médio Porte'
      ELSE 'Grande Porte'
    END
  ) AS porte,
  COALESCE(dc.Prestadores, pp.Prestadores) AS Prestadores,
  CASE
    WHEN COALESCE(NULLIF(dc.modalidade, ''), obm_p.modalidade, obm_l.modalidade, op.modalidade) IN ('Cooperativa odontológica', 'Odontologia de Grupo') THEN TRUE
    ELSE FALSE
  END AS eh_odontologica
FROM dc
LEFT JOIN obm_period obm_p
  ON dc.reg_ans = obm_p.reg_ans
 AND dc.Periodo = obm_p.Periodo
LEFT JOIN obm_latest obm_l
  ON dc.reg_ans = obm_l.reg_ans
LEFT JOIN operadoras_dim op
  ON dc.reg_ans = op.reg_ans
LEFT JOIN uniodonto_dim ud
  ON dc.reg_ans = ud.reg_ans
LEFT JOIN prestadores_dim pp
  ON dc.reg_ans = pp.reg_ans
;
`
}

function buildViewSql() {
  const source = qualified(SOURCE_TABLE, DERIVED_DATASET_ID)
  const target = qualified(TARGET_VIEW, DERIVED_DATASET_ID)
  return `
CREATE OR REPLACE VIEW ${target} AS
WITH base AS (
  SELECT
    ${safeInt('reg_ans')} AS reg_ans,
    MIN(IF(Operadora IS NOT NULL AND Operadora <> '', Operadora, NULL)) AS nome_operadora,
    MIN(IF(modalidade IS NOT NULL AND modalidade <> '', modalidade, NULL)) AS modalidade,
    LOGICAL_OR(
      CASE
        WHEN LOWER(TRIM(Uniodonto)) IN ('sim','s','1','true') THEN TRUE
        WHEN LOWER(TRIM(Uniodonto)) IN ('nao','não','não','n','0','false') THEN FALSE
        ELSE NULL
      END
    ) AS uniodonto,
    LOGICAL_OR(
      CASE
        WHEN LOWER(TRIM(ATIVA)) IN ('sim','s','1','true') THEN TRUE
        WHEN LOWER(TRIM(ATIVA)) IN ('nao','não','não','n','0','false') THEN FALSE
        ELSE NULL
      END
    ) AS ativa,
    MAX(${safeInt('Beneficiarios')}) AS qt_beneficiarios,
    MAX(${safeInt('Prestadores')}) AS qt_prestadores,
    MAX(IF(porte IS NOT NULL AND porte <> '', CAST(porte AS STRING), NULL)) AS porte,
    ${safeInt('ano')} AS ano,
    ${safeInt('trimestre')} AS trimestre,
    MAX(SAFE_CAST(Periodo AS DATE)) AS periodo_data,
    SUM(IF(cd_conta_contabil = '3', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_receitas,
    SUM(IF(cd_conta_contabil = '4', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_despesas,
    SUM(IF(cd_conta_contabil = '311', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_contraprestacoes,
    SUM(IF(cd_conta_contabil = '3111', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_contraprestacoes_efetivas,
    SUM(IF(cd_conta_contabil = '311121', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_contraprestacoes_pre,
    SUM(IF(cd_conta_contabil = '3117', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_corresponsabilidade_cedida,
    SUM(IF(cd_conta_contabil = '1231', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_creditos_operacoes_saude,
    SUM(IF(cd_conta_contabil = '41', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_eventos_liquidos,
    SUM(IF(cd_conta_contabil = '2111', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_eventos_a_liquidar,
    SUM(IF(cd_conta_contabil = '43', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_desp_comerciais,
    SUM(IF(cd_conta_contabil = '464', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_464,
    SUM(IF(cd_conta_contabil = '464119113', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_desp_comerciais_promocoes,
    SUM(IF(cd_conta_contabil = '46', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_desp_administrativas,
    SUM(IF(cd_conta_contabil = '44', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_outras_desp_oper,
    SUM(IF(cd_conta_contabil = '442129119', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_442129119,
    SUM(IF(cd_conta_contabil = '47', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_desp_tributos,
    SUM(IF(cd_conta_contabil = '35', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_receitas_fin,
    SUM(IF(cd_conta_contabil = '36', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_receitas_patrimoniais,
    SUM(IF(cd_conta_contabil = '45', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_despesas_fin,
    SUM(IF(cd_conta_contabil = '33', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_outras_receitas_operacionais,
    SUM(IF(cd_conta_contabil = '332129111', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_332129111,
    SUM(IF(cd_conta_contabil = '332189111', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_332189111,
    SUM(IF(cd_conta_contabil = '12', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_ativo_circulante,
    SUM(IF(cd_conta_contabil = '1213', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_1213,
    SUM(IF(cd_conta_contabil = '1214', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_1214,
    SUM(IF(cd_conta_contabil = '122', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_122,
    SUM(IF(cd_conta_contabil = '13', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_ativo_permanente,
    SUM(IF(cd_conta_contabil = '21', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_passivo_circulante,
    SUM(IF(cd_conta_contabil = '23', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_passivo_nao_circulante,
    SUM(IF(cd_conta_contabil = '25', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_patrimonio_liquido,
    SUM(IF(cd_conta_contabil = '31', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_ativos_garantidores,
    SUM(IF(cd_conta_contabil = '32', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_provisoes_tecnicas,
    SUM(IF(cd_conta_contabil = '32', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_32,
    SUM(IF(cd_conta_contabil = '216', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_216,
    SUM(IF(cd_conta_contabil = '217', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_217,
    SUM(IF(cd_conta_contabil = '236', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_236,
    SUM(IF(cd_conta_contabil = '237', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_237,
    SUM(IF(cd_conta_contabil = '2521', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_pl_ajustado,
    SUM(IF(cd_conta_contabil = '2522', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_margem_solvencia_exigida,
    SUM(IF(cd_conta_contabil = '61', COALESCE(${safeFloat('vl_saldo_final')}, 0), 0)) AS vr_conta_61
  FROM ${source}
  WHERE ano IS NOT NULL
    AND trimestre IS NOT NULL
    AND COALESCE(NULLIF(modalidade, ''), '') IN ('Odontologia de Grupo', 'Cooperativa odontológica')
  GROUP BY reg_ans, ano, trimestre
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
  FROM base
)
SELECT
  lagged.reg_ans,
  lagged.nome_operadora,
  lagged.modalidade,
  lagged.uniodonto,
  lagged.ativa,
  lagged.qt_beneficiarios,
  COALESCE(
    lagged.porte,
    CASE
      WHEN lagged.qt_beneficiarios IS NULL THEN NULL
      WHEN lagged.qt_beneficiarios <= 19999 THEN 'Pequeno Porte'
      WHEN lagged.qt_beneficiarios <= 99999 THEN 'Médio Porte'
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
FROM lagged;
`
}

async function main() {
  const bigquery = new BigQuery({ projectId: PROJECT_ID })
  if (SHOULD_CREATE_FULL_VIEW) {
    const sourceTable = FULL_SOURCE_TABLE || RAW_TABLE
    const sourceTableRef = parseTableRef(sourceTable, SOURCE_DATASET_ID)
    const [columns] = await bigquery.query({
      query: `
        SELECT LOWER(column_name) AS column_name
        FROM \`${sourceTableRef.projectId}.${sourceTableRef.datasetId}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = @tableName
      `,
      location: LOCATION,
      params: { tableName: sourceTableRef.objectId },
    })
    const colSet = new Set(columns.map((row) => row.column_name))
    const mode = (() => {
      if (colSet.has('reg_ans') && colSet.has('valor') && colSet.has('operadora')) return 'curated_valor'
      if (colSet.has('registro_operadora')) return 'legacy_registro_operadora'
      if (colSet.has('reg_ans') && colSet.has('vl_saldo_final') && colSet.has('vl_saldo_inicial') && colSet.has('data')) {
        return 'raw_uppercase'
      }
      return null
    })()
    if (!mode) {
      throw new Error(
        `Não consegui inferir o schema de ${sourceTableRef.projectId}.${sourceTableRef.datasetId}.${sourceTableRef.objectId}. Colunas: ${[...colSet].sort().join(', ')}`,
      )
    }
    const fullSql = buildFullViewSql(sourceTable, mode)
    console.log(
      `[bq-view] Garantindo view base ${PROJECT_ID}.${DERIVED_DATASET_ID}.${FULL_VIEW} a partir de ${sourceTableRef.projectId}.${sourceTableRef.datasetId}.${sourceTableRef.objectId} (mode=${mode})...`,
    )
    await bigquery.query({ query: fullSql, location: LOCATION })
  }
  const sql = buildViewSql()
  const sourceRef = parseTableRef(SOURCE_TABLE, DERIVED_DATASET_ID)
  const targetRef = parseTableRef(TARGET_VIEW, DERIVED_DATASET_ID)
  console.log(
    `[bq-view] Criando view ${targetRef.projectId}.${targetRef.datasetId}.${targetRef.objectId} a partir de ${sourceRef.projectId}.${sourceRef.datasetId}.${sourceRef.objectId}...`,
  )
  await bigquery.query({ query: sql, location: LOCATION })
  if (TARGET_VIEW !== 'indicadores_metricas') {
    const aliasSql =
      `CREATE OR REPLACE VIEW ${qualified('indicadores_metricas', DERIVED_DATASET_ID)} ` +
      `AS SELECT * FROM ${qualified(TARGET_VIEW, DERIVED_DATASET_ID)}`
    console.log(
      `[bq-view] Garantindo alias ${PROJECT_ID}.${DERIVED_DATASET_ID}.indicadores_metricas -> ${targetRef.objectId}...`,
    )
    await bigquery.query({ query: aliasSql, location: LOCATION })
  }
  console.log('[bq-view] View criada/atualizada com sucesso.')
}

main().catch((err) => {
  console.error('[bq-view] Falha ao criar view', err)
  process.exit(1)
})
