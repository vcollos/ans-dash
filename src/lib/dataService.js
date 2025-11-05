import { getDuckDB, getConnection } from './duckdbClient'
import { tableToObjects } from './arrow'

function sanitizeList(values = []) {
  return values.filter((value) => value !== null && value !== undefined && value !== '')
}

async function fetchAsUint8Array(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Falha ao acessar ${url}: ${response.status}`)
  }
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

function buildWhereClause(filters = {}) {
  const clauses = []

  if (filters.modalidades?.length) {
    const values = filters.modalidades.map((value) => `'${value.replaceAll("'", "''")}'`)
    clauses.push(`modalidade IN (${values.join(',')})`)
  }

  if (filters.portes?.length) {
    const values = filters.portes.map((value) => `'${value.replaceAll("'", "''")}'`)
    clauses.push(`porte IN (${values.join(',')})`)
  }

  if (filters.anos?.length) {
    const numbers = filters.anos.join(',')
    clauses.push(`ano IN (${numbers})`)
  }

  if (filters.trimestres?.length) {
    const numbers = filters.trimestres.join(',')
    clauses.push(`trimestre IN (${numbers})`)
  }

  if (filters.ativa === true) {
    clauses.push('ativa IS TRUE')
  } else if (filters.ativa === false) {
    clauses.push('ativa IS FALSE')
  }

  if (filters.uniodonto === true) {
    clauses.push('uniodonto IS TRUE')
  } else if (filters.uniodonto === false) {
    clauses.push('uniodonto IS FALSE')
  }

  if (filters.sinistralidade?.min !== undefined || filters.sinistralidade?.max !== undefined) {
    const { min = 0, max = 1000 } = filters.sinistralidade
    clauses.push(`sinistralidade_pct BETWEEN ${min} AND ${max}`)
  }

  if (filters.margem?.min !== undefined || filters.margem?.max !== undefined) {
    const { min = -500, max = 500 } = filters.margem
    clauses.push(`margem_lucro_pct BETWEEN ${min} AND ${max}`)
  }

  if (filters.liquidez?.min !== undefined || filters.liquidez?.max !== undefined) {
    const { min = 0, max = 100 } = filters.liquidez
    clauses.push(`liquidez_corrente BETWEEN ${min} AND ${max}`)
  }

  if (filters.regAns?.length) {
    const numbers = filters.regAns.join(',')
    clauses.push(`reg_ans IN (${numbers})`)
  }

  if (filters.search) {
    const sanitized = filters.search.replaceAll("'", "''").toLowerCase()
    clauses.push(`lower(nome_operadora) LIKE '%${sanitized}%'`)
  }

  if (!clauses.length) {
    return ''
  }

  return `WHERE ${clauses.join(' AND ')}`
}

function buildFilterClauses(filters = {}, { latestOnlyDefault = true } = {}) {
  const whereClause = buildWhereClause(filters)
  const latestClause = !latestOnlyDefault || sanitizeList(filters.trimestres).length ? '' : 'QUALIFY trimestre_rank = 1'
  return { whereClause, latestClause }
}

