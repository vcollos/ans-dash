import { useEffect, useMemo, useState } from 'react'
import {
  loadDataset,
  fetchFilterOptions,
  fetchKpiSummary,
  fetchTrendSeries,
  fetchRanking,
  fetchScatter,
  fetchTableData,
  getMetricsCatalog,
} from '../lib/dataService'

const defaultFilters = {
  modalidades: [],
  portes: [],
  anos: [],
  trimestres: [],
  ativa: null,
  uniodonto: null,
  sinistralidade: { min: 0, max: 150 },
  margem: { min: -100, max: 100 },
  liquidez: { min: 0, max: 10 },
  regAns: [],
  search: '',
}

const defaultOptions = {
  modalidades: [],
  portes: [],
  anos: [],
  trimestres: [],
  regAns: [],
  operadoras: [],
}

const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
const resolveDataPath = (filename) => `${basePath ? `${basePath}/` : ''}data/${filename}`

const DEFAULT_SOURCES = {
  parquetUrl: resolveDataPath('20251103_indicadores_parquet.parquet'),
  csvUrl: resolveDataPath('20251103_indicadores_csv.csv'),
}

export function useDashboardController() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(() => ({
    ...defaultFilters,
    modalidades: [...defaultFilters.modalidades],
    portes: [...defaultFilters.portes],
    anos: [...defaultFilters.anos],
    trimestres: [...defaultFilters.trimestres],
    regAns: [...defaultFilters.regAns],
    sinistralidade: { ...defaultFilters.sinistralidade },
    margem: { ...defaultFilters.margem },
    liquidez: { ...defaultFilters.liquidez },
  }))
  const [options, setOptions] = useState(defaultOptions)
  const [kpis, setKpis] = useState(null)
  const [trendMetric, setTrendMetric] = useState('sinistralidade_pct')
  const [trendData, setTrendData] = useState([])
  const [rankingMetric, setRankingMetric] = useState('resultado_liquido')
  const [rankingData, setRankingData] = useState([])
  const [rankingOrder, setRankingOrder] = useState('DESC')
  const [scatterMetrics, setScatterMetrics] = useState({ x: 'liquidez_corrente', y: 'margem_lucro_pct' })
  const [scatterData, setScatterData] = useState([])
  const [tableData, setTableData] = useState({ rows: [], columns: [] })
  const [isQuerying, setIsQuerying] = useState(false)
  const [sourceInfo, setSourceInfo] = useState(null)

  const metricsCatalog = useMemo(() => getMetricsCatalog(), [])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        setStatus('loading')
        const loadedSource = await loadDataset(DEFAULT_SOURCES)
        if (cancelled) {
          return
        }
        setSourceInfo(loadedSource)
        const availableOptions = await fetchFilterOptions()
        if (cancelled) {
          return
        }
        setOptions(availableOptions)
        setStatus('ready')
      } catch (err) {
        if (cancelled) {
          return
        }
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
    if (status !== 'ready') {
      return
    }
    let cancelled = false
    setIsQuerying(true)
    async function runQueries() {
      try {
        const [summary, trend, ranking, scatter, table] = await Promise.all([
          fetchKpiSummary(filters),
          fetchTrendSeries(trendMetric, filters),
          fetchRanking(rankingMetric, filters, 10, rankingOrder),
          fetchScatter(scatterMetrics.x, scatterMetrics.y, filters),
          fetchTableData(filters),
        ])
        if (cancelled) {
          return
        }
        setKpis(summary)
        setTrendData(trend)
        setRankingData(ranking)
        setScatterData(scatter)
        setTableData(table)
      } catch (err) {
        if (cancelled) {
          return
        }
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
  }, [status, filters, trendMetric, rankingMetric, rankingOrder, scatterMetrics])

  function updateFilters(partial) {
    setFilters((prev) => ({
      ...prev,
      ...partial,
    }))
  }

  function resetFilters() {
    setFilters({
      ...defaultFilters,
      modalidades: [],
      portes: [],
      anos: [],
      trimestres: [],
      regAns: [],
      sinistralidade: { ...defaultFilters.sinistralidade },
      margem: { ...defaultFilters.margem },
      liquidez: { ...defaultFilters.liquidez },
    })
  }

  return {
    status,
    error,
    filters,
    options,
    kpis,
    trendMetric,
    setTrendMetric,
    trendData,
    rankingMetric,
    setRankingMetric,
    rankingData,
    rankingOrder,
    setRankingOrder,
    scatterMetrics,
    setScatterMetrics,
    scatterData,
    tableData,
    isQuerying,
    updateFilters,
    resetFilters,
    metricsCatalog,
    sourceInfo,
  }
}
