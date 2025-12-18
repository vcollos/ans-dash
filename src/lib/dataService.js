import { metricFormulas, metricSql } from './metricFormulas.js'
import {
  applyDerivedMonetaryValues,
  monetaryIndicatorColumnMap,
  monetaryIndicatorColumns,
  monetaryIndicatorPhysicalColumns,
} from './monetaryIndicators'
import {
  REGULATORY_INDICATORS,
  REGULATORY_PERCENTILE_KEYS,
  REGULATORY_PERCENTILES,
  getIndicatorSql,
  evaluateRegulatoryScore,
} from './regulatoryScore'

export const VIRTUAL_OPERATOR_UNIODONTO = 'Sistema Uniodonto'

export const DETAIL_TABLE_FIELDS = [
  'nome_operadora',
  'modalidade',
  'porte',
  'reg_ans',
  'ano',
  'trimestre',
  'qt_beneficiarios',
  'qt_prestadores',
  'sinistralidade_pct',
  'sinistralidade_acumulada_pct',
  'sinistralidade_trimestral_pct',
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
  'vr_contraprestacoes_efetivas',
  'vr_corresponsabilidade_cedida',
  'vr_eventos_liquidos',
]

const DEFAULT_VIEW = import.meta.env?.VITE_DATASET_VIEW ?? 'indicadores_curados'
const VIEW_IDENTIFIER = (() => {
  const raw = DEFAULT_VIEW.replace(/"/g, '')
  if (raw.includes('.')) {
    const [schema, table] = raw.split('.')
    return {
      schema: schema && schema.trim().length ? schema.trim() : 'public',
      table: table && table.trim().length ? table.trim() : null,
    }
  }
  return {
    schema: 'public',
    table: raw.trim(),
  }
})()
let cachedViewColumns = null

const sanitizeList = (values = []) => values.filter((value) => value !== null && value !== undefined && value !== '')
const sanitizeSql = (value) => (value ? value.replaceAll('\\', '\\\\').replaceAll("'", "''") : value)
const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, '\\`')}\``

const isVirtualUniodontoOperator = (operatorName) => operatorName === VIRTUAL_OPERATOR_UNIODONTO
const stripOperatorSelection = (filters = {}) => {
  const { operatorName: _operatorName, search: _search, regAns: _regAns, ...rest } = filters ?? {}
  return {
    ...rest,
    operatorName: null,
    search: '',
    regAns: [],
  }
}

function buildPorteExpression({ beneficiariosColumn = 'qt_beneficiarios' } = {}) {
  return `
    COALESCE(
      porte,
      CASE
        WHEN ${beneficiariosColumn} IS NULL THEN NULL
        WHEN ${beneficiariosColumn} <= 19999 THEN 'Pequeno Porte'
        WHEN ${beneficiariosColumn} <= 99999 THEN 'Médio Porte'
        ELSE 'Grande Porte'
      END
    )
  `.trim()
}

function buildRegulatoryIndicatorProjection({ aggregate = false } = {}) {
  return REGULATORY_INDICATORS.map((indicator) => {
    const expression = getIndicatorSql(indicator.id)
    if (!expression) {
      throw new Error(`Sem expressão SQL para indicador ${indicator.id}`)
    }
    const trimmed = expression.trim()
    if (aggregate) {
      return `AVG(${trimmed}) AS ${indicator.id}`
    }
    return `${trimmed} AS ${indicator.id}`
  })
}

function buildRegulatoryPercentileFragments(baseAlias = 'peer_base') {
  const fragments = []
  REGULATORY_INDICATORS.forEach((indicator) => {
    const column = `${baseAlias}.${indicator.id}`
    REGULATORY_PERCENTILE_KEYS.forEach((key) => {
      const percentileValue = REGULATORY_PERCENTILES[key]
      const offset = Math.round(percentileValue * 100)
      fragments.push(`APPROX_QUANTILES(${column}, 100)[OFFSET(${offset})] AS ${indicator.id}_${key}`)
    })
  })
  return fragments
}