export async function loadDataset({ parquetUrl, csvUrl } = {}) {
  const db = await getDuckDB()
  const conn = await getConnection()

  await db.dropFiles()
  await conn.query('DROP VIEW IF EXISTS diops_curated')
  await conn.query('DROP TABLE IF EXISTS diops_raw')

  let sourceName = null

  if (parquetUrl) {
    try {
      const buffer = await fetchAsUint8Array(parquetUrl)
      await db.registerFileBuffer('diops.parquet', buffer)
      await conn.query("CREATE OR REPLACE TABLE diops_raw AS SELECT * FROM read_parquet('diops.parquet')")
      sourceName = 'parquet'
    } catch (error) {
      console.warn('[dataService] Falha ao carregar parquet, tentando CSV.', error)
    }
  }

  if (!sourceName && csvUrl) {
    const buffer = await fetchAsUint8Array(csvUrl)
    const text = new TextDecoder().decode(buffer)
    await db.registerFileText('diops.csv', text)
    await conn.query("CREATE OR REPLACE TABLE diops_raw AS SELECT * FROM read_csv_auto('diops.csv', HEADER=TRUE, SAMPLE_SIZE=-1, ALL_VARCHAR=TRUE)")
    sourceName = 'csv'
  }

  if (!sourceName) {
    throw new Error('Não foi possível carregar os arquivos de dados (CSV ou Parquet).')
  }

  await conn.query(`
    CREATE OR REPLACE VIEW diops_curated AS
    SELECT
      TRIM(nome_operadora) AS nome_operadora,
      TRIM(modalidade) AS modalidade,
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
      TRIM(porte) AS porte,
      TRY_CAST(NULLIF(reg_ans, '') AS BIGINT) AS reg_ans,
      TRY_CAST(NULLIF(ano, '') AS INTEGER) AS ano,
      TRY_CAST(NULLIF(trimestre, '') AS INTEGER) AS trimestre,
      (TRY_CAST(NULLIF(sinistralidade, '') AS DOUBLE)) * 100 AS sinistralidade_pct,
      (TRY_CAST(NULLIF(margem_lucro_liquido, '') AS DOUBLE)) * 100 AS margem_lucro_pct,
      TRY_CAST(NULLIF(liquidez_corrente, '') AS DOUBLE) AS liquidez_corrente,
      TRY_CAST(NULLIF(liquidez_seca, '') AS DOUBLE) AS liquidez_seca,
      TRY_CAST(NULLIF(endividamento, '') AS DOUBLE) AS endividamento,
      TRY_CAST(NULLIF(imobilizacao_pl, '') AS DOUBLE) AS imobilizacao_pl,
      (TRY_CAST(NULLIF(retorno_patrimonio_liquido, '') AS DOUBLE)) * 100 AS retorno_pl_pct,
      TRY_CAST(NULLIF(cobertura_provisoes, '') AS DOUBLE) AS cobertura_provisoes,
      TRY_CAST(NULLIF(margem_solvencia, '') AS DOUBLE) AS margem_solvencia,
      TRY_CAST(NULLIF(pmcr, '') AS DOUBLE) AS pmcr,
      TRY_CAST(NULLIF(pmpe, '') AS DOUBLE) AS pmpe,
      TRY_CAST(NULLIF(resultado_financeiro, '') AS DOUBLE) AS resultado_financeiro,
      TRY_CAST(NULLIF(resultado_liquido, '') AS DOUBLE) AS resultado_liquido,
      TRY_CAST(NULLIF(despesas_adm, '') AS DOUBLE) AS despesas_adm_pct,
      TRY_CAST(NULLIF(despesas_comerciais, '') AS DOUBLE) AS despesas_comerciais_pct,
      TRY_CAST(NULLIF(despesas_tributarias, '') AS DOUBLE) AS despesas_tributarias_pct,
      TRY_CAST(NULLIF(despesas_operacionais, '') AS DOUBLE) AS despesas_operacionais_pct,
      TRY_CAST(NULLIF(\"311_vr_contraprestacoes\", '') AS DOUBLE) AS vr_contraprestacoes,
      TRY_CAST(NULLIF(\"311121_vr_contraprestacoes_pre\", '') AS DOUBLE) AS vr_contraprestacoes_pre,
      TRY_CAST(NULLIF(\"1231_vr_creditos_operacoes_saude\", '') AS DOUBLE) AS vr_creditos_operacoes_saude,
      TRY_CAST(NULLIF(\"41_vr_eventos_liquidos\", '') AS DOUBLE) AS vr_eventos_liquidos,
      TRY_CAST(NULLIF(\"2111_vr_eventos_a_liquidar\", '') AS DOUBLE) AS vr_eventos_a_liquidar,
      TRY_CAST(NULLIF(\"43_vr_desp_comerciais\", '') AS DOUBLE) AS vr_desp_comerciais,
      TRY_CAST(NULLIF(\"464119113_vr_desp_comerciais_promocoes\", '') AS DOUBLE) AS vr_desp_comerciais_promocoes,
      TRY_CAST(NULLIF(\"46_vr_desp_administrativas\", '') AS DOUBLE) AS vr_desp_administrativas,
      TRY_CAST(NULLIF(\"44_vr_outras_desp_oper\", '') AS DOUBLE) AS vr_outras_desp_oper,
      TRY_CAST(NULLIF(\"47_vr_desp_tributos\", '') AS DOUBLE) AS vr_desp_tributos,
      TRY_CAST(NULLIF(\"35_vr_receitas_fin\", '') AS DOUBLE) AS vr_receitas_fin,
      TRY_CAST(NULLIF(\"45_vr_despesas_fin\", '') AS DOUBLE) AS vr_despesas_fin,
      TRY_CAST(NULLIF(\"33_vr_outras_receitas_operacionais\", '') AS DOUBLE) AS vr_outras_receitas_operacionais,
      TRY_CAST(NULLIF(\"12_vr_ativo_circulante\", '') AS DOUBLE) AS vr_ativo_circulante,
      TRY_CAST(NULLIF(\"13_vr_ativo_permanente\", '') AS DOUBLE) AS vr_ativo_permanente,
      TRY_CAST(NULLIF(\"21_vr_passivo_circulante\", '') AS DOUBLE) AS vr_passivo_circulante,
      TRY_CAST(NULLIF(\"23_vr_passivo_nao_circulante\", '') AS DOUBLE) AS vr_passivo_nao_circulante,
      TRY_CAST(NULLIF(\"25_vr_patrimonio_liquido\", '') AS DOUBLE) AS vr_patrimonio_liquido,
      TRY_CAST(NULLIF(\"31_vr_ativos_garantidores\", '') AS DOUBLE) AS vr_ativos_garantidores,
      TRY_CAST(NULLIF(\"32_vr_provisoes_tecnicas\", '') AS DOUBLE) AS vr_provisoes_tecnicas,
      TRY_CAST(NULLIF(\"2521_vr_pl_ajustado\", '') AS DOUBLE) AS vr_pl_ajustado,
      TRY_CAST(NULLIF(\"2522_vr_margem_solvencia_exigida\", '') AS DOUBLE) AS vr_margem_solvencia_exigida,
      (TRY_CAST(NULLIF(ano, '') AS INTEGER) * 10 + TRY_CAST(NULLIF(trimestre, '') AS INTEGER)) AS periodo_id,
      CONCAT(TRY_CAST(NULLIF(ano, '') AS INTEGER), 'T', TRY_CAST(NULLIF(trimestre, '') AS INTEGER)) AS periodo,
      ROW_NUMBER() OVER (
        PARTITION BY TRIM(nome_operadora), TRY_CAST(NULLIF(ano, '') AS INTEGER)
        ORDER BY TRY_CAST(NULLIF(trimestre, '') AS INTEGER) DESC NULLS LAST
      ) AS trimestre_rank
    FROM diops_raw
    WHERE TRY_CAST(NULLIF(ano, '') AS INTEGER) IS NOT NULL
      AND TRY_CAST(NULLIF(trimestre, '') AS INTEGER) IS NOT NULL;
  `)

  await conn.query('ANALYZE')

  return { source: sourceName }
}

