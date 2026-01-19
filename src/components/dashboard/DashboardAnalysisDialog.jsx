import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { fetchWithAuth } from '../../lib/auth'
import { toNumber } from '../../lib/utils'
import { metricFormulas } from '../../lib/metricFormulas'
import { UNIODONTO_INDICATORS, UNIODONTO_INDICATOR_GROUPS } from '../../lib/uniodontoMetrics'
import { monetaryIndicatorTree, monetaryIndicators } from '../../lib/monetaryIndicators'

const REGULATORY_METRICS = metricFormulas
  .filter((metric) => metric.showInCards)
  .map(({ id, label, format, trend }) => ({ id, label, format, trend }))

const INDICATOR_MAP = Object.fromEntries(
  monetaryIndicators.map((indicator) => [indicator.column, indicator]),
)

function summarizeList(values = [], limit = 5) {
  const list = Array.isArray(values) ? values.filter(Boolean) : []
  return {
    count: list.length,
    sample: list.slice(0, limit),
  }
}

function buildFilterSummary(filters = {}, comparisonFilters = {}, operatorName) {
  return {
    operator: operatorName ?? null,
    modalidades: summarizeList(filters.modalidades),
    portes: summarizeList(filters.portes),
    anos: summarizeList(filters.anos),
    trimestres: summarizeList(filters.trimestres),
    ativa: filters.ativa ?? null,
    uniodonto: filters.uniodonto ?? null,
    regAns: summarizeList(filters.regAns),
    search: filters.search ? String(filters.search).trim() : null,
    comparison: {
      modalidades: summarizeList(comparisonFilters.modalidades),
      portes: summarizeList(comparisonFilters.portes),
      ativa: comparisonFilters.ativa ?? null,
      uniodonto: comparisonFilters.uniodonto ?? null,
    },
  }
}

function buildMetricStats(rows = [], metrics = []) {
  return metrics.map((metric) => {
    const values = rows
      .map((row) => toNumber(row?.[metric.id], null))
      .filter((value) => value !== null && Number.isFinite(value))
    if (!values.length) {
      return { ...metric, sample: 0 }
    }
    const total = values.reduce((sum, value) => sum + value, 0)
    const min = Math.min(...values)
    const max = Math.max(...values)
    return {
      ...metric,
      sample: values.length,
      avg: total / values.length,
      min,
      max,
    }
  })
}

function buildIndicatorGroups(uniodontoMode, metricStats) {
  if (!uniodontoMode) {
    return [
      {
        id: 'indicadores',
        label: 'Indicadores regulatorios',
        description: 'Resumo dos indicadores exibidos nos cards principais.',
        metrics: metricStats,
      },
    ]
  }
  const metricMap = Object.fromEntries(metricStats.map((metric) => [metric.id, metric]))
  return (UNIODONTO_INDICATOR_GROUPS ?? []).map((group) => ({
    id: group.id,
    label: group.label,
    description: group.description,
    metrics: (group.items ?? []).map((id) => metricMap[id]).filter(Boolean),
  }))
}

function buildTrendStats(trendSeriesByMetric = {}, metrics = []) {
  return metrics.map((metric) => {
    const series = trendSeriesByMetric?.[metric.id] ?? []
    const points = series
      .map((row) => {
        if (!row) return null
        return {
          period: row?.periodo ?? (row?.ano && row?.trimestre ? `${row.ano}T${row.trimestre}` : null),
          primary: toNumber(row?.operador_valor ?? row?.valor, null),
          comparison: toNumber(row?.pares_valor, null),
        }
      })
      .filter(Boolean)
      .filter((point) => point.primary !== null || point.comparison !== null)
    const last = points.length ? points[points.length - 1] : null
    const prev = points.length > 1 ? points[points.length - 2] : null
    const lastPrimary = last?.primary
    const prevPrimary = prev?.primary
    const lastComparison = last?.comparison
    const prevComparison = prev?.comparison
    const deltaPrimary =
      lastPrimary !== null && lastPrimary !== undefined && prevPrimary !== null && prevPrimary !== undefined
        ? lastPrimary - prevPrimary
        : null
    const deltaComparison =
      lastComparison !== null && lastComparison !== undefined && prevComparison !== null && prevComparison !== undefined
        ? lastComparison - prevComparison
        : null
    return {
      id: metric.id,
      label: metric.label,
      format: metric.format,
      sample: points.length,
      lastPeriod: last?.period ?? null,
      lastPrimary: last?.primary ?? null,
      lastComparison: last?.comparison ?? null,
      deltaPrimary,
      deltaComparison,
    }
  })
}

