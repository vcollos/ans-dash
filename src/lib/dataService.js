import { getDuckDB, getConnection } from './duckdbClient'
import { tableToObjects } from './arrow'
import { metricFormulas, metricSql } from './metricFormulas'

export const DETAIL_TABLE_FIELDS = [
  'nome_operadora',
  'modalidade',
  'porte',
  'reg_ans',
  'ano',
  'trimestre',
  'qt_beneficiarios',
  'sinistralidade_pct',
  'margem_lucro_pct',
  'despesas_adm_pct',
  'despesas_comerciais_pct',
  'despesas_operacionais_pct',
  'indice_resultado_financeiro_pct',
  'retorno_pl_pct',
  'liquidez_corrente',
  'capital_terceiros_sobre_pl',
  'pmcr',
  'pmpe',
  'resultado_financeiro',
  'resultado_liquido',
  'vr_receitas',
  'vr_despesas',
  'vr_receitas_patrimoniais',
  'vr_contraprestacoes',
  'vr_eventos_liquidos',
]

const DEFAULT_VIEW = 'diops_curated'

let cachedViewColumns = null

const sanitizeList = (values = []) => values.filter((value) => value !== null && value !== undefined && value !== '')
const sanitizeSql = (value) => (value ? value.replaceAll("'", "''") : value)
const metricSelectSql = metricFormulas.map(({ id, sql }) => `${sql.trim()} AS ${id}`).join(',\n        ')

async function getViewColumns(conn) {
  if (cachedViewColumns) {
    return cachedViewColumns
  }
  const info = await conn.query(`PRAGMA table_info('${DEFAULT_VIEW}')`)
  cachedViewColumns = tableToObjects(info).map((row) => row.name)
  return cachedViewColumns
}

function invalidateSchemaCache() {
  cachedViewColumns = null
}

