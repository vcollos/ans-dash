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
let cachedViewColumns = null

const sanitizeList = (values = []) => values.filter((value) => value !== null && value !== undefined && value !== '')
const sanitizeSql = (value) => (value ? value.replaceAll("'", "''") : value)

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
  if (filters.operatorName) {
    clauses.push(`nome_operadora = '${sanitizeSql(filters.operatorName)}'`)
  }

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
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
    clauses.push(`porte IN (${filters.portes.map((value) => `'${sanitizeSql(value)}'`).join(',')})`)
  }
  if (filters.uniodonto !== undefined) {
    clauses.push(`COALESCE(uniodonto, FALSE) IS ${filters.uniodonto ? 'TRUE' : 'FALSE'}`)
  }
  if (filters.ativa !== undefined) {
    clauses.push(`ativa IS ${filters.ativa ? 'TRUE' : 'FALSE'}`)
  }
  return clauses.join(' AND ')
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
  const rows = await runQuery(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${DEFAULT_VIEW}'
    ORDER BY ordinal_position
  `)
  cachedViewColumns = rows.map((row) => row.column_name)
  return cachedViewColumns
}

export async function loadDataset(options = {}) {
  if (options.csvText || options.parquetBuffer) {
    throw new Error('Upload manual de dataset não é suportado quando conectado ao PostgreSQL.')
  }
  await runQuery(`SELECT 1 FROM ${DEFAULT_VIEW} LIMIT 1`)
  return {
    source: 'postgres',
    filename: 'postgresql',
    updatedAt: new Date().toISOString(),
  }
}

export async function persistDatasetFile() {
  throw new Error('Persistência de dataset no servidor não é suportada no modo PostgreSQL.')
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
  return rows.map((row) => row.nome_operadora)
}

export async function fetchOperatorPeriods(operatorName) {
  if (!operatorName) return []
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
        ${cardMetricSelectSql},
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

export async function fetchTrendSeries(metric, filters, comparisonContext = null) {
  const sqlMetric = metricSql[metric ?? 'sinistralidade_pct'] ?? metricSql.sinistralidade_pct
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

export async function fetchOperatorSnapshot(nomeOperadora, targetPeriod = {}, comparisonFilters = {}) {
  if (!nomeOperadora) {
    return {
      operator: null,
      peers: null,
      availablePeriods: [],
      selectedPeriod: null,
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

export async function fetchRanking(metric, filters, limit = 10, order = 'DESC', options = {}) {
  const sqlMetric = metricSql[metric] ?? metricSql.sinistralidade_pct
  const { whereClause } = buildFilterClauses(filters)
  const operatorName = options.operatorName ? sanitizeSql(options.operatorName) : null
  const query = `
    WITH base AS (
      SELECT nome_operadora, reg_ans, porte, modalidade, qt_beneficiarios, ${sqlMetric} AS valor
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
    LIMIT ${limit}
  `
  const rows = await runQuery(query)
  let operatorRow = null
  if (operatorName) {
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
  return { rows, operatorRow }
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
    const clause = `nome_operadora = '${sanitizeSql(exactOperatorName)}'`
    finalWhereClause = finalWhereClause ? `${finalWhereClause} AND ${clause}` : `WHERE ${clause}`
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
