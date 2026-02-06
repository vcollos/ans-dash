import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  assertDatasetReady,
  fetchOperatorOptions,
  fetchOperatorLatestSnapshot,
  fetchOperatorSnapshot,
  fetchKpiSummary,
  fetchMonetarySummary,
  fetchRanking,
  fetchMonetaryRanking,
  fetchRegulatoryScoreRanking,
  fetchAnsPeerSummary,
  fetchUniodontoPeerSummary,
  fetchUniodontoRanking,
  fetchTrendSeriesBatch,
  fetchTableData,
  fetchAvailablePeriods,
  fetchRegulatoryReport,
  fetchRegulatoryScoreForFilters,
  VIRTUAL_OPERATOR_UNIODONTO,
} from '../lib/dataService'
import { DEFAULT_COMPARISON_FILTERS, comparisonFiltersToQuery, sanitizeComparisonFilters } from '../lib/comparisonModes'
import { metricFormulas } from '../lib/metricFormulas.js'
import { evaluateRegulatoryScore } from '../lib/regulatoryScore'
import { DEFAULT_UNIODONTO_RANKING_METRIC, UNIODONTO_INDICATORS, UNIODONTO_RANKING_METRICS } from '../lib/uniodontoMetrics'

const rankingCatalog = metricFormulas.filter((metric) => metric.showInCards)
const uniodontoRankingCatalog = UNIODONTO_RANKING_METRICS
const uniodontoIndicatorCatalog = UNIODONTO_INDICATORS
const DEFAULT_RANKING_METRIC = 'regulatory_score'
const DEFAULT_MONETARY_RANKING_METRIC = 'resultado_liquido_final_ans'
const DEFAULT_START_PERIOD = { ano: 2024, trimestre: 4, periodo: '2024T4' }

const getMetricTrend = (metricId) => {
  if (metricId === 'regulatory_score') return 'higher'
  return rankingCatalog.find((metric) => metric.id === metricId)?.trend ?? 'higher'
}
const getMetricOrder = (metricId) => (getMetricTrend(metricId) === 'lower' ? 'ASC' : 'DESC')
const getUniodontoMetricTrend = (metricId) =>
  uniodontoRankingCatalog.find((metric) => metric.id === metricId)?.trend ?? 'higher'
const getUniodontoMetricOrder = (metricId) => (getUniodontoMetricTrend(metricId) === 'lower' ? 'ASC' : 'DESC')
const getMonetaryMetricTrend = (metricId) => {
  const lowerMetrics = new Set([
    'vr_despesas',
    'vr_eventos_liquidos',
    'vr_eventos_a_liquidar',
    'vr_corresponsabilidade_cedida',
    'vr_desp_comerciais',
    'vr_desp_comerciais_promocoes',
    'vr_desp_administrativas',
    'vr_outras_desp_oper',
    'vr_desp_tributos',
    'vr_despesas_fin',
    'vr_passivo_circulante',
    'vr_passivo_nao_circulante',
    'vr_provisoes_tecnicas',
    'vr_conta_61',
  ])
  return lowerMetrics.has(metricId) ? 'lower' : 'higher'
}
const getMonetaryMetricOrder = (metricId) => (getMonetaryMetricTrend(metricId) === 'lower' ? 'ASC' : 'DESC')

const defaultFilters = {
  modalidades: [],
  portes: [],
  anos: [],
  trimestres: [],
  ativa: null,
  uniodonto: null,
  regAns: [],
  search: '',
}

const defaultOptions = {
  operadoras: [],
}

const createDefaultComparisonFilters = () => sanitizeComparisonFilters(DEFAULT_COMPARISON_FILTERS)


function computePorteFromBeneficiarios(value) {
  const beneficiarios = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(beneficiarios)) return null
  if (beneficiarios <= 19999) return 'Pequeno Porte'
  if (beneficiarios <= 99999) return 'Médio Porte'
  return 'Grande Porte'
}