function buildWhereClause(filters = {}) {
  const clauses = []
  if (filters.modalidades?.length) {
    const values = filters.modalidades.map((value) => `'${sanitizeSql(value)}'`)
    clauses.push(`modalidade IN (${values.join(',')})`)
  }
  if (filters.portes?.length) {
    const values = filters.portes.map((value) => `'${sanitizeSql(value)}'`)
    clauses.push(`${buildPorteExpression()} IN (${values.join(',')})`)
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

  if (filters.search && !filters.operatorName) {
    const v = sanitizeSql(filters.search).toLowerCase()
    clauses.push(`lower(nome_operadora) LIKE '%${v}%'`)
  }
  if (filters.operatorName) {
    if (isVirtualUniodontoOperator(filters.operatorName)) {
      clauses.push('COALESCE(uniodonto, FALSE) IS TRUE')
    } else {
      clauses.push(`nome_operadora = '${sanitizeSql(filters.operatorName)}'`)
    }
  }

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
}

function buildCohortFilters(filters = {}, { uniodonto } = {}) {
  const { operatorName: _operatorName, search: _search, regAns: _regAns, ...rest } = filters ?? {}
  return {
    ...rest,
    search: '',
    regAns: [],
    operatorName: null,
    uniodonto,
  }
}

const COHORT_AGGREGATE_SUM_COLUMNS = [
  'qt_beneficiarios',
  'qt_prestadores',
  ...monetaryIndicatorPhysicalColumns,
  'vr_conta_237',
  'vr_conta_271',
  'resultado_financeiro',
  'resultado_liquido_calculado',
  'resultado_liquido_final_ans',
  'resultado_liquido_informado',
  'resultado_liquido',
]

function buildCohortAggregateSelectList(sumColumns = COHORT_AGGREGATE_SUM_COLUMNS) {
  return sumColumns.map((column) => `SUM(COALESCE(${quoteIdentifier(column)}, 0)) AS ${quoteIdentifier(column)}`)
}

async function fetchVirtualCohortSnapshot(filters = {}, { label = VIRTUAL_OPERATOR_UNIODONTO } = {}) {
  const cohortFilters = buildCohortFilters(filters, { uniodonto: true })
  const { whereClause } = buildFilterClauses(cohortFilters, { latestOnlyDefault: false })
  const sumSelectList = buildCohortAggregateSelectList()
  const indicatorProjection = buildRegulatoryIndicatorProjection().join(',\n      ')
  const query = `
    WITH base AS (
      SELECT *
      FROM ${DEFAULT_VIEW}
      ${whereClause ?? ''}
    ), aggregated AS (
      SELECT
        ano,
        trimestre,
        periodo,
        periodo_id,
        COUNT(DISTINCT nome_operadora) AS cohort_count
        ${sumSelectList.length ? `,\n        ${sumSelectList.join(',\n        ')}` : ''}
      FROM base
      GROUP BY ano, trimestre, periodo, periodo_id
    ), latest AS (
      SELECT *
      FROM aggregated
      ORDER BY periodo_id DESC NULLS LAST, ano DESC, trimestre DESC
      LIMIT 1
    )
    SELECT
      '${sanitizeSql(label)}' AS nome_operadora,
      CAST(NULL AS STRING) AS reg_ans,
      CAST(NULL AS STRING) AS modalidade,
      CAST(TRUE AS BOOL) AS uniodonto,
      CAST(NULL AS BOOL) AS ativa,
      CASE
        WHEN latest.${quoteIdentifier('qt_beneficiarios')} IS NULL THEN NULL
        WHEN latest.${quoteIdentifier('qt_beneficiarios')} <= 19999 THEN 'Pequeno Porte'
        WHEN latest.${quoteIdentifier('qt_beneficiarios')} <= 99999 THEN 'Médio Porte'
        ELSE 'Grande Porte'
      END AS porte,
      latest.*
      ${cardMetricColumnsSql ? `,\n      ${cardMetricColumnsSql}` : ''}
      ${indicatorProjection ? `,\n      ${indicatorProjection}` : ''}
    FROM latest
  `
  const rows = await runQuery(query)
  return rows[0] ?? null
}

async function fetchVirtualMarketSnapshot(filters = {}, { label = 'Mercado (sem Uniodonto)' } = {}) {
  const marketFilters = buildCohortFilters(filters, { uniodonto: false })
  const { whereClause } = buildFilterClauses(marketFilters, { latestOnlyDefault: false })
  const sumSelectList = buildCohortAggregateSelectList()
  const indicatorProjection = buildRegulatoryIndicatorProjection().join(',\n      ')
  const query = `
    WITH base AS (
      SELECT *
      FROM ${DEFAULT_VIEW}
      ${whereClause ?? ''}
    ), aggregated AS (
      SELECT
        ano,
        trimestre,
        periodo,
        periodo_id,
        COUNT(DISTINCT nome_operadora) AS cohort_count
        ${sumSelectList.length ? `,\n        ${sumSelectList.join(',\n        ')}` : ''}
      FROM base
      GROUP BY ano, trimestre, periodo, periodo_id
    ), latest AS (
      SELECT *
      FROM aggregated
      ORDER BY periodo_id DESC NULLS LAST, ano DESC, trimestre DESC
      LIMIT 1
    )
    SELECT
      '${sanitizeSql(label)}' AS nome_operadora,
      CAST(NULL AS STRING) AS reg_ans,
      CAST(NULL AS STRING) AS modalidade,
      CAST(FALSE AS BOOL) AS uniodonto,
      CAST(NULL AS BOOL) AS ativa,
      CASE
        WHEN latest.${quoteIdentifier('qt_beneficiarios')} IS NULL THEN NULL
        WHEN latest.${quoteIdentifier('qt_beneficiarios')} <= 19999 THEN 'Pequeno Porte'
        WHEN latest.${quoteIdentifier('qt_beneficiarios')} <= 99999 THEN 'Médio Porte'
        ELSE 'Grande Porte'
      END AS porte,
      latest.*
      ${cardMetricColumnsSql ? `,\n      ${cardMetricColumnsSql}` : ''}
      ${indicatorProjection ? `,\n      ${indicatorProjection}` : ''}
    FROM latest
  `
  const rows = await runQuery(query)
  return rows[0] ?? null
}

function buildFilterClauses(filters = {}, { latestOnlyDefault = true } = {}) {
  const latestFilterApplies = latestOnlyDefault && sanitizeList(filters.trimestres).length === 0
  let whereClause = buildWhereClause(filters)
  if (latestFilterApplies) {
    whereClause = whereClause ? `${whereClause} AND trimestre_rank = 1` : 'WHERE trimestre_rank = 1'
  }

  return {
    whereClause,
  }
}

function getWhereExpression(filters = {}) {
  const clauses = []
  if (filters.modalidades?.length) {
    clauses.push(`modalidade IN (${filters.modalidades.map((value) => `'${sanitizeSql(value)}'`).join(',')})`)
  }
  if (filters.portes?.length) {
    clauses.push(`${buildPorteExpression()} IN (${filters.portes.map((value) => `'${sanitizeSql(value)}'`).join(',')})`)
  }
  if (filters.uniodonto !== undefined) {
    clauses.push(`COALESCE(uniodonto, FALSE) IS ${filters.uniodonto ? 'TRUE' : 'FALSE'}`)
  }
  if (filters.ativa !== undefined) {
    clauses.push(`ativa IS ${filters.ativa ? 'TRUE' : 'FALSE'}`)
  }
  return clauses.join(' AND ')
}

function resolveMonetaryColumnSource(column, availableColumns = []) {
  const candidates = monetaryIndicatorColumnMap[column] ?? [column]
  return candidates.find((candidate) => availableColumns.includes(candidate))
}

function buildMonetaryAggregateFragments(availableColumns = []) {
  return monetaryIndicatorPhysicalColumns.map((column) => {
    const source = resolveMonetaryColumnSource(column, availableColumns)
    const expression = source ? `COALESCE(base.${quoteIdentifier(source)}, 0)` : 'CAST(NULL AS NUMERIC)'
    return `SUM(${expression}) AS ${quoteIdentifier(column)}`
  })
}

function buildMonetarySelectList(alias, prefix = '') {
  if (!monetaryIndicatorPhysicalColumns.length) return ''
  return monetaryIndicatorPhysicalColumns
    .map((column) => `${alias}.${quoteIdentifier(column)} AS ${quoteIdentifier(`${prefix}${column}`)}`)
    .join(',\n      ')
}

const computeDeltaPercent = (current, previous) => {
  if (current === null || current === undefined) return null
  if (previous === null || previous === undefined || previous === 0) return null
  const delta = ((current - previous) / Math.abs(previous)) * 100
  return Number.isFinite(delta) ? delta : null
}

const toNumeric = (value) => {
  if (value === null || value === undefined) return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

async function runQuery(sql) {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).error ?? `Falha ao executar consulta: ${response.status}`
    throw new Error(message)
  }
  const payload = await response.json()
  return payload.rows ?? []
}

async function getViewColumns() {
  if (cachedViewColumns) {
    return cachedViewColumns
  }
  const sampleRows = await runQuery(`SELECT * FROM ${DEFAULT_VIEW} LIMIT 1`)
  if (sampleRows[0]) {
    cachedViewColumns = Object.keys(sampleRows[0])
    return cachedViewColumns
  }
  cachedViewColumns = []
  return cachedViewColumns
}

export async function loadDataset(options = {}) {
  if (options.csvText || options.parquetBuffer) {
    throw new Error('Upload manual de dataset não é suportado quando conectado ao BigQuery.')
  }
  await runQuery(`SELECT 1 FROM ${DEFAULT_VIEW} LIMIT 1`)
  return {
    source: 'bigquery',
    filename: 'bigquery',
    updatedAt: new Date().toISOString(),
  }
}

export async function persistDatasetFile() {
  throw new Error('Persistência de dataset no servidor não é suportada no modo BigQuery.')
}

export async function fetchAvailablePeriods() {
  const rows = await runQuery(`
    SELECT DISTINCT ano, trimestre, CONCAT(ano, 'T', trimestre) AS periodo
    FROM ${DEFAULT_VIEW}
    WHERE ano IS NOT NULL AND trimestre IS NOT NULL
    ORDER BY ano DESC, trimestre DESC
  `)
  return rows.map((row) => ({
    ano: row.ano,
    trimestre: row.trimestre,
    periodo: row.periodo ?? `${row.ano}T${row.trimestre}`,
  }))
}

