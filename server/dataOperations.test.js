import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA_OPERATIONS, dataOperationEnvironment, executeDataOperation, validateDataOperation } from './dataOperations.js'
import { createDataService } from '../src/lib/dataServiceCore.js'

const access = (regAns = '123456') => ({ sso: true, enforced: true, allowedRegAns: [regAns] })
const row = {
  reg_ans: '123456', nome_operadora: 'Operadora teste', ano: 2026, trimestre: 1, periodo: '2026T1',
  competencia: '202603', qt_beneficiarios: 100, qt_prestadores: 12, uniodonto: true,
  vr_receitas: 100, vr_despesas: 50, resultado_liquido_final_ans: 50,
  sinistralidade_pct: 20, peer_count: 1, cohort_count: 1,
  operadoras: ['Operadora teste'], periodos: [{ ano: 2026, trimestre: 1, periodo: '2026T1' }],
}
const result = () => ({ rows: [{ ...row }], fields: Object.keys(row).map((name) => ({ name })) })
const cases = {
  assertDatasetReady: [], fetchAvailablePeriods: [], fetchOperatorOptions: [], fetchDashboardBootstrap: [],
  fetchOperatorPeriods: ['Operadora teste'], fetchKpiSummary: [{}],
  fetchUniodontoPeerSummary: [{}, {}], fetchAnsPeerSummary: [{}, {}], fetchMonetarySummary: [{}],
  fetchRegulatoryReport: [{ operatorName: 'Operadora teste', anos: [2026], trimestres: [1] }, {}], fetchRegulatoryScoreForFilters: [{}, {}],
  fetchTrendSeries: ['sinistralidade_pct', {}], fetchUniodontoPerCapitaSeries: [{}],
  fetchTrendSeriesBatch: [['sinistralidade_pct'], {}],
  fetchOperatorSnapshot: ['Operadora teste', { ano: 2026, trimestre: 1, periodo: '2026T1' }, {}],
  fetchOperatorLatestSnapshot: ['Operadora teste'], fetchRanking: ['sinistralidade_pct', {}, null, 'DESC', {}],
  fetchUniodontoRanking: ['sinistralidade_pct', {}, null, 'DESC', {}],
  fetchMonetaryRanking: ['resultado_liquido_final_ans', {}, null, 'DESC', {}],
  fetchRegulatoryScoreRanking: [{}, null, 'DESC', {}], fetchScatter: ['sinistralidade_pct', 'liquidez_corrente', {}],
  fetchTableData: [{}, { includeAllColumns: true }], fetchTableColumns: [],
}

function assertScoped(sql, regAns) {
  const sources = Object.values(dataOperationEnvironment({})).filter((v) => typeof v === 'string' && v.includes('.'))
  let count = 0
  for (const source of sources) {
    const chunks = sql.split(`\`${source}\``)
    for (const tail of chunks.slice(1)) {
      assert.ok(tail.startsWith(` WHERE CAST(reg_ans AS STRING) = '${regAns}')`), `unscoped source ${source}`)
      count++
    }
  }
  assert.ok(count > 0, 'must reference a scoped, server-owned source')
}

test('every named operation uses scoped server sources, including aggregation and metadata', async () => {
  assert.deepEqual(Object.keys(cases).sort(), [...DATA_OPERATIONS].sort())
  for (const [operation, args] of Object.entries(cases)) {
    let queries = 0
    await executeDataOperation({ body: { operation, args }, access: access(), env: {}, executeQuery: async (sql) => {
      assertScoped(sql, '123456'); queries++; return result()
    } })
    assert.ok(queries > 0, operation)
  }
})

test('strict per-operation schemas reject SQL, tables, identifiers and numeric injection before execution', async () => {
  const attacks = [
    { operation: 'query', args: ['SELECT * FROM secrets'] },
    { operation: '__proto__', args: [] },
    { operation: 'fetchDashboardBootstrap', args: [], sql: 'SELECT 1' },
    { operation: 'fetchTableData', args: [{ table: 'secrets' }] },
    { operation: 'fetchTableData', args: [{ anos: ['2026) OR TRUE --'] }] },
    { operation: 'fetchTableData', args: [{ regAns: ['123456) OR TRUE --'] }] },
    { operation: 'fetchTableData', args: [{}, { columns: ['(SELECT secret FROM secrets)'] }] },
    { operation: 'fetchTableData', args: [{}, { limit: '10 UNION SELECT' }] },
    { operation: 'fetchTableData', args: [{}, { offset: -1 }] },
    { operation: 'fetchRanking', args: ['sinistralidade_pct', {}, 10, 'DESC; SELECT 1'] },
    { operation: 'fetchScatter', args: ['secret FROM secrets --', 'liquidez_corrente', {}] },
    { operation: 'fetchTrendSeriesBatch', args: [Array(101).fill('sinistralidade_pct'), {}] },
    { operation: 'fetchTableData', args: [{ search: 'a'.repeat(17000) }] },
  ]
  for (const body of attacks) {
    let called = false
    await assert.rejects(() => executeDataOperation({ body, access: access(), env: {}, executeQuery: async () => { called = true; return result() } }), { status: 400 })
    assert.equal(called, false)
  }
})