export async function fetchFilterOptions() {
  const conn = await getConnection()
  const [modalidades, portes, anos, trimestres, regAns, operadoras] = await Promise.all([
    conn.query('SELECT DISTINCT modalidade FROM diops_curated WHERE modalidade IS NOT NULL ORDER BY modalidade'),
    conn.query('SELECT DISTINCT porte FROM diops_curated WHERE porte IS NOT NULL ORDER BY porte'),
    conn.query('SELECT DISTINCT ano FROM diops_curated WHERE ano IS NOT NULL ORDER BY ano'),
    conn.query('SELECT DISTINCT trimestre FROM diops_curated WHERE trimestre IS NOT NULL ORDER BY trimestre'),
    conn.query('SELECT DISTINCT reg_ans FROM diops_curated WHERE reg_ans IS NOT NULL ORDER BY reg_ans'),
    conn.query('SELECT DISTINCT nome_operadora FROM diops_curated WHERE nome_operadora IS NOT NULL ORDER BY nome_operadora'),
  ])

  return {
    modalidades: tableToObjects(modalidades).map((row) => row.modalidade),
    portes: tableToObjects(portes).map((row) => row.porte),
    anos: tableToObjects(anos).map((row) => row.ano),
    trimestres: tableToObjects(trimestres).map((row) => row.trimestre),
    regAns: tableToObjects(regAns).map((row) => row.reg_ans),
    operadoras: tableToObjects(operadoras).map((row) => row.nome_operadora),
  }
}

