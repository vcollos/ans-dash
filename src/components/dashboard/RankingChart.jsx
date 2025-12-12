import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn, formatNumber, formatPercent, toNumber } from '../../lib/utils'
import { metricFormulas } from '../../lib/metricFormulas'

const rankingMetrics = [
  { id: 'regulatory_score', label: 'Score regulatório (RN 518)', format: 'score', trend: 'higher' },
  ...metricFormulas
    .filter((metric) => metric.showInCards)
    .map((metric) => ({
      id: metric.id,
      label: metric.label,
      format: metric.format === 'percent' ? 'percent' : metric.format === 'decimal' ? 'number' : metric.format,
      trend: metric.trend ?? 'higher',
    })),
]

const rankingMetricOptions = [...rankingMetrics]

function formatValue(value, format) {
  if (value === null || value === undefined) return '—'
  const numeric = toNumber(value, null)
  if (numeric === null) return '—'
  if (format === 'score') {
    return formatNumber(numeric, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (format === 'percent') {
    return formatPercent(numeric, 2)
  }
  if (format === 'currency') {
    return formatNumber(numeric, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  if (format === 'days') {
    return formatNumber(numeric, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }
  return formatNumber(numeric)
}

function RankingChart({
  data,
  operatorRow,
  operatorName,
  comparisonLabel,
  onOperatorClick = null,
  metric = 'regulatory_score',
  onMetricChange,
}) {
  const [sortConfig, setSortConfig] = useState({ column: 'rank', direction: 'asc' })
  const selectedMetric = rankingMetricOptions.find((item) => item.id === metric) ?? rankingMetricOptions[0]

  const sortedRows = useMemo(() => {
    const rows = [...data]
    const { column, direction } = sortConfig
    const dir = direction === 'desc' ? -1 : 1
    rows.sort((a, b) => {
      const aRank = a.rank_position ?? a.rank ?? 0
      const bRank = b.rank_position ?? b.rank ?? 0
      if (column === 'valor' || rankingMetrics.find((m) => m.id === column)) {
        const aVal = toNumber(a[column] ?? a.valor, Number.NEGATIVE_INFINITY)
        const bVal = toNumber(b[column] ?? b.valor, Number.NEGATIVE_INFINITY)
        return (aVal > bVal ? 1 : -1) * dir
      }
      if (column === 'nome_operadora') {
        return String(a.nome_operadora ?? '').localeCompare(String(b.nome_operadora ?? '')) * dir
      }
      if (column === 'reg_ans') {
        return String(a.reg_ans ?? '').localeCompare(String(b.reg_ans ?? '')) * dir
      }
      return (aRank > bRank ? 1 : -1) * dir
    })
    return rows
  }, [data, sortConfig])

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { column, direction: column === 'valor' ? 'desc' : 'asc' }
    })
  }

  const metricStats = useMemo(() => {
    const percentile = (sorted, p) => {
      if (!sorted.length) return null
      const idx = (sorted.length - 1) * p
      const lo = Math.floor(idx)
      const hi = Math.ceil(idx)
      if (lo === hi) return sorted[lo]
      const weight = idx - lo
      return sorted[lo] * (1 - weight) + sorted[hi] * weight
    }
    const stats = {}
    rankingMetrics.forEach((metric) => {
      const values = data
        .map((row) => toNumber(row[metric.id], null))
        .filter((value) => value !== null && Number.isFinite(value))
      if (!values.length) {
        stats[metric.id] = { min: null, max: null, p10: null, p90: null }
        return
      }
      const sorted = [...values].sort((a, b) => a - b)
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      const p10 = percentile(sorted, 0.1)
      const p90 = percentile(sorted, 0.9)
      stats[metric.id] = { min, max, p10, p90 }
    })
    return stats
  }, [data])

  const getHeatStyle = (metricId, value) => {
    const stats = metricStats[metricId]
    if (!stats || stats.p10 === null || stats.p90 === null || !Number.isFinite(value)) return {}
    const baseMin = stats.p10
    const baseMax = stats.p90
    const span = baseMax - baseMin
    if (span === 0) return {}
    const clamped = Math.min(Math.max(value, baseMin), baseMax)
    const rawT = (clamped - baseMin) / span
    const meta = rankingMetrics.find((item) => item.id === metricId)
    const t = meta?.trend === 'lower' ? 1 - rawT : rawT
    const hue = 120 * t // red to green
    return {
      backgroundColor: `hsl(${hue}deg 70% 92%)`,
      color: `hsl(${hue}deg 35% 28%)`,
    }
  }

  const headerSortIcon = (column) => {
    if (sortConfig.column !== column) return null
    return <span className="text-[11px] uppercase text-muted-foreground">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
  }

  const infoText = `Clique nos cabeçalhos para ordenar. Comparação feita com ${comparisonLabel?.toLowerCase?.() ?? 'a média definida'}.`
  const operatorInTop = data.some((row) => row.nome_operadora === operatorName)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg">Ranking de Operadoras</CardTitle>
            <p className="text-sm text-muted-foreground">
              11 indicadores lado a lado. {infoText}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ordenar por</p>
            <Select value={selectedMetric?.id} onValueChange={(value) => onMetricChange?.(value)}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Métrica do ranking" />
              </SelectTrigger>
              <SelectContent>
                {rankingMetricOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-3">
        <div className="relative flex-1 overflow-auto rounded-md border">
          <table className="min-w-[1200px] text-sm">
            <thead className="sticky top-0 z-20 bg-card/95 text-xs uppercase text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <tr>
                <th className="px-3 py-2 text-left">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold"
                    onClick={() => handleSort('rank')}
                  >
                    #
                    {headerSortIcon('rank')}
                  </button>
                </th>
                <th className="px-3 py-2 text-left">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold"
                    onClick={() => handleSort('nome_operadora')}
                  >
                    Operadora
                    {headerSortIcon('nome_operadora')}
                  </button>
                </th>
                <th className="px-3 py-2 text-left">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold"
                    onClick={() => handleSort('reg_ans')}
                  >
                    Nº ANS
                    {headerSortIcon('reg_ans')}
                  </button>
                </th>
                {rankingMetrics.map((metric) => (
                  <th key={metric.id} className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="flex w-full items-center justify-end gap-1 font-semibold"
                      onClick={() => handleSort(metric.id)}
                    >
                      {metric.label}
                      {headerSortIcon(metric.id)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => {
                const rank = row.rank_position ?? index + 1
                const isOperator = row.nome_operadora === operatorName
                return (
                  <tr
                    key={`${row.nome_operadora}-${rank}`}
                    className={cn(
                      'border-t transition-colors hover:bg-muted/60 cursor-pointer',
                      isOperator && 'bg-primary/5',
                    )}
                    onClick={() => onOperatorClick?.(row)}
                  >
                    <td className="px-3 py-2 text-left text-xs text-muted-foreground">{rank ? `${rank}º` : '—'}</td>
                    <td className="px-3 py-2 text-left font-medium">{row.nome_operadora}</td>
                    <td className="px-3 py-2 text-left text-xs text-muted-foreground">{row.reg_ans ?? '—'}</td>
                    {rankingMetrics.map((metric) => {
                      const value = toNumber(row[metric.id], null)
                      const display = formatValue(value, metric.format)
                      return (
                        <td
                          key={metric.id}
                          className="px-3 py-2 text-right font-semibold whitespace-nowrap"
                          style={getHeatStyle(metric.id, value)}
                        >
                          {display}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {!data.length ? (
                <tr>
                  <td colSpan={rankingMetrics.length + 3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhum dado disponível para os filtros selecionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {operatorRow && !operatorInTop ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{operatorRow.nome_operadora}</p>
            {(() => {
              const activeMetric =
                rankingMetrics.find((metric) => metric.id === sortConfig.column) ?? rankingMetrics[0] ?? null
              const value = activeMetric ? operatorRow[activeMetric.id] ?? operatorRow.valor : operatorRow.valor
              const formatted = activeMetric ? formatValue(value, activeMetric.format) : formatValue(value, 'number')
              return (
                <p>
                  Posição:{' '}
                  <span className="font-semibold text-emerald-600">
                    {operatorRow.rank_position ? `${operatorRow.rank_position}º` : '—'}
                  </span>
                  {' • '}
                  {activeMetric ? `${activeMetric.label}: ` : 'Valor: '}
                  <span className="font-semibold text-foreground">{formatted}</span>
                  {operatorRow.reg_ans ? (
                    <>
                      {' • '}
                      Nº ANS:{' '}
                      <span className="font-semibold text-foreground">{operatorRow.reg_ans}</span>
                    </>
                  ) : null}
                </p>
              )
            })()}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default RankingChart
