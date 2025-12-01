import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadDataset,
  fetchOperatorOptions,
  fetchOperatorLatestSnapshot,
  fetchOperatorSnapshot,
  fetchKpiSummary,
  fetchMonetarySummary,
  fetchRanking,
  fetchRegulatoryScoreRanking,
  fetchTrendSeries,
  fetchTableData,
  persistDatasetFile,
  fetchAvailablePeriods,
  fetchRegulatoryReport,
  fetchRegulatoryScoreForFilters,
} from '../lib/dataService'
import { DEFAULT_COMPARISON_FILTERS, comparisonFiltersToQuery, sanitizeComparisonFilters } from '../lib/comparisonModes'
import { metricFormulas } from '../lib/metricFormulas'
import { evaluateRegulatoryScore } from '../lib/regulatoryScore'

const rankingCatalog = metricFormulas.filter((metric) => metric.showInCards)
const DEFAULT_RANKING_METRIC = 'regulatory_score'

const getMetricTrend = (metricId) => {
  if (metricId === 'regulatory_score') return 'higher'
  return rankingCatalog.find((metric) => metric.id === metricId)?.trend ?? 'higher'
}
const getMetricOrder = (metricId) => (getMetricTrend(metricId) === 'lower' ? 'ASC' : 'DESC')

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

const DEFAULT_CURATED_URL = import.meta.env.VITE_DATASET_CURATED_URL ?? '/data/indicadores.csv'
const DEFAULT_PARQUET_URL = import.meta.env.VITE_DATASET_PARQUET_URL ?? '/data/20251213_contas_ans.parquet'
const LEGACY_CSV_URL = import.meta.env.VITE_DATASET_URL ?? '/api/indicadores.csv'
const DEFAULT_SOURCES = {
  curatedUrl: DEFAULT_CURATED_URL,
  parquetUrl: DEFAULT_PARQUET_URL,
  fallbackCsvUrl: LEGACY_CSV_URL,
}
const PARQUET_EXTENSION = /\.parquet$/i

const isParquetFile = (name) => PARQUET_EXTENSION.test(name ?? '')

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const [, base64] = reader.result.split(',')
        resolve(base64 ?? '')
      } else {
        reject(new Error('Não foi possível converter o arquivo para base64.'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo.'))
    reader.readAsDataURL(file)
  })
}