function buildRankingHighlights(rows = [], metricId, metricLabel) {
  const topRows = rows.slice(0, 5).map((row) => ({
    operadora: row?.nome_operadora ?? null,
    regAns: row?.reg_ans ?? null,
    rank: row?.rank ?? row?.rank_position ?? null,
    valor: toNumber(row?.[metricId] ?? row?.valor, null),
  }))
  const bottomRows = rows.slice(-5).map((row) => ({
    operadora: row?.nome_operadora ?? null,
    regAns: row?.reg_ans ?? null,
    rank: row?.rank ?? row?.rank_position ?? null,
    valor: toNumber(row?.[metricId] ?? row?.valor, null),
  }))
  return {
    metricId,
    metricLabel,
    top: topRows,
    bottom: bottomRows,
  }
}

function computePearson(points) {
  if (!points?.length || points.length < 2) return null
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length
  let sumXY = 0
  let sumX2 = 0
  let sumY2 = 0
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    sumXY += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }
  const denom = Math.sqrt(sumX2 * sumY2)
  if (!Number.isFinite(denom) || denom === 0) return null
  return sumXY / denom
}

function computePercentile(values, percentile) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = (percentile / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) return sorted[lower]
  const weight = rank - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function filterCorrelationOutliers(rows, { includeGrowth = false } = {}) {
  const resultValues = rows
    .map((row) => toNumber(row?.icu_operacional, null))
    .filter((value) => value !== null && Number.isFinite(value))
  const comercialValues = rows
    .map((row) => toNumber(row?.indice_despesas_comerciais_pct, null))
    .filter((value) => value !== null && Number.isFinite(value))
  const growthValues = rows
    .map((row) => toNumber(row?.beneficiarios_crescimento_pct, null))
    .filter((value) => value !== null && Number.isFinite(value))
  if (!resultValues.length || !comercialValues.length) {
    return rows
  }
  const resultP5 = computePercentile(resultValues, 5)
  const resultP95 = computePercentile(resultValues, 95)
  const comercialP95 = computePercentile(comercialValues, 95)
  const growthP5 = growthValues.length ? computePercentile(growthValues, 5) : null
  const growthP95 = growthValues.length ? computePercentile(growthValues, 95) : null
  return rows.filter((row) => {
    const resultValue = toNumber(row?.icu_operacional, null)
    const comercialValue = toNumber(row?.indice_despesas_comerciais_pct, null)
    if (resultValue === null || comercialValue === null) return false
    if (resultValue < -100 || resultValue > 100) return false
    if (resultP5 !== null && resultValue < resultP5) return false
    if (resultP95 !== null && resultValue > resultP95) return false
    if (comercialP95 !== null && comercialValue > comercialP95) return false
    if (includeGrowth) {
      const growthValue = toNumber(row?.beneficiarios_crescimento_pct, null)
      if (growthValue === null) return false
      if (growthP5 !== null && growthValue < growthP5) return false
      if (growthP95 !== null && growthValue > growthP95) return false
    }
    return true
  })
}

function buildCorrelationSummary(rows = [], yKey, label) {
  const filteredRows = filterCorrelationOutliers(rows, {
    includeGrowth: yKey === 'beneficiarios_crescimento_pct',
  })
  const points = filteredRows
    .map((row) => {
      const x = toNumber(row?.indice_despesas_comerciais_pct, null)
      const y = toNumber(row?.[yKey], null)
      if (x === null || y === null) return null
      return { x, y }
    })
    .filter(Boolean)
  if (!points.length) {
    return { label, n: 0, r: null }
  }
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    label,
    n: points.length,
    r: computePearson(points),
    xAvg: xs.reduce((sum, value) => sum + value, 0) / xs.length,
    yAvg: ys.reduce((sum, value) => sum + value, 0) / ys.length,
    xMin: Math.min(...xs),
    xMax: Math.max(...xs),
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
  }
}

function buildMonetarySummary(summary) {
  if (!summary) return null
  const topLevel = (monetaryIndicatorTree ?? []).map((node) => {
    const indicator = INDICATOR_MAP[node.column]
    return {
      id: node.id ?? node.column,
      label: node.label ?? indicator?.label ?? node.column,
      value: summary.values?.[node.column] ?? null,
      delta: summary.deltas?.[node.column] ?? null,
    }
  })
  return {
    period: summary?.period ?? null,
    previousPeriod: summary?.previousPeriod ?? null,
    indicators: topLevel,
  }
}