export async function fetchKpiSummary(filters) {
  const conn = await getConnection()
  const { whereClause, latestClause } = buildFilterClauses(filters)
  const query = `
    WITH base AS (
      SELECT *
      FROM diops_curated
      ${whereClause}
      ${latestClause}
    ), period_aggregation AS (
      SELECT
        periodo_id,
        periodo,
        SUM(COALESCE(qt_beneficiarios, 0)) AS beneficiarios_total
      FROM base
      GROUP BY periodo_id, periodo
    ), aggregated AS (
      SELECT
        COUNT(DISTINCT nome_operadora) AS operadoras,
        AVG(sinistralidade_pct) AS sinistralidade,
        AVG(despesas_adm_pct) AS despesas_adm,
        AVG(despesas_comerciais_pct) AS despesas_comerciais,
        AVG(despesas_tributarias_pct) AS despesas_tributarias,
        AVG(despesas_operacionais_pct) AS despesas_operacionais,
        SUM(COALESCE(resultado_financeiro, 0)) AS resultado_financeiro,
        AVG(margem_lucro_pct) AS margem_lucro_liquido,
        MEDIAN(liquidez_corrente) AS liquidez_corrente,
        MEDIAN(liquidez_seca) AS liquidez_seca,
        AVG(endividamento) AS endividamento,
        AVG(imobilizacao_pl) AS imobilizacao_pl,
        AVG(retorno_pl_pct) AS retorno_patrimonio_liquido,
        AVG(cobertura_provisoes) AS cobertura_provisoes,
        AVG(margem_solvencia) AS margem_solvencia,
        AVG(pmcr) AS pmcr,
        AVG(pmpe) AS pmpe,
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
        SUM(COALESCE(resultado_liquido, 0)) AS resultado_liquido
      FROM base
    )
    SELECT
      COALESCE(aggregated.operadoras, 0) AS operadoras,
      COALESCE((
        SELECT beneficiarios_total
        FROM period_aggregation
        ORDER BY periodo_id DESC
        LIMIT 1
      ), 0) AS beneficiarios,
      aggregated.sinistralidade,
      aggregated.despesas_adm,
      aggregated.despesas_comerciais,
      aggregated.despesas_tributarias,
      aggregated.despesas_operacionais,
      COALESCE(aggregated.resultado_financeiro, 0) AS resultado_financeiro,
      aggregated.margem_lucro_liquido,
      aggregated.liquidez_corrente,
      aggregated.liquidez_seca,
      aggregated.endividamento,
      aggregated.imobilizacao_pl,
      aggregated.retorno_patrimonio_liquido,
      aggregated.cobertura_provisoes,
      aggregated.margem_solvencia,
      aggregated.pmcr,
      aggregated.pmpe,
      COALESCE(aggregated.vr_contraprestacoes, 0) AS vr_contraprestacoes,
      COALESCE(aggregated.vr_contraprestacoes_pre, 0) AS vr_contraprestacoes_pre,
      COALESCE(aggregated.vr_creditos_operacoes_saude, 0) AS vr_creditos_operacoes_saude,
      COALESCE(aggregated.vr_eventos_liquidos, 0) AS vr_eventos_liquidos,
      COALESCE(aggregated.vr_eventos_a_liquidar, 0) AS vr_eventos_a_liquidar,
      COALESCE(aggregated.vr_desp_comerciais, 0) AS vr_desp_comerciais,
      COALESCE(aggregated.vr_desp_comerciais_promocoes, 0) AS vr_desp_comerciais_promocoes,
      COALESCE(aggregated.vr_desp_administrativas, 0) AS vr_desp_administrativas,
      COALESCE(aggregated.vr_outras_desp_oper, 0) AS vr_outras_desp_oper,
      COALESCE(aggregated.vr_desp_tributos, 0) AS vr_desp_tributos,
      COALESCE(aggregated.vr_receitas_fin, 0) AS vr_receitas_fin,
      COALESCE(aggregated.vr_despesas_fin, 0) AS vr_despesas_fin,
      COALESCE(aggregated.vr_outras_receitas_operacionais, 0) AS vr_outras_receitas_operacionais,
      COALESCE(aggregated.vr_ativo_circulante, 0) AS vr_ativo_circulante,
      COALESCE(aggregated.vr_ativo_permanente, 0) AS vr_ativo_permanente,
      COALESCE(aggregated.vr_passivo_circulante, 0) AS vr_passivo_circulante,
      COALESCE(aggregated.vr_passivo_nao_circulante, 0) AS vr_passivo_nao_circulante,
      COALESCE(aggregated.vr_patrimonio_liquido, 0) AS vr_patrimonio_liquido,
      COALESCE(aggregated.vr_ativos_garantidores, 0) AS vr_ativos_garantidores,
      COALESCE(aggregated.vr_provisoes_tecnicas, 0) AS vr_provisoes_tecnicas,
      COALESCE(aggregated.vr_pl_ajustado, 0) AS vr_pl_ajustado,
      COALESCE(aggregated.vr_margem_solvencia_exigida, 0) AS vr_margem_solvencia_exigida,
      COALESCE(aggregated.resultado_liquido, 0) AS resultado_liquido
    FROM aggregated
  `
  const table = await conn.query(query)
  return tableToObjects(table)[0]
}