export async function fetchOperatorOptions({ anos = [], trimestres = [] } = {}) {
  const clauses = []
  if (anos.length) clauses.push(`ano IN (${anos.join(',')})`)
  if (trimestres.length) clauses.push(`trimestre IN (${trimestres.join(',')})`)
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = await runQuery(`
    SELECT DISTINCT nome_operadora
    FROM ${DEFAULT_VIEW}
    ${whereClause}
    ORDER BY nome_operadora
  `)
  const options = rows.map((row) => row.nome_operadora).filter(Boolean)
  return [VIRTUAL_OPERATOR_UNIODONTO, ...options]
}

export async function fetchOperatorPeriods(operatorName) {
  if (!operatorName) return []
  if (isVirtualUniodontoOperator(operatorName)) {
    const rows = await runQuery(`
      SELECT DISTINCT ano, trimestre
      FROM ${DEFAULT_VIEW}
      WHERE COALESCE(uniodonto, FALSE) IS TRUE
      ORDER BY ano, trimestre
    `)
    return rows
  }
  const rows = await runQuery(`
    SELECT DISTINCT ano, trimestre
    FROM ${DEFAULT_VIEW}
    WHERE nome_operadora = '${sanitizeSql(operatorName)}'
    ORDER BY ano, trimestre
  `)
  return rows
}

const cardMetricDefinitions = metricFormulas.filter((metric) => metric.showInCards)

const cardMetricSelectSql = cardMetricDefinitions.map((metric) => `AVG(${metricSql[metric.id].trim()}) AS ${metric.id}`).join(',\n        ')

const cardMetricColumnsSql = cardMetricDefinitions.map((metric) => `${metricSql[metric.id].trim()} AS ${metric.id}`).join(',\n        ')

