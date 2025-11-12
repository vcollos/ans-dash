import { useEffect, useMemo, useRef, useState } from 'react'
import {
  loadDataset,
  fetchOperatorOptions,
  fetchOperatorLatestSnapshot,
  fetchOperatorSnapshot,
  fetchKpiSummary,
  fetchRanking,
  fetchTableData,
  persistDatasetFile,
} from '../lib/dataService'

const DEFAULT_COMPARISON_MODE = 'all-uniodonto'

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
  const [kpis, setKpis] = useState(null)
  const [rankingMetric, setRankingMetric] = useState('resultado_liquido')
  const [rankingData, setRankingData] = useState({ rows: [], operatorRow: null })
  const [rankingOrder, setRankingOrder] = useState('DESC')
  const [tableData, setTableData] = useState({ rows: [], columns: [] })
  const [isQuerying, setIsQuerying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState(null)
  const [sourceInfo, setSourceInfo] = useState(null)

  const [comparisonMode, setComparisonMode] = useState(DEFAULT_COMPARISON_MODE)
  const [operatorContext, setOperatorContext] = useState(null)
  const [operatorSnapshot, setOperatorSnapshot] = useState({
    operator: null,
    peers: null,
    availablePeriods: [],
    selectedPeriod: null,
  })
  const [operatorPeriod, setOperatorPeriod] = useState(null)
  const operatorSelectionRef = useRef(0)

  const resolvedFilters = useMemo(() => {
    if (operatorPeriod?.ano && operatorPeriod?.trimestre) {
      return {
        ...filters,
        anos: [operatorPeriod.ano],
        trimestres: [operatorPeriod.trimestre],
      }
    }
    return filters
  }, [filters, operatorPeriod?.ano, operatorPeriod?.trimestre])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        setStatus('loading')
        const loadedSource = await loadDataset(DEFAULT_SOURCES)
        if (cancelled) return
        setSourceInfo(loadedSource)
        const operatorNames = await fetchOperatorOptions()
        if (cancelled) return
        setOptions({ operadoras: operatorNames })
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
        const comparisonOptions = operatorContext?.name
          ? {
              comparisonMode,
              operatorName: operatorContext.name,
              operatorModalidade: operatorContext.modalidade ?? operatorSnapshot.operator?.modalidade ?? null,
              operatorUniodonto: operatorContext.uniodonto ?? operatorSnapshot.operator?.uniodonto ?? null,
              operatorPorte: operatorContext.porte ?? operatorSnapshot.operator?.porte ?? null,
            }
          : null
        const rankingFilters = operatorContext?.name ? { ...resolvedFilters, search: '' } : resolvedFilters
        const rankingComparisonOptions = comparisonOptions ?? {}
        const [summary, ranking, table] = await Promise.all([
          fetchKpiSummary(resolvedFilters),
          fetchRanking(rankingMetric, rankingFilters, 10, rankingOrder, rankingComparisonOptions),
          fetchTableData(resolvedFilters),
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
  }, [status, resolvedFilters, rankingMetric, rankingOrder, comparisonMode, operatorContext?.name])

  useEffect(() => {
    if (!operatorContext?.name) {
      setOperatorSnapshot({ operator: null, peers: null, availablePeriods: [], selectedPeriod: null })
      setOperatorPeriod(null)
      return
    }
    let cancelled = false
    async function loadSnapshot() {
      try {
        const snapshot = await fetchOperatorSnapshot(operatorContext.name, operatorPeriod, comparisonMode)
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
  }, [operatorContext?.name, operatorPeriod?.ano, operatorPeriod?.trimestre, comparisonMode])

  async function applyOperatorSelection(operatorName) {
    operatorSelectionRef.current += 1
    const requestId = operatorSelectionRef.current
    if (!operatorName) {
      setFilters((prev) => ({ ...prev, search: '' }))
      setOperatorContext(null)
      setOperatorPeriod(null)
      return
    }
    try {
      const latest = await fetchOperatorLatestSnapshot(operatorName)
      if (operatorSelectionRef.current !== requestId) return
      if (!latest) {
        setFilters((prev) => ({ ...prev, search: operatorName }))
        setOperatorContext(null)
        setOperatorPeriod(null)
        return
      }
      setFilters((prev) => ({ ...prev, search: operatorName }))
      setOperatorContext({
        name: operatorName,
        modalidade: latest.modalidade ?? null,
        porte: latest.porte ?? null,
        uniodonto: latest.uniodonto ?? null,
      })
      setOperatorPeriod({ ano: latest.ano, trimestre: latest.trimestre })
    } catch (err) {
      console.error('[Dashboard] Falha ao selecionar operadora', err)
      setOperatorContext(null)
      setOperatorPeriod(null)
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
      const operatorNames = await fetchOperatorOptions()
      setOptions({ operadoras: operatorNames })
      setFilters({ ...defaultFilters })
      setComparisonMode(DEFAULT_COMPARISON_MODE)
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
    setComparisonMode(DEFAULT_COMPARISON_MODE)
    setOperatorContext(null)
    setOperatorPeriod(null)
  }

  return {
    status,
    error,
    filters,
    options,
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
    comparisonMode,
    setComparisonMode,
  }
}