export function useDashboardController() {
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
  const [trendMetric, setTrendMetric] = useState(DEFAULT_RANKING_METRIC)
  const [trendSeries, setTrendSeries] = useState({ rows: [], isLoading: false })
  const [tableData, setTableData] = useState({ rows: [], columns: [] })
  const [isQuerying, setIsQuerying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState(null)
  const [sourceInfo, setSourceInfo] = useState(null)
  const [regulatoryScore, setRegulatoryScore] = useState({ data: null, isLoading: false, error: null })

  const [comparisonFilters, setComparisonFilters] = useState(() => createDefaultComparisonFilters())
  const [comparisonFiltersDraft, setComparisonFiltersDraft] = useState(() => createDefaultComparisonFilters())
  const [operatorContext, setOperatorContext] = useState(null)
  const [operatorSnapshot, setOperatorSnapshot] = useState({
    operator: null,
    peers: null,
    availablePeriods: [],
    selectedPeriod: null,
  })
  const [operatorPeriod, setOperatorPeriod] = useState(null)
  const operatorSelectionRef = useRef(0)

  const comparisonFilterQuery = useMemo(() => comparisonFiltersToQuery(comparisonFilters), [comparisonFilters])

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
    }
    if (operatorPeriod?.trimestre) {
      nextFilters = {
        ...nextFilters,
        trimestres: [operatorPeriod.trimestre],
      }
    }
    return nextFilters
  }, [filters, operatorPeriod?.trimestre, operatorContext?.name])

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

  useEffect(() => {
    if (operatorPeriod?.ano && operatorPeriod?.trimestre) return
    if (!periodOptions.length) return
    const [latest] = periodOptions
    if (latest) {
      setOperatorPeriod({ ano: latest.ano, trimestre: latest.trimestre, periodo: latest.periodo })
    }
  }, [periodOptions, operatorPeriod?.ano, operatorPeriod?.trimestre])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        setStatus('loading')
        async function loadInitialDataset() {
          const attempts = [
            DEFAULT_SOURCES.curatedUrl ? { type: 'curated', payload: { csvUrl: DEFAULT_SOURCES.curatedUrl } } : null,
            DEFAULT_SOURCES.parquetUrl ? { type: 'parquet', payload: { parquetUrl: DEFAULT_SOURCES.parquetUrl } } : null,
            DEFAULT_SOURCES.fallbackCsvUrl ? { type: 'csv', payload: { csvUrl: DEFAULT_SOURCES.fallbackCsvUrl } } : null,
          ].filter(Boolean)
          if (!attempts.length) {
            throw new Error('Nenhuma fonte padrão configurada.')
          }
          let lastError = null
          for (const attempt of attempts) {
            try {
              return await loadDataset(attempt.payload)
            } catch (err) {
              lastError = err
              console.warn(`[Dashboard] Falha ao carregar fonte ${attempt.type}, tentando próxima...`, err)
            }
          }
          throw lastError ?? new Error('Não foi possível carregar nenhuma fonte de dados.')
        }
        const loadedSource = await loadInitialDataset()
        if (cancelled) return
        setSourceInfo(loadedSource)
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
    if (status !== 'ready') return
    let cancelled = false
    setIsQuerying(true)
    async function runQueries() {
      try {
        const comparisonPeriodFilters = {
          anos: resolvedFilters.anos ?? [],
          trimestres: resolvedFilters.trimestres ?? [],
        }
        const summaryFilters = operatorContext?.name
          ? {
              ...resolvedFilters,
              operatorName: operatorContext.name,
              regAns: operatorContext?.regAns ? [operatorContext.regAns] : resolvedFilters.regAns,
            }
          : applyComparisonFilters(comparisonPeriodFilters)
        const baseRankingFilters = operatorContext?.name ? { ...resolvedFilters, search: '' } : resolvedFilters
        const rankingFilters = applyComparisonFilters(baseRankingFilters)
        const tableOptions = operatorContext?.name
          ? {
              includeAllColumns: true,
              ignorePeriodFilters: true,
              operatorName: operatorContext.name,
            }
          : {}
        const rankingPromise =
          rankingMetricState === 'regulatory_score'
            ? fetchRegulatoryScoreRanking(rankingFilters, null, rankingOrder, {
                operatorName: operatorContext?.name ?? null,
              })
            : fetchRanking(rankingMetricState, rankingFilters, null, rankingOrder, {
                operatorName: operatorContext?.name ?? null,
              })
        const [summary, ranking, table, monetary] = await Promise.all([
          fetchKpiSummary(summaryFilters),
          rankingPromise,
          fetchTableData(resolvedFilters, tableOptions),
          fetchMonetarySummary(summaryFilters),
        ])
        if (cancelled) return
        setKpis(summary)
        setRankingData(ranking)
        setTableData(table)
        setMonetarySummary(monetary)
      } catch (err) {
        if (cancelled) return
        console.error('[Dashboard] Query error', err)
        setError(err)
      } finally {
        if (!cancelled) {
          setIsQuerying(false)
        }
      }
    }
    runQueries()
    return () => {
      cancelled = true
    }
  }, [status, resolvedFilters, rankingMetricState, rankingOrder, applyComparisonFilters, operatorContext?.name])

  useEffect(() => {
    if (status !== 'ready') return
    let cancelled = false
    setTrendSeries((prev) => ({ ...prev, isLoading: true }))
    async function loadTrend() {
      try {
        const trendComparison = operatorContext?.name
          ? {
              operatorName: operatorContext.name,
              filters: comparisonFilterQuery,
            }
          : null
        const series = await fetchTrendSeries(trendMetric, trendFilters, trendComparison)
        if (cancelled) return
        setTrendSeries({ rows: series ?? [], isLoading: false })
      } catch (err) {
        if (!cancelled) console.error('[Dashboard] Falha ao carregar série histórica', err)
        if (!cancelled) {
          setTrendSeries({ rows: [], isLoading: false })
        }
      }
    }
    loadTrend()
    return () => {
      cancelled = true
    }
  }, [status, trendMetric, trendFilters, operatorContext?.name, comparisonFilterQuery])

  useEffect(() => {
    if (status !== 'ready') return
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
  }, [operatorContext?.name, operatorPeriod?.ano, operatorPeriod?.trimestre, comparisonFilterQuery])

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
      setFilters((prev) => ({
        ...prev,
        search: operatorName,
      }))
      const nextComparison = {
        modalidades: latest.modalidade ? [latest.modalidade] : undefined,
        portes: latest.porte ? [latest.porte] : undefined,
        uniodonto: typeof latest.uniodonto === 'boolean' ? [latest.uniodonto] : undefined,
        ativa: typeof latest.ativa === 'boolean' ? [latest.ativa] : undefined,
      }
      syncComparisonFilters(nextComparison)
      setOperatorContext({
        name: operatorName,
        modalidade: latest.modalidade ?? null,
        porte: latest.porte ?? null,
        uniodonto: typeof latest.uniodonto === 'boolean' ? latest.uniodonto : null,
        ativa: typeof latest.ativa === 'boolean' ? latest.ativa : null,
        regAns: latest.reg_ans ?? null,
      })
      setOperatorPeriod({ ano: latest.ano, trimestre: latest.trimestre, periodo: latest.periodo ?? `${latest.ano}T${latest.trimestre}` })
    } catch (err) {
      console.error('[Dashboard] Falha ao selecionar operadora', err)
      setOperatorContext(null)
    }
  }

  async function replaceDataset(file) {
    if (!file) return
    try {
      setIsUploading(true)
      setError(null)
      setStatus('loading')
      let loadedSource = null
      if (isParquetFile(file.name)) {
        const buffer = await file.arrayBuffer()
        const base64 = await readFileAsBase64(file)
        await persistDatasetFile(file.name, base64, 'base64')
        loadedSource = await loadDataset({ parquetBuffer: buffer, filename: file.name })
      } else {
        const text = await file.text()
        await persistDatasetFile(file.name, text, 'utf8')
        loadedSource = await loadDataset({ csvText: text, filename: file.name })
      }
      setSourceInfo(loadedSource)
      const [operatorNames, availablePeriods] = await Promise.all([fetchOperatorOptions(), fetchAvailablePeriods()])
      setOptions({
        operadoras: operatorNames,
      })
      setPeriodOptions(availablePeriods ?? [])
      setFilters({ ...defaultFilters })
      syncComparisonFilters()
      setOperatorContext(null)
      setOperatorPeriod(null)
      setStatus('ready')
      setUploadFeedback({ type: 'success', message: `Arquivo ${file.name} importado.` })
    } catch (err) {
      console.error('[Dashboard] Falha ao substituir dataset', err)
      setError(err)
      setStatus('error')
      setUploadFeedback({ type: 'error', message: 'Falha ao importar arquivo.' })
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (!uploadFeedback) return undefined
    const timer = setTimeout(() => setUploadFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [uploadFeedback])

  function syncComparisonFilters(nextFilters = DEFAULT_COMPARISON_FILTERS) {
    const sanitized = sanitizeComparisonFilters(nextFilters)
    setComparisonFilters(sanitized)
    setComparisonFiltersDraft(sanitized)
  }

  const setRankingMetric = useCallback((nextMetric) => {
    setRankingMetricState(nextMetric)
    setRankingOrder(getMetricOrder(nextMetric))
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
    trendMetric,
    setTrendMetric,
    trendSeries,
    tableData,
    isQuerying,
    isUploading,
    uploadFeedback,
    updateFilters,
    resetFilters,
    applyOperatorSelection,
    replaceDataset,
    sourceInfo,
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
