import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadDataset,
  fetchOperatorOptions,
  fetchOperatorLatestSnapshot,
  fetchOperatorSnapshot,
  fetchKpiSummary,
  fetchRanking,
  fetchTableData,
  persistDatasetFile,
  fetchAvailablePeriods,
} from '../lib/dataService'
import { DEFAULT_COMPARISON_FILTERS, comparisonFiltersToQuery, sanitizeComparisonFilters } from '../lib/comparisonModes'
import { metricFormulas } from '../lib/metricFormulas'

const rankingCatalog = metricFormulas.filter((metric) => metric.showInCards)
const DEFAULT_RANKING_METRIC = rankingCatalog[0]?.id ?? 'resultado_liquido'

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

const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
const resolveDataPath = (filename) => `${basePath ? `${basePath}/` : ''}data/${filename}`

const DEFAULT_SOURCES = {
  csvUrl: resolveDataPath('indicadores.csv'),
}

export function useDashboardController() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ ...defaultFilters })
  const [options, setOptions] = useState(defaultOptions)
  const [periodOptions, setPeriodOptions] = useState([])
  const [kpis, setKpis] = useState(null)
  const [rankingMetric, setRankingMetric] = useState(DEFAULT_RANKING_METRIC)
  const [rankingData, setRankingData] = useState({ rows: [], operatorRow: null })
  const [rankingOrder, setRankingOrder] = useState('DESC')
  const [tableData, setTableData] = useState({ rows: [], columns: [] })
  const [isQuerying, setIsQuerying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState(null)
  const [sourceInfo, setSourceInfo] = useState(null)

  const [comparisonFilters, setComparisonFilters] = useState(() => sanitizeComparisonFilters(DEFAULT_COMPARISON_FILTERS))
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
        const loadedSource = await loadDataset(DEFAULT_SOURCES)
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
        const summaryFilters = operatorContext?.name ? resolvedFilters : applyComparisonFilters(resolvedFilters)
        const baseRankingFilters = operatorContext?.name ? { ...resolvedFilters, search: '' } : resolvedFilters
        const rankingFilters = applyComparisonFilters(baseRankingFilters)
        const tableOptions = operatorContext?.name
          ? {
              includeAllColumns: true,
              ignorePeriodFilters: true,
              operatorName: operatorContext.name,
            }
          : {}
        const [summary, ranking, table] = await Promise.all([
          fetchKpiSummary(summaryFilters),
          fetchRanking(rankingMetric, rankingFilters, 10, rankingOrder, { operatorName: operatorContext?.name ?? null }),
          fetchTableData(resolvedFilters, tableOptions),
        ])
        if (cancelled) return
        setKpis(summary)
        setRankingData(ranking)
        setTableData(table)
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
  }, [status, resolvedFilters, rankingMetric, rankingOrder, applyComparisonFilters, operatorContext?.name])

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
      setFilters((prev) => ({ ...prev, search: operatorName }))
      setOperatorContext({
        name: operatorName,
        modalidade: latest.modalidade ?? null,
        porte: latest.porte ?? null,
        uniodonto: latest.uniodonto ?? null,
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
      const text = await file.text()
      await persistDatasetFile(file.name, text)
      const loadedSource = await loadDataset({ csvText: text, filename: file.name })
      setSourceInfo(loadedSource)
      const [operatorNames, availablePeriods] = await Promise.all([fetchOperatorOptions(), fetchAvailablePeriods()])
      setOptions({
        operadoras: operatorNames,
      })
      setPeriodOptions(availablePeriods ?? [])
      setFilters({ ...defaultFilters })
      setComparisonFilters(sanitizeComparisonFilters(DEFAULT_COMPARISON_FILTERS))
      setOperatorContext(null)
      setOperatorPeriod(null)
      setStatus('ready')
      setUploadFeedback({ type: 'success', message: `Arquivo ${file.name} importado.` })
    } catch (err) {
      console.error('[Dashboard] Falha ao substituir dataset', err)
      setError(err)
      setStatus('error')
      setUploadFeedback({ type: 'error', message: 'Falha ao importar CSV.' })
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (!uploadFeedback) return undefined
    const timer = setTimeout(() => setUploadFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [uploadFeedback])

  function updateFilters(partial) {
    setFilters((prev) => ({
      ...prev,
      ...partial,
    }))
  }

  function resetFilters() {
    setFilters({ ...defaultFilters })
    setComparisonFilters(sanitizeComparisonFilters(DEFAULT_COMPARISON_FILTERS))
    setOperatorContext(null)
    setOperatorPeriod(null)
  }

  function updateComparisonFilters(nextFilters) {
    setComparisonFilters(sanitizeComparisonFilters(nextFilters))
  }

  return {
    status,
    error,
    filters,
    options,
    periodOptions,
    kpis,
    rankingMetric,
    setRankingMetric,
    rankingData,
    rankingOrder,
    setRankingOrder,
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
    updateComparisonFilters,
  }
}