test('operator overrides, stripped cohort filters and comparative branches never remove source scope', async () => {
  const variations = [
    ['fetchKpiSummary', [{ operatorName: 'Sistema Uniodonto', regAns: ['654321'] }]],
    ['fetchTrendSeries', ['sinistralidade_pct', {}, { operatorName: 'Sistema Uniodonto', filters: { regAns: ['654321'] } }]],
    ['fetchTrendSeriesBatch', [['sinistralidade_pct', 'regulatory_score'], {}, { operatorName: 'Operadora teste', filters: {} }]],
    ['fetchUniodontoPerCapitaSeries', [{}, {}, { operatorName: 'Sistema Uniodonto', filters: {} }]],
    ['fetchOperatorSnapshot', ['Sistema Uniodonto', null, {}]],
    ['fetchRanking', ['sinistralidade_pct', {}, 10, 'ASC', { operatorName: 'Sistema Uniodonto' }]],
    ['fetchTableData', [{ operatorName: "O'Brien\\'; SELECT 1 --", regAns: ['654321'] }, { columns: ['reg_ans'], ignorePeriodFilters: true }]],
  ]
  for (const [operation, args] of variations) {
    await executeDataOperation({ body: { operation, args }, access: access(), env: {}, executeQuery: async (sql) => {
      assertScoped(sql, '123456'); return result()
    } })
  }
})

test('tenant caches cannot cross operations/requests, including same args and concurrent users', async () => {
  const body = { operation: 'fetchAvailablePeriods', args: [] }
  const queries = []
  await Promise.all(['123456', '654321', '123456'].map((regAns) => executeDataOperation({
    body, access: access(regAns), env: {}, executeQuery: async (sql) => { queries.push(sql); assertScoped(sql, regAns); return result() },
  })))
  assert.equal(queries.length, 3)
  assert.notEqual(queries[0], queries[1])
  assert.equal(queries[0], queries[2])
  for (const invalid of [undefined, { sso: true, allowedRegAns: ['123456'] }, { ...access(), allowedRegAns: [] }, { ...access(), allowedRegAns: ['123456', '654321'] }]) {
    await assert.rejects(() => executeDataOperation({ body, access: invalid, env: {}, executeQuery: async () => assert.fail('unauthorized query') }), { status: 403 })
  }
})

test('legacy builders retain unscoped sources and internal cache; SSO configuration is fixed and validated', async () => {
  const queries = []
  const legacy = createDataService({ executeQuery: async (sql) => { queries.push(sql); return result() } })
  await legacy.fetchAvailablePeriods()
  await legacy.fetchAvailablePeriods()
  assert.equal(queries.length, 1)
  assert.doesNotMatch(queries[0], /WHERE CAST\(reg_ans AS STRING\)/)
  assert.ok(Object.isFrozen(dataOperationEnvironment({})))
  assert.throws(() => dataOperationEnvironment({ BQ_MART_ANS_TABLE: 'project.dataset.table` UNION SELECT' }))
  assert.throws(() => validateDataOperation({ operation: 'fetchAvailablePeriods', args: [1] }), { status: 400 })
})

test('provider enrichment also scopes both source scans and returns only current operator counts', async () => {
  const queries = []
  const output = await executeDataOperation({
    body: { operation: 'fetchTableData', args: [{}, { columns: ['reg_ans', 'qt_prestadores'] }] },
    access: access(), env: {}, executeQuery: async (sql) => {
      assertScoped(sql, '123456'); queries.push(sql)
      return sql.includes('ID_ESTABELECIMENTO_SAUDE')
        ? { rows: [{ reg_ans: '123456', qt_prestadores: 8 }] }
        : { rows: [{ reg_ans: '123456', qt_prestadores: null }] }
    },
  })
  assert.equal(queries.length, 2)
  assert.equal(output.rows[0].qt_prestadores, 8)
  assert.equal(queries[1].split("WHERE CAST(reg_ans AS STRING) = '123456'").length - 1, 2)
})