export function useDashboardController({ activeTab = 'indicadores' } = {}) {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ ...defaultFilters })
  const [options, setOptions] = useState(defaultOptions)
  const [periodOptions, setPeriodOptions] = useState([])
  const [kpis, setKpis] = useState(null)
  const [monetarySummary, setMonetarySummary] = useState(null)
  const [rankingMetricState, setRankingMetricState] = useState(DEFAULT_RANKING_METRIC)
  const [rankingData, setRankingData] = useState({ rows: [], operatorRow: null })
  const [rankingOrder, setRankingOrder] = useState(() => getMetricOrder(DEFAULT_RANKING_METRIC))
  const [uniodontoMode, setUniodontoMode] = useState(true)
  const [uniodontoRankingMetric, setUniodontoRankingMetric] = useState(DEFAULT_UNIODONTO_RANKING_METRIC)
  const [uniodontoRankingOrder, setUniodontoRankingOrder] = useState(() =>
    getUniodontoMetricOrder(DEFAULT_UNIODONTO_RANKING_METRIC),
  )
  const [monetaryRankingMetric, setMonetaryRankingMetric] = useState(DEFAULT_MONETARY_RANKING_METRIC)
  const [monetaryRankingOrder, setMonetaryRankingOrder] = useState(() =>
    getMonetaryMetricOrder(DEFAULT_MONETARY_RANKING_METRIC),
  )
  const [monetaryRankingData, setMonetaryRankingData] = useState({ rows: [], operatorRow: null })
  const [ansPeerSummary, setAnsPeerSummary] = useState(null)
  const [uniodontoPeerSummary, setUniodontoPeerSummary] = useState(null)
  const [trendSeriesByMetric, setTrendSeriesByMetric] = useState({})
  const [isTrendLoading, setIsTrendLoading] = useState(false)
  const [tableData, setTableData] = useState({ rows: [], columns: [] })
  const [isQuerying, setIsQuerying] = useState(false)
  const [regulatoryScore, setRegulatoryScore] = useState({ data: null, isLoading: false, error: null })
  const queryCounterRef = useRef(0)

  const [comparisonFilters, setComparisonFilters] = useState(() => createDefaultComparisonFilters())
  const [comparisonFiltersDraft, setComparisonFiltersDraft] = useState(() => createDefaultComparisonFilters())
  const [operatorContext, setOperatorContext] = useState(null)
  const lastAutoOperatorRef = useRef(null)
  const [operatorSnapshot, setOperatorSnapshot] = useState({
    operator: null,
    peers: null,
    availablePeriods: [],
    selectedPeriod: null,
  })
  const [operatorPeriod, setOperatorPeriod] = useState(() => ({ ...DEFAULT_START_PERIOD }))
  const operatorSelectionRef = useRef(0)

  const comparisonFilterQuery = useMemo(() => comparisonFiltersToQuery(comparisonFilters), [comparisonFilters])
  const applyComparisonFilters = useCallback(
    (baseFilters) => {
      let nextFilters = { ...baseFilters }
      if (comparisonFilterQuery.modalidades?.length) {
        nextFilters = {
          ...nextFilters,
          modalidades: [...comparisonFilterQuery.modalidades],
        }
      }
      if (comparisonFilterQuery.portes?.length) {
        nextFilters = {
          ...nextFilters,
          portes: [...comparisonFilterQuery.portes],
        }
      }
      if (comparisonFilterQuery.uniodonto === true || comparisonFilterQuery.uniodonto === false) {
        nextFilters = {
          ...nextFilters,
          uniodonto: comparisonFilterQuery.uniodonto,
        }
      }
      if (comparisonFilterQuery.ativa === true || comparisonFilterQuery.ativa === false) {
        nextFilters = {
          ...nextFilters,
          ativa: comparisonFilterQuery.ativa,
        }
      }
      return nextFilters
    },
    [comparisonFilterQuery],
  )

  const applyUniodontoModeFilters = useCallback(
    (baseFilters) => {
      if (!uniodontoMode) return baseFilters
      if (baseFilters?.operatorName === VIRTUAL_OPERATOR_UNIODONTO) {
        return {
          ...baseFilters,
          uniodonto: true,
        }
      }
      return baseFilters
    },
    [uniodontoMode],
  )
  const trendMetricList = useMemo(() => {
    if (uniodontoMode) {
      return uniodontoIndicatorCatalog.map((metric) => metric.id)
    }
    return ['regulatory_score', ...rankingCatalog.map((metric) => metric.id)]
  }, [uniodontoMode])

  const isIndicatorsTab = activeTab === 'indicadores'
  const isRankingTab = activeTab === 'ranking'
  const isHistoryTab = activeTab === 'historico'

  const resolvedFilters = useMemo(() => {
    let nextFilters = { ...filters }
    if (operatorPeriod?.ano && operatorPeriod?.trimestre) {
      nextFilters = {
        ...nextFilters,
        anos: [operatorPeriod.ano],
        trimestres: [operatorPeriod.trimestre],
      }
    }
    return nextFilters
  }, [filters, operatorPeriod?.ano, operatorPeriod?.trimestre])

  const trendFilters = useMemo(() => {
    let nextFilters = { ...filters }
    if (operatorContext?.name) {
      const { search: _ignoredSearch, ...rest } = nextFilters
      nextFilters = rest
    } else {
      nextFilters = applyComparisonFilters(nextFilters)
    }
    if (operatorPeriod?.trimestre) {
      nextFilters = {
        ...nextFilters,
        anos: [],
        trimestres: [operatorPeriod.trimestre],
      }
    }
    return applyUniodontoModeFilters(nextFilters)
  }, [
    filters,
    operatorContext?.name,
    operatorPeriod?.trimestre,
    applyComparisonFilters,
    applyUniodontoModeFilters,
  ])

  const operatorPeerFilters = useMemo(() => {
    if (!operatorContext?.name) return null
    const peerFilters = {}
    if (operatorContext?.modalidade) {
      peerFilters.modalidades = [operatorContext.modalidade]
    }
    if (operatorContext?.porte) {
      peerFilters.portes = [operatorContext.porte]
    }
    if (typeof operatorContext?.uniodonto === 'boolean') {
      peerFilters.uniodonto = [operatorContext.uniodonto]
    }
    if (typeof operatorContext?.ativa === 'boolean') {
      peerFilters.ativa = [operatorContext.ativa]
    }
    return peerFilters
  }, [operatorContext?.name, operatorContext?.modalidade, operatorContext?.porte, operatorContext?.uniodonto, operatorContext?.ativa])

  useEffect(() => {
    if (!periodOptions.length) return
    const defaultMatch = periodOptions.find(
      (item) => item.ano === DEFAULT_START_PERIOD.ano && item.trimestre === DEFAULT_START_PERIOD.trimestre,
    )
    setOperatorPeriod((current) => {
      if (current?.ano && current?.trimestre) {
        const match = periodOptions.find(
          (item) => item.ano === current.ano && item.trimestre === current.trimestre,
        )
        if (match) return match
      }
      if (defaultMatch) return defaultMatch
      const [latest] = periodOptions
      return latest ? { ano: latest.ano, trimestre: latest.trimestre, periodo: latest.periodo } : current
    })
  }, [periodOptions])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        setStatus('loading')
        await assertDatasetReady()
        if (cancelled) return
        const [operatorNames, availablePeriods] = await Promise.all([fetchOperatorOptions(), fetchAvailablePeriods()])
        if (cancelled) return
        setOptions({
          operadoras: operatorNames,
        })
        setPeriodOptions(availablePeriods ?? [])
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.error('[Dashboard] Bootstrap error', err)
        setError(err)
        setStatus('error')
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (operatorContext?.name) return
    const normalized = (filters.search ?? '').trim().toLowerCase()
    if (!normalized) {
      lastAutoOperatorRef.current = null
      return
    }
    if (lastAutoOperatorRef.current === normalized) return
    const match = options.operadoras.find((option) => option?.toLowerCase() === normalized)
    if (!match) return
    lastAutoOperatorRef.current = normalized
    applyOperatorSelection(match)
  }, [filters.search, operatorContext?.name, options.operadoras, applyOperatorSelection])

  useEffect(() => {
    if (status !== 'ready' || !isIndicatorsTab) return
    let cancelled = false
    queryCounterRef.current += 1
    setIsQuerying(true)
    async function runQueries() {
      try {
        const comparisonPeriodFilters = {
          anos: resolvedFilters.anos ?? [],
          trimestres: resolvedFilters.trimestres ?? [],
        }
        const summaryFilters = operatorContext?.name
          ? applyUniodontoModeFilters({
              ...resolvedFilters,
              operatorName: operatorContext.name,
              regAns: operatorContext?.regAns ? [operatorContext.regAns] : resolvedFilters.regAns,
            })
          : applyUniodontoModeFilters(applyComparisonFilters(comparisonPeriodFilters))
        const tableOptions = operatorContext?.name
          ? {
              includeAllColumns: true,
              ignorePeriodFilters: true,
              operatorName: operatorContext.name,
            }
          : {}
        const [summary, table, monetary] = await Promise.all([
          fetchKpiSummary(summaryFilters),
          fetchTableData(applyUniodontoModeFilters(resolvedFilters), tableOptions),
          fetchMonetarySummary(summaryFilters),
        ])
        if (cancelled) return
        setKpis(summary)
        setTableData(table)
        setMonetarySummary(monetary)
      } catch (err) {
        if (cancelled) return
        console.error('[Dashboard] Query error', err)
        setError(err)
      } finally {
        // Always decrement, even when this effect is cancelled due to filter/tab changes.
        // Otherwise the counter can "leak" and keep isQuerying=true forever.
        queryCounterRef.current = Math.max(0, queryCounterRef.current - 1)
        if (queryCounterRef.current === 0) {
          setIsQuerying(false)
        }
      }
    }
    runQueries()
    return () => {
      cancelled = true
    }
  }, [
    status,
    isIndicatorsTab,
    resolvedFilters,
    uniodontoMode,
    applyComparisonFilters,
    applyUniodontoModeFilters,
    operatorContext?.name,
    operatorContext?.regAns,
  ])

  useEffect(() => {
    if (status !== 'ready' || !isRankingTab) return
    let cancelled = false
    queryCounterRef.current += 1
    setIsQuerying(true)
    async function runQueries() {
      try {
        const baseRankingFilters = { ...resolvedFilters, search: '' }
        const rankingFilters = applyUniodontoModeFilters(applyComparisonFilters(baseRankingFilters))
        const rankingPromise = uniodontoMode
          ? fetchUniodontoRanking(uniodontoRankingMetric, rankingFilters, null, uniodontoRankingOrder, {
              operatorName: operatorContext?.name ?? null,
            })
          : rankingMetricState === 'regulatory_score'
            ? fetchRegulatoryScoreRanking(rankingFilters, null, rankingOrder, {
                operatorName: operatorContext?.name ?? null,
              })
            : fetchRanking(rankingMetricState, rankingFilters, null, rankingOrder, {
                operatorName: operatorContext?.name ?? null,
              })
        const monetaryRankingPromise = fetchMonetaryRanking(
          monetaryRankingMetric,
          rankingFilters,
          null,
          monetaryRankingOrder,
          {
            operatorName: operatorContext?.name ?? null,
          },
        ).catch((err) => {
          console.warn('[Dashboard] Falha ao carregar ranking monetário', err)
          return { rows: [], operatorRow: null }
        })
        const [ranking, monetaryRanking] = await Promise.all([rankingPromise, monetaryRankingPromise])
        if (cancelled) return
        setRankingData(ranking)
        setMonetaryRankingData(monetaryRanking)
      } catch (err) {
        if (cancelled) return
        console.error('[Dashboard] Query error', err)
        setError(err)
      } finally {
        // Always decrement, even when this effect is cancelled due to filter/tab changes.
        // Otherwise the counter can "leak" and keep isQuerying=true forever.
        queryCounterRef.current = Math.max(0, queryCounterRef.current - 1)
        if (queryCounterRef.current === 0) {
          setIsQuerying(false)
        }
      }
    }
    runQueries()
    return () => {
      cancelled = true
    }
  }, [
    status,
    isRankingTab,
    resolvedFilters,
    rankingMetricState,
    rankingOrder,
    uniodontoMode,
    uniodontoRankingMetric,
    uniodontoRankingOrder,
    monetaryRankingMetric,
    monetaryRankingOrder,
    applyComparisonFilters,
    applyUniodontoModeFilters,
    operatorContext?.name,
  ])

  useEffect(() => {
    if (status !== 'ready' || !isHistoryTab) {
      setIsTrendLoading(false)
      return
    }
    let cancelled = false
    setIsTrendLoading(true)
    async function loadAllTrends() {
      try {
        const trendComparison = operatorContext?.name
          ? {
              operatorName: operatorContext.name,
              filters: applyUniodontoModeFilters(comparisonFilterQuery),
            }
          : null
        const seriesMap = await fetchTrendSeriesBatch(trendMetricList, trendFilters, trendComparison)
        if (cancelled) return
        setTrendSeriesByMetric(seriesMap ?? {})
      } catch (err) {
        if (!cancelled) console.error('[Dashboard] Falha ao carregar séries históricas', err)
        if (!cancelled) setTrendSeriesByMetric({})
      } finally {
        if (!cancelled) setIsTrendLoading(false)
      }
    }
    loadAllTrends()
    return () => {
      cancelled = true
    }
  }, [
    status,
    isHistoryTab,
    trendFilters,
    operatorContext?.name,
    comparisonFilterQuery,
    trendMetricList,
    applyUniodontoModeFilters,
  ])

  useEffect(() => {
    if (status !== 'ready') return
    if (uniodontoMode) {
      setRegulatoryScore({ data: null, isLoading: false, error: null })
      return
    }
    let cancelled = false
    setRegulatoryScore((prev) => ({ ...prev, isLoading: true, error: null }))
    async function loadRegulatoryScore() {
      try {
        let response = null
        if (operatorContext?.name && operatorPeriod?.ano && operatorPeriod?.trimestre) {
          const operatorFilters = {
            ...resolvedFilters,
            anos: [operatorPeriod.ano],
            trimestres: [operatorPeriod.trimestre],
            operatorName: operatorContext.name,
          }
          if (operatorContext?.regAns) {
            operatorFilters.regAns = [operatorContext.regAns]
          }
          const peerFiltersForScore = applyComparisonFilters({
            ...resolvedFilters,
            anos: [operatorPeriod.ano],
            trimestres: [operatorPeriod.trimestre],
            search: '',
          })
          response = await fetchRegulatoryReport(operatorFilters, peerFiltersForScore)
        } else {
          const baseFilters = applyComparisonFilters({
            anos: resolvedFilters.anos ?? [],
            trimestres: resolvedFilters.trimestres ?? [],
          })
          response = await fetchRegulatoryScoreForFilters(baseFilters, baseFilters)
        }
        if (cancelled) return
        setRegulatoryScore({
          data: evaluateRegulatoryScore(response),
          isLoading: false,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        console.error('[Dashboard] Falha ao carregar score regulatório', err)
        setRegulatoryScore({ data: null, isLoading: false, error: err })
      }
    }
    loadRegulatoryScore()
    return () => {
      cancelled = true
    }
  }, [
    status,
    uniodontoMode,
    operatorContext?.name,
    operatorContext?.regAns,
    operatorPeriod?.ano,
    operatorPeriod?.trimestre,
    resolvedFilters,
    applyComparisonFilters,
    operatorPeerFilters,
  ])

  useEffect(() => {
    if (!operatorContext?.name) {
      setOperatorSnapshot({ operator: null, peers: null, availablePeriods: [], selectedPeriod: null })
      setAnsPeerSummary(null)
      setUniodontoPeerSummary(null)
      return
    }
    let cancelled = false
    async function loadSnapshot() {
      try {
        const snapshot = await fetchOperatorSnapshot(operatorContext.name, operatorPeriod, comparisonFilterQuery)
        if (cancelled) return
        setOperatorSnapshot(snapshot)
        if (snapshot?.selectedPeriod) {
          setOperatorPeriod(snapshot.selectedPeriod)
        }
      } catch (err) {
        if (!cancelled) console.error('[Dashboard] Falha ao carregar operadora', err)
      }
    }
    loadSnapshot()
    return () => {
      cancelled = true
    }
  }, [
    operatorContext?.name,
    operatorPeriod?.ano,
    operatorPeriod?.trimestre,
    operatorPeriod,
    comparisonFilterQuery,
    uniodontoMode,
    applyComparisonFilters,
    applyUniodontoModeFilters,
  ])

  useEffect(() => {
    if (!operatorContext?.name || !uniodontoMode) {
      setUniodontoPeerSummary(null)
      return
    }
    let cancelled = false
    async function loadUniodontoPeers() {
      try {
        if (!operatorPeriod?.ano || !operatorPeriod?.trimestre) {
          setUniodontoPeerSummary(null)
          return
        }
        const baseFilters = applyUniodontoModeFilters(
          applyComparisonFilters({
            anos: [operatorPeriod.ano],
            trimestres: [operatorPeriod.trimestre],
            search: '',
          }),
        )
        const excludeOperatorName =
          operatorContext.name === VIRTUAL_OPERATOR_UNIODONTO ? null : operatorContext.name
        const peerSummary = await fetchUniodontoPeerSummary(baseFilters, { excludeOperatorName })
        if (!cancelled) {
          setUniodontoPeerSummary(peerSummary)
        }
      } catch (err) {
        if (!cancelled) console.error('[Dashboard] Falha ao carregar média filtrada Uniodonto', err)
      }
    }
    loadUniodontoPeers()
    return () => {
      cancelled = true
    }
  }, [
    operatorContext?.name,
    operatorPeriod?.ano,
    operatorPeriod?.trimestre,
    comparisonFilterQuery,
    uniodontoMode,
    applyComparisonFilters,
    applyUniodontoModeFilters,
  ])

  useEffect(() => {
    if (!operatorContext?.name || uniodontoMode) {
      setAnsPeerSummary(null)
      return
    }
    let cancelled = false
    async function loadAnsPeers() {
      try {
        if (!operatorPeriod?.ano || !operatorPeriod?.trimestre) {
          setAnsPeerSummary(null)
          return
        }
        const baseFilters = applyComparisonFilters({
          anos: [operatorPeriod.ano],
          trimestres: [operatorPeriod.trimestre],
          search: '',
        })
        const excludeOperatorName =
          operatorContext.name === VIRTUAL_OPERATOR_UNIODONTO ? null : operatorContext.name
        const peerSummary = await fetchAnsPeerSummary(baseFilters, { excludeOperatorName })
        if (!cancelled) {
          setAnsPeerSummary(peerSummary)
        }
      } catch (err) {
        if (!cancelled) console.error('[Dashboard] Falha ao carregar média filtrada ANS', err)
      }
    }
    loadAnsPeers()
    return () => {
      cancelled = true
    }
  }, [
    operatorContext?.name,
    operatorPeriod?.ano,
    operatorPeriod?.trimestre,
    comparisonFilterQuery,
    uniodontoMode,
    applyComparisonFilters,
  ])

  async function applyOperatorSelection(operatorName) {
    operatorSelectionRef.current += 1
    const requestId = operatorSelectionRef.current
    if (!operatorName) {
      setFilters((prev) => ({ ...prev, search: '' }))
      setOperatorContext(null)
      return
    }
    try {
      const latest = await fetchOperatorLatestSnapshot(operatorName)
      if (operatorSelectionRef.current !== requestId) return
      if (!latest) {
        setFilters((prev) => ({ ...prev, search: operatorName }))
        setOperatorContext(null)
        return
      }
      const resolvedPorte = latest.porte ?? computePorteFromBeneficiarios(latest.qt_beneficiarios)
      setFilters((prev) => ({
        ...prev,
        search: operatorName,
      }))
      const isVirtualUniodonto = operatorName === VIRTUAL_OPERATOR_UNIODONTO
      const nextComparison = isVirtualUniodonto
        ? {
            uniodonto: [false],
          }
        : {
            modalidades: latest.modalidade ? [latest.modalidade] : undefined,
            portes: resolvedPorte ? [resolvedPorte] : undefined,
            uniodonto: typeof latest.uniodonto === 'boolean' ? [latest.uniodonto] : undefined,
            ativa: typeof latest.ativa === 'boolean' ? [latest.ativa] : undefined,
          }
      syncComparisonFilters(nextComparison)
      setOperatorContext({
        name: operatorName,
        modalidade: latest.modalidade ?? null,
        porte: resolvedPorte ?? null,
        uniodonto: isVirtualUniodonto ? true : typeof latest.uniodonto === 'boolean' ? latest.uniodonto : null,
        ativa: typeof latest.ativa === 'boolean' ? latest.ativa : null,
        regAns: latest.reg_ans ?? null,
      })
      setOperatorPeriod({ ano: latest.ano, trimestre: latest.trimestre, periodo: latest.periodo ?? `${latest.ano}T${latest.trimestre}` })
    } catch (err) {
      console.error('[Dashboard] Falha ao selecionar operadora', err)
      setOperatorContext(null)
    }
  }

  function syncComparisonFilters(nextFilters = DEFAULT_COMPARISON_FILTERS) {
    const sanitized = sanitizeComparisonFilters(nextFilters)
    setComparisonFilters(sanitized)
    setComparisonFiltersDraft(sanitized)
  }

  const setRankingMetric = useCallback((nextMetric) => {
    setRankingMetricState(nextMetric)
    setRankingOrder(getMetricOrder(nextMetric))
  }, [])

  const setUniodontoRankingMetricState = useCallback((nextMetric) => {
    setUniodontoRankingMetric(nextMetric)
    setUniodontoRankingOrder(getUniodontoMetricOrder(nextMetric))
  }, [])

  const setMonetaryRankingMetricState = useCallback((nextMetric) => {
    setMonetaryRankingMetric(nextMetric)
    setMonetaryRankingOrder(getMonetaryMetricOrder(nextMetric))
  }, [])

  function updateFilters(partial) {
    setFilters((prev) => ({
      ...prev,
      ...partial,
    }))
  }

  function resetFilters() {
    setFilters({ ...defaultFilters })
    syncComparisonFilters()
    setOperatorContext(null)
    setOperatorPeriod(null)
  }

  function updateComparisonFilters(nextFilters) {
    setComparisonFiltersDraft(sanitizeComparisonFilters(nextFilters))
  }

  function commitComparisonFilters() {
    syncComparisonFilters(comparisonFiltersDraft)
  }

  function resetComparisonFiltersState() {
    syncComparisonFilters()
  }

  return {
    status,
    error,
    filters,
    options,
    periodOptions,
    kpis,
    rankingMetric: rankingMetricState,
    setRankingMetric,
    rankingData,
    rankingOrder,
    setRankingOrder,
    uniodontoMode,
    setUniodontoMode,
    uniodontoRankingMetric,
    setUniodontoRankingMetric: setUniodontoRankingMetricState,
    uniodontoRankingOrder,
    ansPeerSummary,
    uniodontoPeerSummary,
    monetaryRankingMetric,
    setMonetaryRankingMetric: setMonetaryRankingMetricState,
    setMonetaryRankingOrder,
    monetaryRankingData,
    trendSeriesByMetric,
    isTrendLoading,
    tableData,
    isQuerying,
    updateFilters,
    resetFilters,
    applyOperatorSelection,
    operatorInsight: {
      ...operatorSnapshot,
      operatorName: operatorContext?.name ?? null,
    },
    operatorContext,
    operatorPeriod,
    setOperatorPeriod,
    comparisonFilters,
    comparisonFiltersDraft,
    updateComparisonFilters,
    commitComparisonFilters,
    resetComparisonFiltersState,
    monetarySummary,
    regulatoryScore,
  }
}