async function fetchAsText(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Falha ao acessar ${url}: ${response.status}`)
  }
  const buffer = await response.arrayBuffer()
  return new TextDecoder().decode(buffer)
}

function buildWhereClause(filters = {}) {
  const clauses = []
  if (filters.modalidades?.length) {
    const values = filters.modalidades.map((value) => `'${sanitizeSql(value)}'`)
    clauses.push(`modalidade IN (${values.join(',')})`)
  }
  if (filters.portes?.length) {
    const values = filters.portes.map((value) => `'${sanitizeSql(value)}'`)
    clauses.push(`porte IN (${values.join(',')})`)
  }
  if (filters.anos?.length) {
    clauses.push(`ano IN (${filters.anos.join(',')})`)
  }
  if (filters.trimestres?.length) {
    clauses.push(`trimestre IN (${filters.trimestres.join(',')})`)
  }
  if (filters.ativa === true) clauses.push('ativa IS TRUE')
  else if (filters.ativa === false) clauses.push('ativa IS FALSE')

  if (filters.uniodonto === true) clauses.push('COALESCE(uniodonto, FALSE) IS TRUE')
  else if (filters.uniodonto === false) clauses.push('COALESCE(uniodonto, FALSE) IS FALSE')

  if (filters.regAns?.length) clauses.push(`reg_ans IN (${filters.regAns.join(',')})`)

  if (filters.search) {
    const v = sanitizeSql(filters.search).toLowerCase()
    clauses.push(`lower(nome_operadora) LIKE '%${v}%'`)
  }

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
}

function buildFilterClauses(filters = {}, { latestOnlyDefault = true } = {}) {
  const latestFilterApplies = latestOnlyDefault && sanitizeList(filters.trimestres).length === 0
  let whereClause = buildWhereClause(filters)
  if (latestFilterApplies) {
    whereClause = whereClause ? `${whereClause} AND trimestre_rank = 1` : 'WHERE trimestre_rank = 1'
  }
  return { whereClause, latestFilterApplies }
}

function getWhereExpression(filters = {}) {
  const clause = buildWhereClause(filters)
  return clause ? clause.replace(/^WHERE\s+/i, '') : ''
}

export async function loadDataset({ csvUrl, csvText, filename } = {}) {
  if (!csvUrl && !csvText) {
    throw new Error('É necessário informar o caminho do CSV de indicadores.')
  }
  const db = await getDuckDB()
  const conn = await getConnection()

  await db.dropFiles()
  await conn.query('DROP VIEW IF EXISTS diops_curated')
  await conn.query('DROP TABLE IF EXISTS diops_raw')
  invalidateSchemaCache()

  const text = csvText ?? (await fetchAsText(csvUrl))
  await db.registerFileText('diops.csv', text)
  await conn.query("CREATE OR REPLACE TABLE diops_raw AS SELECT * FROM read_csv_auto('diops.csv', HEADER=TRUE, SAMPLE_SIZE=-1, ALL_VARCHAR=TRUE)")

  await conn.query(`
    CREATE OR REPLACE VIEW ${DEFAULT_VIEW} AS
    WITH parsed AS (
      SELECT
        TRIM(nome_operadora) AS nome_operadora,
        TRIM(modalidade) AS modalidade,
        TRIM(porte) AS porte,
        CASE
          WHEN lower(TRIM(COALESCE(ativa, ''))) IN ('sim', 's', '1', 'true') THEN TRUE
          WHEN lower(TRIM(COALESCE(ativa, ''))) IN ('nao', 'não', 'n', '0', 'false') THEN FALSE
          ELSE NULL
        END AS ativa,
        CASE
          WHEN lower(TRIM(COALESCE(uniodonto, ''))) IN ('sim', 's', '1', 'true') THEN TRUE
          WHEN lower(TRIM(COALESCE(uniodonto, ''))) IN ('nao', 'não', 'n', '0', 'false') THEN FALSE
          ELSE NULL
        END AS uniodonto,
        TRY_CAST(NULLIF(qt_beneficiarios_periodo, '') AS BIGINT) AS qt_beneficiarios,
        TRY_CAST(NULLIF(reg_ans, '') AS BIGINT) AS reg_ans,
        TRY_CAST(NULLIF(ano, '') AS INTEGER) AS ano,
        TRY_CAST(NULLIF(trimestre, '') AS INTEGER) AS trimestre,
        TRY_CAST(NULLIF(resultado_liquido, '') AS DOUBLE) AS resultado_liquido,
        TRY_CAST(NULLIF("311_vr_contraprestacoes", '') AS DOUBLE) AS vr_contraprestacoes,
        TRY_CAST(NULLIF("311121_vr_contraprestacoes_pre", '') AS DOUBLE) AS vr_contraprestacoes_pre,
        TRY_CAST(NULLIF("1231_vr_creditos_operacoes_saude", '') AS DOUBLE) AS vr_creditos_operacoes_saude,
        TRY_CAST(NULLIF("3_vr_receitas", '') AS DOUBLE) AS vr_receitas,
        TRY_CAST(NULLIF("4_vr_despesas", '') AS DOUBLE) AS vr_despesas,
        TRY_CAST(NULLIF("36_vr_receitas_patrimoniais", '') AS DOUBLE) AS vr_receitas_patrimoniais,
        TRY_CAST(NULLIF("41_vr_eventos_liquidos", '') AS DOUBLE) AS vr_eventos_liquidos,
        TRY_CAST(NULLIF("2111_vr_eventos_a_liquidar", '') AS DOUBLE) AS vr_eventos_a_liquidar,
        TRY_CAST(NULLIF("43_vr_desp_comerciais", '') AS DOUBLE) AS vr_desp_comerciais,
        TRY_CAST(NULLIF("464119113_vr_desp_comerciais_promocoes", '') AS DOUBLE) AS vr_desp_comerciais_promocoes,
        TRY_CAST(NULLIF("46_vr_desp_administrativas", '') AS DOUBLE) AS vr_desp_administrativas,
        TRY_CAST(NULLIF("44_vr_outras_desp_oper", '') AS DOUBLE) AS vr_outras_desp_oper,
        TRY_CAST(NULLIF("47_vr_desp_tributos", '') AS DOUBLE) AS vr_desp_tributos,
        TRY_CAST(NULLIF("35_vr_receitas_fin", '') AS DOUBLE) AS vr_receitas_fin,
        TRY_CAST(NULLIF("45_vr_despesas_fin", '') AS DOUBLE) AS vr_despesas_fin,
        TRY_CAST(NULLIF("33_vr_outras_receitas_operacionais", '') AS DOUBLE) AS vr_outras_receitas_operacionais,
        TRY_CAST(NULLIF("12_vr_ativo_circulante", '') AS DOUBLE) AS vr_ativo_circulante,
        TRY_CAST(NULLIF("13_vr_ativo_permanente", '') AS DOUBLE) AS vr_ativo_permanente,
        TRY_CAST(NULLIF("21_vr_passivo_circulante", '') AS DOUBLE) AS vr_passivo_circulante,
        TRY_CAST(NULLIF("23_vr_passivo_nao_circulante", '') AS DOUBLE) AS vr_passivo_nao_circulante,
        TRY_CAST(NULLIF("25_vr_patrimonio_liquido", '') AS DOUBLE) AS vr_patrimonio_liquido,
        TRY_CAST(NULLIF("31_vr_ativos_garantidores", '') AS DOUBLE) AS vr_ativos_garantidores,
        TRY_CAST(NULLIF("32_vr_provisoes_tecnicas", '') AS DOUBLE) AS vr_provisoes_tecnicas,
        TRY_CAST(NULLIF("2521_vr_pl_ajustado", '') AS DOUBLE) AS vr_pl_ajustado,
        TRY_CAST(NULLIF("2522_vr_margem_solvencia_exigida", '') AS DOUBLE) AS vr_margem_solvencia_exigida
      FROM diops_raw
      WHERE TRY_CAST(NULLIF(ano, '') AS INTEGER) IS NOT NULL
        AND TRY_CAST(NULLIF(trimestre, '') AS INTEGER) IS NOT NULL
    ), enriched AS (
      SELECT
        parsed.*,
        COALESCE(vr_receitas_fin, 0) - COALESCE(vr_despesas_fin, 0) AS resultado_financeiro,
        ${metricSelectSql},
        (ano * 10 + trimestre) AS periodo_id,
        CONCAT(ano, 'T', trimestre) AS periodo,
        ROW_NUMBER() OVER (PARTITION BY nome_operadora, ano ORDER BY trimestre DESC NULLS LAST) AS trimestre_rank
      FROM parsed
    )
    SELECT * FROM enriched;
  `)

  await conn.query('ANALYZE')

  return {
    source: csvText ? 'upload' : 'csv',
    filename: filename ?? (csvUrl ? csvUrl.split('/').pop() : null),
    updatedAt: new Date().toISOString(),
  }
}

export async function persistDatasetFile(filename, content) {
  try {
    const response = await fetch('/api/upload-dataset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename, content }),
    })
    if (!response.ok) {
      throw new Error(`Falha ao salvar arquivo no servidor: ${response.status}`)
    }
    return await response.json()
  } catch (err) {
    console.warn('[DataService] Não foi possível salvar o CSV no servidor', err)
    return null
  }
}

export async function fetchAvailablePeriods() {
  const conn = await getConnection()
  const query = `
    SELECT DISTINCT ano, trimestre, CONCAT(ano, 'T', trimestre) AS periodo
    FROM ${DEFAULT_VIEW}
    WHERE ano IS NOT NULL AND trimestre IS NOT NULL
    ORDER BY ano DESC, trimestre DESC
  `
  const table = await conn.query(query)
  return tableToObjects(table).map((row) => ({
    ano: row.ano,
    trimestre: row.trimestre,
    periodo: row.periodo ?? `${row.ano}T${row.trimestre}`,
  }))
}

export async function fetchOperatorOptions({ anos = [], trimestres = [] } = {}) {
  const conn = await getConnection()
  const clauses = []
  if (anos.length) clauses.push(`ano IN (${anos.join(',')})`)
  if (trimestres.length) clauses.push(`trimestre IN (${trimestres.join(',')})`)
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const query = `
    SELECT DISTINCT nome_operadora
    FROM ${DEFAULT_VIEW}
    ${whereClause}
    ORDER BY nome_operadora
  `
  const table = await conn.query(query)
  return tableToObjects(table).map((row) => row.nome_operadora)
}

export async function fetchOperatorPeriods(operatorName) {
  if (!operatorName) return []
  const conn = await getConnection()
  const query = `
    SELECT DISTINCT ano, trimestre
    FROM ${DEFAULT_VIEW}
    WHERE nome_operadora = '${sanitizeSql(operatorName)}'
    ORDER BY ano, trimestre
  `
  const table = await conn.query(query)
  return tableToObjects(table)
}

async function summarizePeriod(filters) {
  const conn = await getConnection()
  const { whereClause } = buildFilterClauses(filters)
  const query = `
    WITH base AS (
      SELECT *
      FROM ${DEFAULT_VIEW}
      ${whereClause}
    ), period_data AS (
      SELECT
        periodo_id,
        periodo,
        COUNT(DISTINCT nome_operadora) AS operadoras,
        SUM(COALESCE(qt_beneficiarios, 0)) AS beneficiarios,
        ${metricFormulas
          .filter((metric) => metric.showInCards)
          .map((metric) => `AVG(${metric.id}) AS ${metric.id}`)
          .join(',\n        ')},
        SUM(COALESCE(vr_receitas, 0)) AS vr_receitas,
        SUM(COALESCE(vr_despesas, 0)) AS vr_despesas,
        SUM(COALESCE(vr_contraprestacoes, 0)) AS vr_contraprestacoes,
        SUM(COALESCE(vr_contraprestacoes_pre, 0)) AS vr_contraprestacoes_pre,
        SUM(COALESCE(vr_creditos_operacoes_saude, 0)) AS vr_creditos_operacoes_saude,
        SUM(COALESCE(vr_eventos_liquidos, 0)) AS vr_eventos_liquidos,
        SUM(COALESCE(vr_eventos_a_liquidar, 0)) AS vr_eventos_a_liquidar,
        SUM(COALESCE(vr_desp_comerciais, 0)) AS vr_desp_comerciais,
        SUM(COALESCE(vr_desp_comerciais_promocoes, 0)) AS vr_desp_comerciais_promocoes,
        SUM(COALESCE(vr_desp_administrativas, 0)) AS vr_desp_administrativas,
        SUM(COALESCE(vr_outras_desp_oper, 0)) AS vr_outras_desp_oper,
        SUM(COALESCE(vr_desp_tributos, 0)) AS vr_desp_tributos,
        SUM(COALESCE(vr_receitas_fin, 0)) AS vr_receitas_fin,
        SUM(COALESCE(vr_despesas_fin, 0)) AS vr_despesas_fin,
        SUM(COALESCE(resultado_financeiro, 0)) AS resultado_financeiro,
        SUM(COALESCE(resultado_liquido, 0)) AS resultado_liquido
      FROM base
      GROUP BY periodo_id, periodo
    )
    SELECT *
    FROM period_data
    ORDER BY periodo_id DESC
    LIMIT 1
  `
  const table = await conn.query(query)
  const [row] = tableToObjects(table)
  return row ?? null
}

export async function fetchKpiSummary(filters) {
  const current = await summarizePeriod(filters)
  if (!current) return null
  const periodId = current.periodo_id
  let previous = null
  if (periodId && periodId >= 10) {
    const previousFilters = {
      ...filters,
      anos: [Math.floor((periodId - 10) / 10)],
      trimestres: [Number(String(periodId - 10).slice(-1))],
    }
    previous = await summarizePeriod(previousFilters)
  }
  return { ...current, previousPeriod: previous }
}

export async function fetchTrendSeries(metric, filters, comparisonContext = null) {
  const conn = await getConnection()
  const sqlMetric = metric ?? 'sinistralidade_pct'
  if (comparisonContext?.operatorName) {
    const sanitizedName = sanitizeSql(comparisonContext.operatorName)
    const baseFilter = buildWhereClause({ ...filters, search: '' })
    const operatorFilter = baseFilter ? baseFilter.replace(/^WHERE\s+/i, '') : ''
    const comparisonFilter = getWhereExpression(comparisonContext.filters ?? {})
    const peerWherePieces = [`nome_operadora <> '${sanitizedName}'`]
    if (comparisonFilter) {
      peerWherePieces.push(`(${comparisonFilter})`)
    }
    const peerWhere = peerWherePieces.length ? `WHERE ${peerWherePieces.join('\n        AND ')}` : ''
    const query = `
      WITH operador AS (
        SELECT ano, trimestre, periodo, ${sqlMetric} AS valor
        FROM ${DEFAULT_VIEW}
        WHERE nome_operadora = '${sanitizedName}'
        ${operatorFilter ? ` AND ${operatorFilter}` : ''}
      ), pares AS (
        SELECT ano, trimestre, periodo, AVG(${sqlMetric}) AS valor
        FROM ${DEFAULT_VIEW}
        ${peerWhere}
        ${operatorFilter ? `${peerWhere ? ' AND ' : ' WHERE '}${operatorFilter}` : ''}
        GROUP BY ano, trimestre, periodo
      )
      SELECT
        COALESCE(operador.ano, pares.ano) AS ano,
        COALESCE(operador.trimestre, pares.trimestre) AS trimestre,
        COALESCE(operador.periodo, pares.periodo) AS periodo,
        operador.valor AS operador_valor,
        pares.valor AS pares_valor
      FROM operador
      FULL OUTER JOIN pares ON operador.ano = pares.ano AND operador.trimestre = pares.trimestre
      ORDER BY ano, trimestre
    `
    const table = await conn.query(query)
    return tableToObjects(table)
  }
  const { whereClause } = buildFilterClauses(filters, { latestOnlyDefault: false })
  const query = `
    SELECT ano, trimestre, periodo, AVG(${sqlMetric}) AS valor
    FROM ${DEFAULT_VIEW}
    ${whereClause}
    GROUP BY ano, trimestre, periodo
    ORDER BY ano, trimestre
  `
  const table = await conn.query(query)
  return tableToObjects(table)
}

export async function fetchOperatorSnapshot(nomeOperadora, targetPeriod = {}, comparisonFilters = {}) {
  if (!nomeOperadora) {
    return {
      operator: null,
      peers: null,
      availablePeriods: [],
      selectedPeriod: null,
    }
  }
  const conn = await getConnection()
  const sanitizedName = sanitizeSql(nomeOperadora)
  const periodsTable = await conn.query(
    `SELECT ano, trimestre, periodo FROM ${DEFAULT_VIEW} WHERE nome_operadora = '${sanitizedName}' ORDER BY ano DESC, trimestre DESC`,
  )
  const availablePeriods = tableToObjects(periodsTable)
  if (!availablePeriods.length) {
    return {
      operator: null,
      peers: null,
      availablePeriods: [],
      selectedPeriod: null,
    }
  }
  const resolvedPeriod =
    availablePeriods.find((item) => item.ano === targetPeriod?.ano && item.trimestre === targetPeriod?.trimestre) ?? availablePeriods[0]
  const operatorTable = await conn.query(`
    SELECT *
    FROM ${DEFAULT_VIEW}
    WHERE nome_operadora = '${sanitizedName}'
      AND ano = ${resolvedPeriod.ano}
      AND trimestre = ${resolvedPeriod.trimestre}
    LIMIT 1
  `)
  const operatorRow = tableToObjects(operatorTable)[0] ?? null

  const comparisonExpression = getWhereExpression(comparisonFilters)
  const wherePieces = [
    `ano = ${resolvedPeriod.ano}`,
    `trimestre = ${resolvedPeriod.trimestre}`,
    `nome_operadora <> '${sanitizedName}'`,
  ]
  if (comparisonExpression) {
    wherePieces.push(`(${comparisonExpression})`)
  }
  const peerQuery = `
    SELECT
      COUNT(DISTINCT nome_operadora) AS peer_count,
      ${metricFormulas
        .filter((metric) => metric.showInCards)
        .map((metric) => `AVG(${metric.id}) AS ${metric.id}`)
        .join(',\n        ')}
    FROM ${DEFAULT_VIEW}
    WHERE ${wherePieces.join('\n        AND ')}
  `
  const peerTable = await conn.query(peerQuery)
  const peersRow = tableToObjects(peerTable)[0] ?? null

  return {
    operator: operatorRow,
    peers: peersRow,
    availablePeriods,
    selectedPeriod: resolvedPeriod,
  }
}

export async function fetchOperatorLatestSnapshot(nomeOperadora) {
  if (!nomeOperadora) return null
  const conn = await getConnection()
  const query = `
    SELECT *
    FROM ${DEFAULT_VIEW}
    WHERE nome_operadora = '${sanitizeSql(nomeOperadora)}'
    ORDER BY ano DESC, trimestre DESC
    LIMIT 1
  `
  const table = await conn.query(query)
  return tableToObjects(table)[0] ?? null
}

export async function fetchRanking(metric, filters, limit = 10, order = 'DESC', options = {}) {
  const conn = await getConnection()
  const { whereClause } = buildFilterClauses(filters)
  const sqlMetric = metric ?? 'resultado_liquido'
  const metricDef = metricFormulas.find((item) => item.id === metric)
  const lowerIsBetter = metricDef?.trend === 'lower'
  const aggregator = metricDef?.aggregate === 'sum' ? 'SUM' : 'AVG'
  const requestedOrder = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
  const effectiveOrder = lowerIsBetter ? (requestedOrder === 'ASC' ? 'DESC' : 'ASC') : requestedOrder
  const baseQuery = `
    WITH base AS (
      SELECT *
      FROM ${DEFAULT_VIEW}
      ${whereClause}
    ), aggregated AS (
      SELECT
        nome_operadora,
        ${aggregator}(${sqlMetric}) AS valor
      FROM base
      GROUP BY nome_operadora
    ), ranked AS (
      SELECT
        nome_operadora,
        valor,
        ROW_NUMBER() OVER (ORDER BY valor ${effectiveOrder}) AS rank_position
      FROM aggregated
    )
    SELECT *
    FROM ranked
    ORDER BY rank_position
    LIMIT ${limit}
  `
  const table = await conn.query(baseQuery)
  const rows = tableToObjects(table)

  let operatorRow = null
  if (options?.operatorName) {
    const sanitizedOperator = sanitizeSql(options.operatorName)
    const operatorClause = `nome_operadora = '${sanitizedOperator}'`
    const operatorWhere = whereClause ? `${whereClause} AND ${operatorClause}` : `WHERE ${operatorClause}`
    const operatorQuery = `
      WITH base AS (
        SELECT *
        FROM ${DEFAULT_VIEW}
        ${operatorWhere}
      ), aggregated AS (
        SELECT
          nome_operadora,
          ${aggregator}(${sqlMetric}) AS valor
        FROM base
        GROUP BY nome_operadora
      ), ranked AS (
        SELECT
          nome_operadora,
          valor,
          ROW_NUMBER() OVER (ORDER BY valor ${effectiveOrder}) AS rank_position
        FROM aggregated
      )
      SELECT * FROM ranked LIMIT 1
    `
    const operatorTable = await conn.query(operatorQuery)
    operatorRow = tableToObjects(operatorTable)[0] ?? null
  }

  return { rows, operatorRow }
}

export async function fetchScatter(xMetric, yMetric, filters, limit = 200) {
  const conn = await getConnection()
  const { whereClause } = buildFilterClauses(filters)
  const query = `
    WITH base AS (
      SELECT *
      FROM ${DEFAULT_VIEW}
      ${whereClause}
    )
    SELECT
      nome_operadora,
      porte,
      modalidade,
      qt_beneficiarios,
      ${xMetric} AS x_value,
      ${yMetric} AS y_value,
      resultado_liquido
    FROM base
    ORDER BY qt_beneficiarios DESC NULLS LAST
    LIMIT ${limit}
  `
  const table = await conn.query(query)
  return tableToObjects(table)
}

export async function fetchTableData(filters, options = {}) {
  const conn = await getConnection()
  const includeAllColumns = options.includeAllColumns === true
  const ignorePeriodFilters = options.ignorePeriodFilters === true
  const exactOperatorName = options.operatorName ?? null

  let effectiveFilters = { ...filters }
  if (ignorePeriodFilters) {
    effectiveFilters = {
      ...effectiveFilters,
      anos: [],
      trimestres: [],
    }
  }

  const { whereClause } = buildFilterClauses(effectiveFilters, {
    latestOnlyDefault: ignorePeriodFilters ? false : true,
  })

  let finalWhereClause = whereClause
  if (exactOperatorName) {
    const clause = `nome_operadora = '${sanitizeSql(exactOperatorName)}'`
    finalWhereClause = finalWhereClause ? `${finalWhereClause} AND ${clause}` : `WHERE ${clause}`
  }

  let selectedFields = options.columns?.length ? options.columns : DETAIL_TABLE_FIELDS
  if (includeAllColumns) {
    selectedFields = await getViewColumns(conn)
  }
  if (!selectedFields || !selectedFields.length) {
    selectedFields = ['*']
  }

  const projection = selectedFields.join(', ')
  const limit = options.limit ?? 500
  const offset = options.offset ?? 0
  const query = `
    SELECT ${projection}
    FROM ${DEFAULT_VIEW}
    ${finalWhereClause ?? ''}
    ORDER BY ano DESC, trimestre DESC, nome_operadora
    LIMIT ${limit} OFFSET ${offset}
  `
  const table = await conn.query(query)
  const rows = tableToObjects(table)
  return {
    rows,
    columns: selectedFields,
  }
}

export function getMetricsCatalog() {
  return metricFormulas.map(({ id, label, description, format }) => ({ id, label, description, format }))
}