export async function fetchTrendSeries(metric, filters) {
  const conn = await getConnection()
  const { whereClause } = buildFilterClauses(filters, { latestOnlyDefault: false })
  const sqlMetric = metric ?? 'sinistralidade_pct'
  const query = `
    SELECT
      ano,
      trimestre,
      periodo,
      AVG(${sqlMetric}) AS valor
    FROM diops_curated
    ${whereClause}
    GROUP BY ano, trimestre, periodo
    ORDER BY ano, trimestre
  `
  const table = await conn.query(query)
  return tableToObjects(table)
}

export async function fetchRanking(metric, filters, limit = 10, order = 'DESC') {
  const conn = await getConnection()
  const { whereClause, latestClause } = buildFilterClauses(filters)
  const sqlMetric = metric ?? 'resultado_liquido'
  const query = `
    WITH base AS (
      SELECT *
      FROM diops_curated
      ${whereClause}
      ${latestClause}
    )
    SELECT
      nome_operadora,
      SUM(${sqlMetric}) AS valor,
      SUM(COALESCE(qt_beneficiarios, 0)) AS beneficiarios,
      AVG(sinistralidade_pct) AS sinistralidade_media
    FROM base
    GROUP BY nome_operadora
    ORDER BY valor ${order}
    LIMIT ${limit}
  `
  const table = await conn.query(query)
  return tableToObjects(table)
}

export async function fetchScatter(xMetric, yMetric, filters, limit = 200) {
  const conn = await getConnection()
  const { whereClause, latestClause } = buildFilterClauses(filters)
  const query = `
    WITH base AS (
      SELECT *
      FROM diops_curated
      ${whereClause}
      ${latestClause}
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
  const { whereClause, latestClause } = buildFilterClauses(filters)
  const limit = options.limit ?? 500
  const offset = options.offset ?? 0
  const query = `
    WITH base AS (
      SELECT *
      FROM diops_curated
      ${whereClause}
      ${latestClause}
    )
    SELECT
      nome_operadora,
      modalidade,
      porte,
      ano,
      trimestre,
      qt_beneficiarios,
      sinistralidade_pct,
      margem_lucro_pct,
      liquidez_corrente,
      resultado_liquido,
      vr_contraprestacoes,
      vr_eventos_liquidos,
      vr_desp_comerciais,
      vr_desp_administrativas
    FROM base
    ORDER BY ano DESC, trimestre DESC, nome_operadora
    LIMIT ${limit} OFFSET ${offset}
  `
  const table = await conn.query(query)
  const rows = tableToObjects(table)
  return {
    rows,
    columns: table.schema.fields.map((field) => field.name),
  }
}

export function getMetricsCatalog() {
  return [
    {
      id: 'sinistralidade_pct',
      label: 'Sinistralidade (%)',
      format: 'percent',
      description: 'Relação entre despesas assistenciais e receitas de contraprestações.',
    },
    {
      id: 'margem_lucro_pct',
      label: 'Margem de Lucro Líquida (%)',
      format: 'percent',
      description: 'Lucro líquido sobre a receita operacional total.',
    },
    {
      id: 'liquidez_corrente',
      label: 'Liquidez Corrente',
      format: 'decimal',
      description: 'Ativos circulantes em relação ao passivo circulante.',
    },
    {
      id: 'liquidez_seca',
      label: 'Liquidez Seca',
      format: 'decimal',
      description: 'Liquidez corrente desconsiderando estoques.',
    },
    {
      id: 'endividamento',
      label: 'Endividamento (%)',
      format: 'percent',
      description: 'Participação do capital de terceiros na estrutura da operadora.',
    },
    {
      id: 'imobilizacao_pl',
      label: 'Imobilização do PL (%)',
      format: 'percent',
      description: 'Percentual do patrimônio líquido comprometido com ativos imobilizados.',
    },
    {
      id: 'resultado_liquido',
      label: 'Resultado Líquido (R$)',
      format: 'currency',
      description: 'Resultado líquido acumulado no período.',
    },
    {
      id: 'retorno_pl_pct',
      label: 'Retorno sobre PL (%)',
      format: 'percent',
      description: 'Retorno sobre o patrimônio líquido médio.',
    },
    {
      id: 'cobertura_provisoes',
      label: 'Cobertura de Provisões',
      format: 'decimal',
      description: 'Índice de cobertura das provisões técnicas pelos ativos garantidores.',
    },
    {
      id: 'resultado_financeiro',
      label: 'Resultado Financeiro (R$)',
      format: 'currency',
      description: 'Resultado das aplicações financeiras e equivalentes.',
    },
  ]
}