async function summarizePeriod(filters) {
  const isVirtual = isVirtualUniodontoOperator(filters?.operatorName)
  const { whereClause } = buildFilterClauses(isVirtual ? buildCohortFilters(filters, { uniodonto: true }) : filters)
  const query = `
    WITH base AS (
      SELECT *
      FROM ${DEFAULT_VIEW}
      ${whereClause}
    ), period_raw AS (
      SELECT
        periodo_id,
        periodo,
        COUNT(DISTINCT nome_operadora) AS operadoras,
        SUM(COALESCE(qt_beneficiarios, 0)) AS beneficiarios,
        ${isVirtual ? cardMetricColumnsSql : cardMetricSelectSql},
        SUM(COALESCE(vr_receitas, 0)) AS vr_receitas,
        SUM(COALESCE(vr_despesas, 0)) AS vr_despesas,
        SUM(COALESCE(vr_contraprestacoes, 0)) AS vr_contraprestacoes,
        SUM(COALESCE(vr_contraprestacoes_efetivas, 0)) AS vr_contraprestacoes_efetivas,
        SUM(COALESCE(vr_contraprestacoes_pre, 0)) AS vr_contraprestacoes_pre,
        SUM(COALESCE(vr_corresponsabilidade_cedida, 0)) AS vr_corresponsabilidade_cedida,
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
        SUM(COALESCE(vr_receitas_patrimoniais, 0)) AS vr_receitas_patrimoniais,
        SUM(COALESCE(vr_outras_receitas_operacionais, 0)) AS vr_outras_receitas_operacionais,
        SUM(COALESCE(vr_ativo_circulante, 0)) AS vr_ativo_circulante,
        SUM(COALESCE(vr_ativo_permanente, 0)) AS vr_ativo_permanente,
        SUM(COALESCE(vr_passivo_circulante, 0)) AS vr_passivo_circulante,
        SUM(COALESCE(vr_passivo_nao_circulante, 0)) AS vr_passivo_nao_circulante,
        SUM(COALESCE(vr_patrimonio_liquido, 0)) AS vr_patrimonio_liquido,
        SUM(COALESCE(vr_ativos_garantidores, 0)) AS vr_ativos_garantidores,
        SUM(COALESCE(vr_provisoes_tecnicas, 0)) AS vr_provisoes_tecnicas,
        SUM(COALESCE(vr_pl_ajustado, 0)) AS vr_pl_ajustado,
        SUM(COALESCE(vr_margem_solvencia_exigida, 0)) AS vr_margem_solvencia_exigida,
        SUM(COALESCE(vr_conta_61, 0)) AS vr_conta_61,
        SUM(COALESCE(resultado_liquido_calculado, 0)) AS resultado_liquido_calculado,
        SUM(COALESCE(resultado_liquido_final_ans, 0)) AS resultado_liquido_final_ans,
        SUM(COALESCE(resultado_liquido_informado, 0)) AS resultado_liquido_informado,
        SUM(COALESCE(resultado_liquido, 0)) AS resultado_liquido
      FROM base
      GROUP BY periodo_id, periodo
    ), period_data AS (
      SELECT *
      FROM period_raw
    )
    SELECT
      *
    FROM period_data
    ORDER BY periodo_id DESC
    LIMIT 1
  `
  const rows = await runQuery(query)
  return rows[0] ?? null
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

function extractMonetaryValues(row) {
  const baseValues = {}
  monetaryIndicatorPhysicalColumns.forEach((column) => {
    baseValues[column] = row?.[column] === null || row?.[column] === undefined ? null : Number(row[column])
  })
  applyDerivedMonetaryValues(baseValues)
  const resolved = {}
  monetaryIndicatorColumns.forEach((column) => {
    resolved[column] = baseValues[column] ?? null
  })
  return resolved
}

async function queryMonetarySnapshot(filters, availableColumns, options = {}) {
  const { whereClause } = buildFilterClauses(filters, options)
  const aggregateFragments = buildMonetaryAggregateFragments(availableColumns)
  const selectList = buildMonetarySelectList('latest')
  const query = `
    WITH base AS (
      SELECT *
      FROM ${DEFAULT_VIEW}
      ${whereClause}
    ), aggregated AS (
      SELECT
        periodo_id,
        periodo,
        ano,
        trimestre,
        ${aggregateFragments.join(',\n        ')}
      FROM base
      GROUP BY periodo_id, periodo, ano, trimestre
    ), latest AS (
      SELECT *
      FROM aggregated
      ORDER BY periodo_id DESC NULLS LAST, ano DESC, trimestre DESC
      LIMIT 1
    )
    SELECT
      latest.periodo_id,
      latest.periodo,
      latest.ano,
      latest.trimestre
      ${selectList ? `,\n      ${selectList}` : ''}
    FROM latest
  `
  const rows = await runQuery(query)
  return rows[0] ?? null
}

export async function fetchMonetarySummary(filters = {}) {
  const availableColumns = await getViewColumns()
  const currentRow = await queryMonetarySnapshot(filters, availableColumns)
  if (!currentRow) return null
  const currentValues = extractMonetaryValues(currentRow)
  let previousRow = null
  if (typeof currentRow.ano === 'number' && typeof currentRow.trimestre === 'number' && currentRow.ano > 0) {
    const previousFilters = {
      ...filters,
      anos: [currentRow.ano - 1],
      trimestres: [currentRow.trimestre],
    }
    previousRow = await queryMonetarySnapshot(previousFilters, availableColumns, { latestOnlyDefault: false })
  }
  const previousComputedValues = previousRow ? extractMonetaryValues(previousRow) : null
  const values = {}
  const previousValues = {}
  const deltas = {}
  monetaryIndicatorColumns.forEach((column) => {
    values[column] = currentValues[column] ?? null
    previousValues[column] = previousComputedValues?.[column] ?? null
    deltas[column] = computeDeltaPercent(values[column], previousValues[column])
  })
  return {
    period: currentRow.periodo
      ? {
          label: currentRow.periodo,
          ano: currentRow.ano,
          trimestre: currentRow.trimestre,
          periodo_id: currentRow.periodo_id ?? null,
        }
      : null,
    previousPeriod:
      previousRow && previousRow.periodo
        ? {
            label: previousRow.periodo,
            ano: previousRow.ano,
            trimestre: previousRow.trimestre,
          }
        : null,
    values,
    previousValues,
    deltas,
  }
}

export async function fetchRegulatoryReport(operatorFilters = {}, peerFilters = {}) {
  if (!operatorFilters?.operatorName) return null
  const indicatorProjection = buildRegulatoryIndicatorProjection().join(',\n        ')
  const percentileFragments = buildRegulatoryPercentileFragments()
  const isVirtual = isVirtualUniodontoOperator(operatorFilters.operatorName)
  if (isVirtual) {
    const operator = await fetchVirtualCohortSnapshot(operatorFilters)
    if (!operator) return null
    const peers = await fetchRegulatoryPeerStats(peerFilters)
    return { operator, peers }
  }
  const { whereClause: operatorWhereClause } = buildFilterClauses(
    isVirtual ? buildCohortFilters(operatorFilters, { uniodonto: true }) : operatorFilters,
    { latestOnlyDefault: false },
  )
  const { whereClause: peerWhereClause } = buildFilterClauses(peerFilters, { latestOnlyDefault: false })
  const peerWhere = peerWhereClause ?? ''
  const query = `
    WITH operator_row AS (
      SELECT
        ${isVirtual ? `'${sanitizeSql(VIRTUAL_OPERATOR_UNIODONTO)}' AS nome_operadora` : 'nome_operadora'},
        ${isVirtual ? 'CAST(NULL AS STRING) AS reg_ans' : 'reg_ans'},
        ano,
        trimestre,
        periodo
        ${indicatorProjection ? `,\n        ${indicatorProjection}` : ''}
      FROM ${DEFAULT_VIEW}
      ${operatorWhereClause}
      ORDER BY ano DESC, trimestre DESC
      LIMIT 1
    ), peer_base AS (
      SELECT
        ${indicatorProjection}
      FROM ${DEFAULT_VIEW}
      ${peerWhere}
    ), peer_stats AS (
      SELECT
        COUNT(*) AS peer_total
        ${percentileFragments.length ? `,\n        ${percentileFragments.join(',\n        ')}` : ''}
      FROM peer_base
    )
    SELECT
      operator_row AS operator,
      peer_stats AS peers
    FROM operator_row
    CROSS JOIN peer_stats
  `
  const rows = await runQuery(query)
  const payload = rows[0]
  if (!payload?.operator) {
    return null
  }
  return {
    operator: payload.operator,
    peers: payload.peers,
  }
}

export async function fetchRegulatoryScoreForFilters(baseFilters = {}, peerFilters = {}) {
  const indicatorProjection = buildRegulatoryIndicatorProjection().join(',\n        ')
  const aggregateProjection = buildRegulatoryIndicatorProjection({ aggregate: true }).join(',\n        ')
  const percentileFragments = buildRegulatoryPercentileFragments()
  const { whereClause: baseWhereClause } = buildFilterClauses(baseFilters, { latestOnlyDefault: false })
  const { whereClause: peerWhereClause } = buildFilterClauses(peerFilters, { latestOnlyDefault: false })
  const query = `
    WITH aggregate_operator AS (
      SELECT
        'Média dos filtros' AS nome_operadora,
        CAST(NULL AS STRING) AS reg_ans,
        CAST(NULL AS INT64) AS ano,
        CAST(NULL AS INT64) AS trimestre,
        CAST(NULL AS STRING) AS periodo
        ${aggregateProjection ? `,\n        ${aggregateProjection}` : ''}
      FROM ${DEFAULT_VIEW}
      ${baseWhereClause ?? ''}
    ), peer_base AS (
      SELECT
        ${indicatorProjection}
      FROM ${DEFAULT_VIEW}
      ${peerWhereClause ?? ''}
    ), peer_stats AS (
      SELECT
        COUNT(*) AS peer_total
        ${percentileFragments.length ? `,\n        ${percentileFragments.join(',\n        ')}` : ''}
      FROM peer_base
    )
    SELECT
      aggregate_operator AS operator,
      peer_stats AS peers
    FROM aggregate_operator
    CROSS JOIN peer_stats
  `
  const rows = await runQuery(query)
  const payload = rows[0]
  if (!payload?.operator) {
    return null
  }
  return {
    operator: payload.operator,
    peers: payload.peers,
  }
}

async function fetchRegulatoryPeerStats(filters = {}) {
  const indicatorProjection = buildRegulatoryIndicatorProjection().join(',\n        ')
  const percentileFragments = buildRegulatoryPercentileFragments()
  const { whereClause } = buildFilterClauses(stripOperatorSelection(filters), { latestOnlyDefault: false })
  const query = `
    WITH peer_base AS (
      SELECT
        ${indicatorProjection}
      FROM ${DEFAULT_VIEW}
      ${whereClause ?? ''}
    )
    SELECT
      COUNT(*) AS peer_total
      ${percentileFragments.length ? `,\n        ${percentileFragments.join(',\n        ')}` : ''}
    FROM peer_base
  `
  const rows = await runQuery(query)
  return rows[0] ?? null
}

export async function fetchTrendSeries(metric, filters, comparisonContext = null) {
  if (metric === 'regulatory_score') {
    return fetchRegulatoryScoreTrend(filters, comparisonContext)
  }
  const sqlMetric = metricSql[metric ?? 'sinistralidade_pct'] ?? metricSql.sinistralidade_pct
  if (comparisonContext?.operatorName) {
    const sanitizedName = sanitizeSql(comparisonContext.operatorName)
    const isVirtual = isVirtualUniodontoOperator(comparisonContext.operatorName)
    const baseFilter = buildWhereClause({ ...filters, search: '' })
    const operatorFilter = baseFilter ? baseFilter.replace(/^WHERE\s+/i, '') : ''
    const comparisonFilter = getWhereExpression(comparisonContext.filters ?? {})
    const { uniodonto: _ignoredUniodonto, ...comparisonWithoutUniodonto } = comparisonContext.filters ?? {}
    const operatorComparisonFilter = getWhereExpression(comparisonWithoutUniodonto)
    const peerWherePieces = [isVirtual ? 'COALESCE(uniodonto, FALSE) IS FALSE' : `nome_operadora <> '${sanitizedName}'`]
    if (comparisonFilter) {
      peerWherePieces.push(`(${comparisonFilter})`)
    }
    const peerWhere = peerWherePieces.length ? `WHERE ${peerWherePieces.join('\n        AND ')}` : ''
    if (isVirtual) {
      const sumSelectList = buildCohortAggregateSelectList()
      const cohortQuery = `
        WITH operador_base AS (
          SELECT *
          FROM ${DEFAULT_VIEW}
          WHERE COALESCE(uniodonto, FALSE) IS TRUE
          ${operatorFilter ? ` AND ${operatorFilter}` : ''}
          ${operatorComparisonFilter ? ` AND (${operatorComparisonFilter})` : ''}
        ), operador_agg AS (
          SELECT
            ano,
            trimestre,
            periodo
            ${sumSelectList.length ? `,\n        ${sumSelectList.join(',\n        ')}` : ''}
          FROM operador_base
          GROUP BY ano, trimestre, periodo
        ), pares_base AS (
          SELECT *
          FROM ${DEFAULT_VIEW}
          ${peerWhere}
          ${operatorFilter ? `${peerWhere ? ' AND ' : ' WHERE '}${operatorFilter}` : ''}
        ), pares_agg AS (
          SELECT
            ano,
            trimestre,
            periodo
            ${sumSelectList.length ? `,\n        ${sumSelectList.join(',\n        ')}` : ''}
          FROM pares_base
          GROUP BY ano, trimestre, periodo
        ), operador AS (
          SELECT ano, trimestre, periodo, ${sqlMetric} AS valor
          FROM operador_agg
        ), pares AS (
          SELECT ano, trimestre, periodo, ${sqlMetric} AS valor
          FROM pares_agg
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
      return runQuery(cohortQuery)
    }
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
    return runQuery(query)
  }
  const { whereClause } = buildFilterClauses(filters, { latestOnlyDefault: false })
  if (comparisonContext) {
    const periodScopedComparisonFilters = {
      ...(comparisonContext.filters ?? {}),
    }
    if (sanitizeList(filters?.anos).length) {
      periodScopedComparisonFilters.anos = sanitizeList(filters.anos)
    }
    if (sanitizeList(filters?.trimestres).length) {
      periodScopedComparisonFilters.trimestres = sanitizeList(filters.trimestres)
    }
    const comparisonWhereClause = buildWhereClause(periodScopedComparisonFilters)
    const query = `
      WITH base AS (
        SELECT ano, trimestre, periodo, AVG(${sqlMetric}) AS valor
        FROM ${DEFAULT_VIEW}
        ${whereClause}
        GROUP BY ano, trimestre, periodo
      ), pares AS (
        SELECT ano, trimestre, periodo, AVG(${sqlMetric}) AS valor
        FROM ${DEFAULT_VIEW}
        ${comparisonWhereClause}
        GROUP BY ano, trimestre, periodo
      )
      SELECT
        COALESCE(base.ano, pares.ano) AS ano,
        COALESCE(base.trimestre, pares.trimestre) AS trimestre,
        COALESCE(base.periodo, pares.periodo) AS periodo,
        base.valor AS operador_valor,
        pares.valor AS pares_valor
      FROM base
      FULL OUTER JOIN pares ON base.ano = pares.ano AND base.trimestre = pares.trimestre
      ORDER BY ano, trimestre
    `
    return runQuery(query)
  }
  const query = `
    SELECT ano, trimestre, periodo, AVG(${sqlMetric}) AS valor
    FROM ${DEFAULT_VIEW}
    ${whereClause}
    GROUP BY ano, trimestre, periodo
    ORDER BY ano, trimestre
  `
  return runQuery(query)
}

async function fetchRegulatoryScoreTrend(filters, comparisonContext = null) {
  if (comparisonContext?.operatorName) {
    const sanitizedName = sanitizeSql(comparisonContext.operatorName)
    const isVirtual = isVirtualUniodontoOperator(comparisonContext.operatorName)
    const indicatorProjection = buildRegulatoryIndicatorProjection().join(',\n        ')
    const aggregateProjection = buildRegulatoryIndicatorProjection({ aggregate: true }).join(',\n        ')
    const baseFilter = buildWhereClause({ ...filters, search: '' })
    const operatorFilter = baseFilter ? baseFilter.replace(/^WHERE\s+/i, '') : ''
    if (isVirtual) {
      const sumSelectList = buildCohortAggregateSelectList()
      const { uniodonto: _ignoredUniodonto, ...comparisonWithoutUniodonto } = comparisonContext.filters ?? {}
      const operatorComparisonFilter = getWhereExpression(comparisonWithoutUniodonto)
      const operatorQuery = `
        WITH operador_base AS (
          SELECT *
          FROM ${DEFAULT_VIEW}
          WHERE COALESCE(uniodonto, FALSE) IS TRUE
          ${operatorFilter ? ` AND ${operatorFilter}` : ''}
          ${operatorComparisonFilter ? ` AND (${operatorComparisonFilter})` : ''}
        ), operador_agg AS (
          SELECT
            ano,
            trimestre,
            periodo
            ${sumSelectList.length ? `,\n        ${sumSelectList.join(',\n        ')}` : ''}
          FROM operador_base
          GROUP BY ano, trimestre, periodo
        )
        SELECT
          ano,
          trimestre,
          periodo
          ${indicatorProjection ? `,\n        ${indicatorProjection}` : ''}
        FROM operador_agg
        ORDER BY ano, trimestre
      `
      const operatorRows = await runQuery(operatorQuery)
      if (!operatorRows.length) {
        return []
      }

      const comparisonFilters = {
        ...(comparisonContext.filters ?? {}),
      }
      const yearList = sanitizeList(filters?.anos)
      const quarterList = sanitizeList(filters?.trimestres)
      if (yearList.length) {
        comparisonFilters.anos = yearList
      }
      if (quarterList.length) {
        comparisonFilters.trimestres = quarterList
      }
      if (comparisonFilters.uniodonto === undefined) {
        comparisonFilters.uniodonto = false
      }
      const comparisonExpression = getWhereExpression(comparisonFilters)
      const peerWherePieces = ['COALESCE(uniodonto, FALSE) IS FALSE']
      if (comparisonExpression) {
        peerWherePieces.push(`(${comparisonExpression})`)
      }
      const peerWhere = peerWherePieces.length ? `WHERE ${peerWherePieces.join('\n          AND ')}` : ''
      const peersQuery = `
        WITH pares_base AS (
          SELECT *
          FROM ${DEFAULT_VIEW}
          ${peerWhere}
          ${operatorFilter ? `${peerWhere ? ' AND ' : ' WHERE '}${operatorFilter}` : ''}
        ), pares_agg AS (
          SELECT
            ano,
            trimestre,
            periodo
            ${sumSelectList.length ? `,\n        ${sumSelectList.join(',\n        ')}` : ''}
          FROM pares_base
          GROUP BY ano, trimestre, periodo
        )
        SELECT
          ano,
          trimestre,
          periodo
          ${indicatorProjection ? `,\n        ${indicatorProjection}` : ''}
        FROM pares_agg
        ORDER BY ano, trimestre
      `
      const peerRows = await runQuery(peersQuery)

      const peerStatsCache = new Map()
      async function getPeerStats(ano, trimestre) {
        const key = `${ano}-${trimestre}`
        if (peerStatsCache.has(key)) {
          return peerStatsCache.get(key)
        }
        const periodFilters = {
          ...comparisonFilters,
          anos: [ano],
          trimestres: [trimestre],
          uniodonto: false,
        }
        const stats = await fetchRegulatoryPeerStats(periodFilters)
        peerStatsCache.set(key, stats)
        return stats
      }

      const seriesMap = new Map()
      for (const row of operatorRows) {
        const periodPeerStats = await getPeerStats(row.ano, row.trimestre)
        const evaluation = evaluateRegulatoryScore({ operator: row, peers: periodPeerStats })
        const key = `${row.ano}-${row.trimestre}`
        seriesMap.set(key, {
          ano: row.ano,
          trimestre: row.trimestre,
          periodo: row.periodo,
          operador_valor: evaluation?.finalScore?.value ?? null,
          pares_valor: null,
        })
      }
      for (const row of peerRows) {
        const periodPeerStats = await getPeerStats(row.ano, row.trimestre)
        const evaluation = evaluateRegulatoryScore({ operator: row, peers: periodPeerStats })
        const key = `${row.ano}-${row.trimestre}`
        const entry =
          seriesMap.get(key) ??
          {
            ano: row.ano,
            trimestre: row.trimestre,
            periodo: row.periodo,
            operador_valor: null,
            pares_valor: null,
          }
        entry.pares_valor = evaluation?.finalScore?.value ?? null
        if (!entry.periodo) {
          entry.periodo = row.periodo
        }
        seriesMap.set(key, entry)
      }
      return Array.from(seriesMap.values()).sort((a, b) => {
        if (a.ano === b.ano) {
          return a.trimestre - b.trimestre
        }
        return a.ano - b.ano
      })
    }
    const operatorQuery = `
      SELECT
        ano,
        trimestre,
        periodo
        ${indicatorProjection ? `,\n        ${indicatorProjection}` : ''}
      FROM ${DEFAULT_VIEW}
      WHERE nome_operadora = '${sanitizedName}'
      ${operatorFilter ? ` AND ${operatorFilter}` : ''}
      ORDER BY ano, trimestre
    `
    const operatorRows = await runQuery(operatorQuery)
    if (!operatorRows.length) {
      return []
    }
    const comparisonFilters = {
      ...(comparisonContext.filters ?? {}),
    }
    const yearList = sanitizeList(filters?.anos)
    const quarterList = sanitizeList(filters?.trimestres)
    if (yearList.length) {
      comparisonFilters.anos = yearList
    }
    if (quarterList.length) {
      comparisonFilters.trimestres = quarterList
    }
    const { whereClause: comparisonWhereClause } = buildFilterClauses(comparisonFilters, { latestOnlyDefault: false })
    const peersQuery = `
      SELECT
        ano,
        trimestre,
        periodo
        ${aggregateProjection ? `,\n        ${aggregateProjection}` : ''}
      FROM ${DEFAULT_VIEW}
      ${comparisonWhereClause ?? ''}
      GROUP BY ano, trimestre, periodo
      ORDER BY ano, trimestre
    `
    const peerRows = await runQuery(peersQuery)
    const peerStatsCache = new Map()
    async function getPeerStats(ano, trimestre) {
      const key = `${ano}-${trimestre}`
      if (peerStatsCache.has(key)) {
        return peerStatsCache.get(key)
      }
      const periodFilters = {
        ...comparisonFilters,
        anos: [ano],
        trimestres: [trimestre],
      }
      const stats = await fetchRegulatoryPeerStats(periodFilters)
      peerStatsCache.set(key, stats)
      return stats
    }
    const seriesMap = new Map()
    for (const row of operatorRows) {
      const periodPeerStats = await getPeerStats(row.ano, row.trimestre)
      const evaluation = evaluateRegulatoryScore({ operator: row, peers: periodPeerStats })
      const key = `${row.ano}-${row.trimestre}`
      const entry =
        seriesMap.get(key) ??
        {
          ano: row.ano,
          trimestre: row.trimestre,
          periodo: row.periodo,
          operador_valor: null,
          pares_valor: null,
        }
      entry.operador_valor = evaluation?.finalScore?.value ?? null
      seriesMap.set(key, entry)
    }
    for (const row of peerRows) {
      const periodPeerStats = await getPeerStats(row.ano, row.trimestre)
      const evaluation = evaluateRegulatoryScore({ operator: row, peers: periodPeerStats })
      const key = `${row.ano}-${row.trimestre}`
      const entry =
        seriesMap.get(key) ??
        {
          ano: row.ano,
          trimestre: row.trimestre,
          periodo: row.periodo,
          operador_valor: null,
          pares_valor: null,
        }
      entry.pares_valor = evaluation?.finalScore?.value ?? null
      if (!entry.periodo) {
        entry.periodo = row.periodo
      }
      seriesMap.set(key, entry)
    }
    return Array.from(seriesMap.values()).sort((a, b) => {
      if (a.ano === b.ano) {
        return a.trimestre - b.trimestre
      }
      return a.ano - b.ano
    })
  }
  const aggregateProjection = buildRegulatoryIndicatorProjection({ aggregate: true }).join(',\n        ')
  const { whereClause } = buildFilterClauses(filters, { latestOnlyDefault: false })
  const query = `
    SELECT
      ano,
      trimestre,
      periodo
      ${aggregateProjection ? `,\n        ${aggregateProjection}` : ''}
    FROM ${DEFAULT_VIEW}
    ${whereClause ?? ''}
    GROUP BY ano, trimestre, periodo
    ORDER BY ano, trimestre
  `
  const rows = await runQuery(query)
  if (!rows.length) {
    return []
  }
  const peerStats = await fetchRegulatoryPeerStats(filters)
  return rows.map((row) => {
    const evaluation = evaluateRegulatoryScore({ operator: row, peers: peerStats })
    return {
      ano: row.ano,
      trimestre: row.trimestre,
      periodo: row.periodo,
      operador_valor: evaluation?.finalScore?.value ?? null,
      pares_valor: null,
    }
  })
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
  if (isVirtualUniodontoOperator(nomeOperadora)) {
    const periods = await runQuery(`
      SELECT DISTINCT ano, trimestre, periodo
      FROM ${DEFAULT_VIEW}
      WHERE COALESCE(uniodonto, FALSE) IS TRUE
      ORDER BY ano DESC, trimestre DESC
    `)
    if (!periods.length) {
      return {
        operator: null,
        peers: null,
        availablePeriods: [],
        selectedPeriod: null,
      }
    }
    const resolved =
      periods.find((item) => item.ano === targetPeriod?.ano && item.trimestre === targetPeriod?.trimestre) ?? periods[0]
    const basePeriodFilters = {
      anos: [resolved.ano],
      trimestres: [resolved.trimestre],
    }
    const operator = await fetchVirtualCohortSnapshot({ ...basePeriodFilters, ...comparisonFilters })
    const peers = await fetchVirtualMarketSnapshot({ ...basePeriodFilters, ...comparisonFilters })
    return {
      operator,
      peers: peers
        ? {
            peer_count: peers.cohort_count ?? null,
            ...peers,
          }
        : null,
      availablePeriods: periods,
      selectedPeriod: resolved,
    }
  }
  const sanitizedName = sanitizeSql(nomeOperadora)
  const periods = await runQuery(
    `SELECT ano, trimestre, periodo FROM ${DEFAULT_VIEW} WHERE nome_operadora = '${sanitizedName}' ORDER BY ano DESC, trimestre DESC`,
  )
  if (!periods.length) {
    return {
      operator: null,
      peers: null,
      availablePeriods: [],
      selectedPeriod: null,
    }
  }
  const resolved =
    periods.find((item) => item.ano === targetPeriod?.ano && item.trimestre === targetPeriod?.trimestre) ?? periods[0]
  const operatorQuery = `
    SELECT
      base.*
      ${cardMetricColumnsSql ? `,\n      ${cardMetricColumnsSql}` : ''}
    FROM ${DEFAULT_VIEW} base
    WHERE nome_operadora = '${sanitizedName}'
      AND ano = ${resolved.ano}
      AND trimestre = ${resolved.trimestre}
    LIMIT 1
  `
  const operator = (await runQuery(operatorQuery))[0] ?? null

  const comparisonExpression = getWhereExpression(comparisonFilters)
  const wherePieces = [
    `ano = ${resolved.ano}`,
    `trimestre = ${resolved.trimestre}`,
    `nome_operadora <> '${sanitizedName}'`,
  ]
  if (comparisonExpression) {
    wherePieces.push(`(${comparisonExpression})`)
  }
  const peerMetricSelect = metricFormulas
    .filter((metric) => metric.showInCards)
    .map((metric) => `AVG(${metricSql[metric.id].trim()}) AS ${metric.id}`)
    .join(',\n        ')
  const peerQuery = `
    SELECT
      COUNT(DISTINCT nome_operadora) AS peer_count,
      ${peerMetricSelect}
    FROM ${DEFAULT_VIEW}
    WHERE ${wherePieces.join('\n        AND ')}
  `
  const peers = (await runQuery(peerQuery))[0] ?? null

  return {
    operator,
    peers,
    availablePeriods: periods,
    selectedPeriod: resolved,
  }
}

export async function fetchOperatorLatestSnapshot(nomeOperadora) {
  if (!nomeOperadora) return null
  if (isVirtualUniodontoOperator(nomeOperadora)) {
    return fetchVirtualCohortSnapshot({})
  }
  const query = `
    SELECT *
    FROM ${DEFAULT_VIEW}
    WHERE nome_operadora = '${sanitizeSql(nomeOperadora)}'
    ORDER BY ano DESC, trimestre DESC
    LIMIT 1
  `
  const rows = await runQuery(query)
  return rows[0] ?? null
}

const rankingMetrics = metricFormulas.filter((metric) => metric.showInCards)

export async function fetchRanking(metric, filters, limit = null, order = 'DESC', options = {}) {
  const sqlMetric = metricSql[metric] ?? metricSql.sinistralidade_pct
  const metricSelectList = rankingMetrics
    .map((item) => `${metricSql[item.id].trim()} AS ${item.id}`)
    .join(',\n      ')
  const { whereClause } = buildFilterClauses(stripOperatorSelection(filters))
  const operatorName = options.operatorName ? sanitizeSql(options.operatorName) : null
  const limitClause = Number.isFinite(limit) && limit > 0 ? `LIMIT ${limit}` : ''
  const query = `
    WITH base AS (
      SELECT nome_operadora, reg_ans, porte, modalidade, qt_beneficiarios, ${sqlMetric} AS valor${
        metricSelectList ? `,\n      ${metricSelectList}` : ''
      }
      FROM ${DEFAULT_VIEW}
      ${whereClause}
    ), ranked AS (
      SELECT
        base.*,
        ROW_NUMBER() OVER (ORDER BY valor ${order}) AS rank
      FROM base
    )
    SELECT *
    FROM ranked
    ORDER BY rank
    ${limitClause}
  `
  const rows = await runQuery(query)
  let operatorRow = null
  if (operatorName) {
    if (isVirtualUniodontoOperator(options.operatorName)) {
      const cohortFilters = buildCohortFilters(stripOperatorSelection(filters), { uniodonto: true })
      const snapshot = await fetchVirtualCohortSnapshot(cohortFilters)
      if (snapshot) {
        operatorRow = {
          ...snapshot,
          nome_operadora: VIRTUAL_OPERATOR_UNIODONTO,
          valor: snapshot[metric] ?? snapshot.valor ?? null,
        }
      }
    } else {
      const operatorQuery = `
        SELECT nome_operadora, reg_ans, porte, modalidade, qt_beneficiarios, ${sqlMetric} AS valor
        FROM ${DEFAULT_VIEW}
        WHERE nome_operadora = '${operatorName}'
        ${whereClause ? ` AND ${whereClause.replace(/^WHERE\s+/i, '')}` : ''}
        LIMIT 1
      `
      const result = await runQuery(operatorQuery)
      operatorRow = result[0] ?? null
    }
    const operatorValue = toNumeric(operatorRow?.valor ?? operatorRow?.[metric])
    if (operatorValue !== null) {
      const values = rows.map((row) => toNumeric(row.valor ?? row[metric])).filter((value) => value !== null)
      const betterCount = values.filter((value) => (order === 'ASC' ? value < operatorValue : value > operatorValue)).length
      operatorRow.rank_position = betterCount + 1
      operatorRow.rank = operatorRow.rank_position
    }
  }
  return { rows, operatorRow }
}

const monetaryRankingColumns = [
  'vr_receitas',
  'vr_despesas',
  'vr_contraprestacoes',
  'vr_contraprestacoes_efetivas',
  'vr_contraprestacoes_pre',
  'vr_corresponsabilidade_cedida',
  'vr_creditos_operacoes_saude',
  'vr_eventos_liquidos',
  'vr_eventos_a_liquidar',
  'vr_desp_comerciais',
  'vr_desp_comerciais_promocoes',
  'vr_desp_administrativas',
  'vr_outras_desp_oper',
  'vr_desp_tributos',
  'vr_receitas_fin',
  'vr_despesas_fin',
  'vr_receitas_patrimoniais',
  'vr_outras_receitas_operacionais',
  'vr_ativo_circulante',
  'vr_ativo_permanente',
  'vr_passivo_circulante',
  'vr_passivo_nao_circulante',
  'vr_patrimonio_liquido',
  'vr_ativos_garantidores',
  'vr_provisoes_tecnicas',
  'vr_pl_ajustado',
  'vr_margem_solvencia_exigida',
  'vr_conta_61',
  'resultado_financeiro',
  'resultado_liquido_final_ans',
  'resultado_liquido',
]

export async function fetchMonetaryRanking(metricColumn, filters, limit = null, order = 'DESC', options = {}) {
  const metricKey = String(metricColumn ?? '').trim()
  if (!metricKey) {
    return { rows: [], operatorRow: null }
  }
  if (!monetaryRankingColumns.includes(metricKey)) {
    throw new Error(`Métrica monetária inválida: ${metricKey}`)
  }
  const { whereClause } = buildFilterClauses(stripOperatorSelection(filters))
  const operatorName = options.operatorName ? sanitizeSql(options.operatorName) : null
  const limitClause = Number.isFinite(limit) && limit > 0 ? `LIMIT ${limit}` : ''

  const monetarySelectList = monetaryRankingColumns
    .map((column) => `COALESCE(base.${quoteIdentifier(column)}, 0) AS ${quoteIdentifier(column)}`)
    .join(',\n      ')
  const valueExpr = `COALESCE(base.${quoteIdentifier(metricKey)}, 0)`
  const query = `
    WITH base AS (
      SELECT
        nome_operadora,
        reg_ans,
        porte,
        modalidade,
        qt_beneficiarios,
        ${valueExpr} AS valor
        ${monetarySelectList ? `,\n      ${monetarySelectList}` : ''}
      FROM ${DEFAULT_VIEW} base
      ${whereClause}
    ), ranked AS (
      SELECT
        base.*,
        ROW_NUMBER() OVER (ORDER BY valor ${order}) AS rank
      FROM base
    )
    SELECT *
    FROM ranked
    ORDER BY rank
    ${limitClause}
  `
  const rows = await runQuery(query)

  let operatorRow = null
  if (operatorName) {
    if (isVirtualUniodontoOperator(options.operatorName)) {
      const cohortFilters = buildCohortFilters(stripOperatorSelection(filters), { uniodonto: true })
      const snapshot = await fetchVirtualCohortSnapshot(cohortFilters)
      if (snapshot) {
        operatorRow = {
          ...snapshot,
          nome_operadora: VIRTUAL_OPERATOR_UNIODONTO,
          valor: snapshot[metricKey] ?? null,
        }
      }
    } else {
      const operatorQuery = `
        SELECT
          nome_operadora,
          reg_ans,
          porte,
          modalidade,
          qt_beneficiarios,
          COALESCE(${quoteIdentifier(metricKey)}, 0) AS valor
          ${monetaryRankingColumns.map((column) => `,\n          COALESCE(${quoteIdentifier(column)}, 0) AS ${quoteIdentifier(column)}`).join('')}
        FROM ${DEFAULT_VIEW}
        WHERE nome_operadora = '${operatorName}'
        ${whereClause ? ` AND ${whereClause.replace(/^WHERE\s+/i, '')}` : ''}
        LIMIT 1
      `
      const result = await runQuery(operatorQuery)
      operatorRow = result[0] ?? null
    }
    const operatorValue = toNumeric(operatorRow?.valor ?? operatorRow?.[metricKey])
    if (operatorValue !== null) {
      const values = rows.map((row) => toNumeric(row.valor ?? row[metricKey])).filter((value) => value !== null)
      const betterCount = values.filter((value) => (order === 'ASC' ? value < operatorValue : value > operatorValue)).length
      operatorRow.rank_position = betterCount + 1
      operatorRow.rank = operatorRow.rank_position
    }
  }
  return { rows, operatorRow }
}

export async function fetchRegulatoryScoreRanking(filters, limit = null, order = 'DESC', options = {}) {
  const metricSelectList = rankingMetrics
    .map((item) => `${metricSql[item.id].trim()} AS ${item.id}`)
    .join(',\n      ')
  const indicatorProjection = buildRegulatoryIndicatorProjection().join(',\n      ')
  const { whereClause } = buildFilterClauses(stripOperatorSelection(filters), { latestOnlyDefault: false })
  const query = `
    SELECT
      nome_operadora,
      reg_ans,
      porte,
      modalidade,
      qt_beneficiarios,
      ano,
      trimestre,
      periodo${
        metricSelectList ? `,\n      ${metricSelectList}` : ''
      }
      ${indicatorProjection ? `,\n      ${indicatorProjection}` : ''}
    FROM ${DEFAULT_VIEW}
    ${whereClause ?? ''}
  `
  const rows = await runQuery(query)
  if (!rows.length) {
    return { rows: [], operatorRow: null }
  }
  const peerStats = await fetchRegulatoryPeerStats(filters)
  const scoredRows = rows
    .map((row) => {
      const evaluation = evaluateRegulatoryScore({ operator: row, peers: peerStats })
      return {
        ...row,
        valor: evaluation?.finalScore?.value ?? null,
        score_label: evaluation?.finalScore?.label ?? 'SEM DADO',
        regulatory_score: evaluation?.finalScore?.value ?? null,
        regulatory_score_label: evaluation?.finalScore?.label ?? 'SEM DADO',
      }
    })
    .filter((row) => row.valor !== null)

  scoredRows.sort((a, b) => {
    const aVal = a.valor ?? (order === 'ASC' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY)
    const bVal = b.valor ?? (order === 'ASC' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY)
    if (aVal === bVal) return 0
    if (order === 'ASC') {
      return aVal > bVal ? 1 : -1
    }
    return aVal > bVal ? -1 : 1
  })
  scoredRows.forEach((row, index) => {
    row.rank_position = index + 1
  })
  const operatorName = options.operatorName ?? null
  let operatorRow = operatorName ? scoredRows.find((row) => row.nome_operadora === operatorName) ?? null : null
  if (operatorName && isVirtualUniodontoOperator(operatorName)) {
    const cohortFilters = buildCohortFilters(stripOperatorSelection(filters), { uniodonto: true })
    const cohortRow = await fetchVirtualCohortSnapshot(cohortFilters)
    if (cohortRow) {
      const evaluation = evaluateRegulatoryScore({ operator: cohortRow, peers: peerStats })
      const value = evaluation?.finalScore?.value ?? null
      const baseRow = {
        ...cohortRow,
        nome_operadora: VIRTUAL_OPERATOR_UNIODONTO,
        valor: value,
        score_label: evaluation?.finalScore?.label ?? 'SEM DADO',
        regulatory_score: value,
        regulatory_score_label: evaluation?.finalScore?.label ?? 'SEM DADO',
      }
      if (value !== null) {
        const betterCount = scoredRows.filter((row) => {
          const rowValue = row.valor ?? null
          if (rowValue === null || rowValue === undefined) return false
          return order === 'ASC' ? rowValue < value : rowValue > value
        }).length
        baseRow.rank_position = betterCount + 1
      }
      operatorRow = baseRow
    }
  }
  return {
    rows: Number.isFinite(limit) && limit > 0 ? scoredRows.slice(0, limit) : scoredRows,
    operatorRow,
  }
}

export async function fetchScatter(xMetric, yMetric, filters, limit = 200) {
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
  return runQuery(query)
}

export async function fetchTableData(filters, options = {}) {
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
    if (isVirtualUniodontoOperator(exactOperatorName)) {
      const clause = 'COALESCE(uniodonto, FALSE) IS TRUE'
      finalWhereClause = finalWhereClause ? `${finalWhereClause} AND ${clause}` : `WHERE ${clause}`
    } else {
      const clause = `nome_operadora = '${sanitizeSql(exactOperatorName)}'`
      finalWhereClause = finalWhereClause ? `${finalWhereClause} AND ${clause}` : `WHERE ${clause}`
    }
  }

  let selectedFields = options.columns?.length ? options.columns : DETAIL_TABLE_FIELDS
  if (includeAllColumns) {
    selectedFields = await getViewColumns()
  }
  if (!selectedFields || !selectedFields.length) {
    selectedFields = ['*']
  }

  const projection = selectedFields
    .map((field) => {
      const expression = metricSql[field]
      if (expression) {
        return `(${expression.trim()}) AS ${field}`
      }
      return field
    })
    .join(', ')
  const limit = options.limit ?? 500
  const offset = options.offset ?? 0
  const query = `
    SELECT ${projection}
    FROM ${DEFAULT_VIEW}
    ${finalWhereClause ?? ''}
    ORDER BY ano DESC, trimestre DESC, nome_operadora
    LIMIT ${limit} OFFSET ${offset}
  `
  const rows = await runQuery(query)
  return {
    rows,
    columns: selectedFields,
  }
}

export async function fetchTableColumns() {
  return getViewColumns()
}

export function getMetricsCatalog() {
  return metricFormulas.map(({ id, label, description, format }) => ({ id, label, description, format }))
}