function DashboardAnalysisDialog({
  open,
  onOpenChange,
  uniodontoMode = false,
  filters,
  comparisonFilters,
  operatorName,
  kpis,
  monetarySummary,
  rankingData,
  rankingMetric,
  uniodontoRankingMetric,
  trendSeriesByMetric,
  isLoading = false,
}) {
  const [analysis, setAnalysis] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const metrics = uniodontoMode ? UNIODONTO_INDICATORS : REGULATORY_METRICS
  const metricStats = useMemo(
    () => buildMetricStats(rankingData?.rows ?? [], metrics),
    [metrics, rankingData?.rows],
  )
  const indicatorGroups = useMemo(
    () => buildIndicatorGroups(uniodontoMode, metricStats),
    [metricStats, uniodontoMode],
  )
  const trendStats = useMemo(
    () => buildTrendStats(trendSeriesByMetric, metrics),
    [metrics, trendSeriesByMetric],
  )
  const rankingMetricId = uniodontoMode ? uniodontoRankingMetric : rankingMetric
  const metricLabelMap = useMemo(
    () =>
      Object.fromEntries(
        metrics.map((metric) => [metric.id, metric.label]),
      ),
    [metrics],
  )
  const rankingHighlights = useMemo(
    () =>
      buildRankingHighlights(
        rankingData?.rows ?? [],
        rankingMetricId,
        metricLabelMap[rankingMetricId] ?? rankingMetricId,
      ),
    [metricLabelMap, rankingData?.rows, rankingMetricId],
  )
  const correlationSummary = useMemo(() => {
    if (!uniodontoMode) return null
    const rows = rankingData?.rows ?? []
    return {
      crescimento: buildCorrelationSummary(rows, 'beneficiarios_crescimento_pct', 'Despesa comercial x crescimento'),
      resultado: buildCorrelationSummary(rows, 'icu_operacional', 'Despesa comercial x resultado'),
    }
  }, [rankingData?.rows, uniodontoMode])

  const monetarySnapshot = useMemo(() => buildMonetarySummary(monetarySummary), [monetarySummary])

  const analysisPayload = useMemo(
    () => ({
      mode: uniodontoMode ? 'Uniodonto' : 'RN518',
      filters: buildFilterSummary(filters, comparisonFilters, operatorName),
      period: kpis?.periodo ? { label: kpis.periodo, ano: kpis.ano, trimestre: kpis.trimestre } : null,
      counts: {
        operadoras: kpis?.operadoras ?? null,
        beneficiarios: kpis?.qt_beneficiarios ?? null,
        prestadores: kpis?.qt_prestadores ?? null,
      },
      indicatorGroups,
      ranking: rankingHighlights,
      trendStats,
      monetary: monetarySnapshot,
      correlation: correlationSummary,
    }),
    [
      comparisonFilters,
      correlationSummary,
      filters,
      indicatorGroups,
      kpis,
      monetarySnapshot,
      operatorName,
      rankingHighlights,
      trendStats,
      uniodontoMode,
    ],
  )

  useEffect(() => {
    setAnalysis(null)
    setAnalysisError(null)
  }, [analysisPayload])

  const handleGenerateAnalysis = useCallback(async () => {
    if (analysisLoading) return
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const response = await fetchWithAuth('/api/analysis/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summary: analysisPayload }),
      })
      if (!response.ok) {
        const message =
          (await response.json().catch(() => ({}))).error ?? 'Falha ao gerar comentarios.'
        throw new Error(message)
      }
      const payload = await response.json()
      setAnalysis(payload?.text ?? null)
    } catch (err) {
      setAnalysisError(err?.message ?? 'Falha ao gerar comentarios.')
    } finally {
      setAnalysisLoading(false)
    }
  }, [analysisLoading, analysisPayload])

  const hasData = metricStats.some((metric) => metric.sample > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Comentarios inteligentes</DialogTitle>
          <DialogDescription>
            Analise automatica com base nos filtros atuais e nos graficos exibidos no painel.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {analysisPayload?.period?.label
              ? `Base ${analysisPayload.period.label} - ${analysisPayload.mode}`
              : `Modo ${analysisPayload.mode}`}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleGenerateAnalysis}
            disabled={!hasData || isLoading || analysisLoading}
          >
            {analysis ? 'Atualizar comentarios' : 'Gerar comentarios'}
          </Button>
        </div>
        <ScrollArea className="mt-3 max-h-[70vh] rounded-lg border border-border/60 p-3">
          {analysisLoading ? (
            <div className="text-sm text-muted-foreground">Gerando comentarios...</div>
          ) : null}
          {analysisError ? (
            <div className="text-sm text-destructive">{analysisError}</div>
          ) : null}
          {analysis ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{analysis}</div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Nenhum comentario gerado ainda. Clique em &quot;Gerar comentarios&quot; para iniciar.
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DashboardAnalysisDialog
