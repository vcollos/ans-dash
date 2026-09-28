import { createDataService } from './dataServiceCore.js'
import { fetchWithAuth } from './auth'
import { getSsoState, isSsoSessionActive } from './ssoSession.js'
export { VIRTUAL_OPERATOR_UNIODONTO, DETAIL_TABLE_FIELDS } from './dataServiceCore.js'

const legacy = createDataService({
  env: import.meta.env,
  executeQuery: async (sql, { includeFields }) => {
    const response = await fetchWithAuth('/api/query', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, includeFields }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error ?? `Falha ao executar consulta: ${response.status}`)
    return payload
  },
})

async function execute(operation, args) {
  if (getSsoState().status === 'blocked') throw new Error('Sessão UHub indisponível. Entre novamente.')
  if (!isSsoSessionActive()) return legacy[operation](...args)
  const response = await fetchWithAuth('/api/data/operation', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, args }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error ?? 'Falha ao consultar dados da operadora.')
  return payload.result
}

export const assertDatasetReady = (...args) => execute('assertDatasetReady', args)
export const fetchAvailablePeriods = (...args) => execute('fetchAvailablePeriods', args)
export const fetchOperatorOptions = (...args) => execute('fetchOperatorOptions', args)
export const fetchDashboardBootstrap = (...args) => execute('fetchDashboardBootstrap', args)
export const fetchOperatorPeriods = (...args) => execute('fetchOperatorPeriods', args)
export const fetchKpiSummary = (...args) => execute('fetchKpiSummary', args)
export const fetchUniodontoPeerSummary = (...args) => execute('fetchUniodontoPeerSummary', args)
export const fetchAnsPeerSummary = (...args) => execute('fetchAnsPeerSummary', args)
export const fetchMonetarySummary = (...args) => execute('fetchMonetarySummary', args)
export const fetchRegulatoryReport = (...args) => execute('fetchRegulatoryReport', args)
export const fetchRegulatoryScoreForFilters = (...args) => execute('fetchRegulatoryScoreForFilters', args)
export const fetchTrendSeries = (...args) => execute('fetchTrendSeries', args)
export const fetchUniodontoPerCapitaSeries = (...args) => execute('fetchUniodontoPerCapitaSeries', args)
export const fetchTrendSeriesBatch = (...args) => execute('fetchTrendSeriesBatch', args)
export const fetchOperatorSnapshot = (...args) => execute('fetchOperatorSnapshot', args)
export const fetchOperatorLatestSnapshot = (...args) => execute('fetchOperatorLatestSnapshot', args)
export const fetchRanking = (...args) => execute('fetchRanking', args)
export const fetchUniodontoRanking = (...args) => execute('fetchUniodontoRanking', args)
export const fetchMonetaryRanking = (...args) => execute('fetchMonetaryRanking', args)
export const fetchRegulatoryScoreRanking = (...args) => execute('fetchRegulatoryScoreRanking', args)
export const fetchScatter = (...args) => execute('fetchScatter', args)
export const fetchTableData = (...args) => execute('fetchTableData', args)
export const fetchTableColumns = (...args) => execute('fetchTableColumns', args)
export const getMetricsCatalog = () => legacy.getMetricsCatalog()
