import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select'
import { ScrollArea } from '../ui/scroll-area'
import { cn, formatNumber, formatPercent, toNumber } from '../../lib/utils'
import { metricFormulas } from '../../lib/metricFormulas.js'
import {
  ADMIN_WEIGHT_RULES,
  ASSIST_WEIGHT_RULES,
  COMERCIAL_WEIGHT_RULES,
  RESULT_WEIGHT_RULES,
} from '../../lib/metricFormulasModoUniodonto.js'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { ChevronLeft, ChevronRight, Columns } from 'lucide-react'

const defaultRankingMetrics = [
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

const applyWeightRules = (value, rules) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  for (const rule of rules) {
    if (rule.max === null || rule.max === undefined) return rule.weight
    if (value <= rule.max) return rule.weight
  }
  return null
}

const UNIODONTO_WEIGHT_RULES = {
  indice_despesas_assistenciais_pct: ASSIST_WEIGHT_RULES,
  indice_despesas_administrativas_pct: ADMIN_WEIGHT_RULES,
  indice_despesas_comerciais_pct: COMERCIAL_WEIGHT_RULES,
  icu_operacional: RESULT_WEIGHT_RULES,
}

const PINNED_RANK_WIDTH = 64
const PINNED_OPERATOR_WIDTH = 320
const PINNED_ANS_WIDTH = 96
const PINNED_OPERATOR_LEFT = PINNED_RANK_WIDTH
const PINNED_ANS_LEFT = PINNED_RANK_WIDTH + PINNED_OPERATOR_WIDTH

function RankingChart({
  data,
  operatorRow,
  operatorName,
  comparisonLabel,
  accessScopeDescription = null,
  onOperatorClick = null,
  metric = 'regulatory_score',
  onMetricChange,
  metrics = null,
  metricGroups = null,
  title = 'Ranking de Operadoras',
  subtitle = null,
}) {
  const [sortConfig, setSortConfig] = useState({ column: 'rank', direction: 'asc' })
  const [pageSize, setPageSize] = useState(6)
  const [pageIndex, setPageIndex] = useState(0)
  const scrollViewportRef = useRef(null)
  const [hasScrollLeft, setHasScrollLeft] = useState(false)
  const [hasScrollRight, setHasScrollRight] = useState(false)
  const [visibleMetricIds, setVisibleMetricIds] = useState(() => {
    const seen = new Set()
    const ids = []
    if (metricGroups?.length) {
      metricGroups.forEach((group) => {
        group.items?.forEach((item) => {
          if (item?.id && !seen.has(item.id)) {
            seen.add(item.id)
            ids.push(item.id)
          }
        })
      })
      return ids
    }
    const base = metrics?.length ? metrics : defaultRankingMetrics
    base.forEach((item) => {
      if (item?.id && !seen.has(item.id)) {
        seen.add(item.id)
        ids.push(item.id)
      }
    })
    return ids
  })
  const [columnQuery, setColumnQuery] = useState('')

  const activeMetrics = useMemo(() => {
    if (metricGroups?.length) {
      const seen = new Set()
      const flat = []
      metricGroups.forEach((group) => {
        group.items?.forEach((item) => {
          if (item?.id && !seen.has(item.id)) {
            flat.push(item)
            seen.add(item.id)
          }
        })
      })
      return flat
    }
    return metrics?.length ? metrics : defaultRankingMetrics
  }, [metricGroups, metrics])

  const groupedOptions = useMemo(() => {
    if (!metricGroups?.length) return null
    const ids = new Set(activeMetrics.map((item) => item.id))
    return metricGroups.map((group) => ({
      label: group.label,
      items: (group.items ?? []).filter((item) => ids.has(item.id)),
    }))
  }, [metricGroups, activeMetrics])

  const rankingMetricOptions = useMemo(() => [...activeMetrics], [activeMetrics])
  const selectedMetric = rankingMetricOptions.find((item) => item.id === metric) ?? rankingMetricOptions[0]
  const selectedMetricId = selectedMetric?.id ?? ''

  useEffect(() => {
    setVisibleMetricIds(activeMetrics.map((item) => item.id))
  }, [activeMetrics])

  const visibleMetrics = useMemo(() => {
    if (!visibleMetricIds.length) return activeMetrics
    const visible = new Set(visibleMetricIds)
    return activeMetrics.filter((metric) => visible.has(metric.id))
  }, [activeMetrics, visibleMetricIds])

  const filteredMetricOptions = useMemo(() => {
    const query = columnQuery.trim().toLowerCase()
    if (!query) return activeMetrics
    return activeMetrics.filter((metric) => String(metric.label ?? '').toLowerCase().includes(query))
  }, [activeMetrics, columnQuery])

  const sortedRows = useMemo(() => {
    const rows = [...data]
    const { column, direction } = sortConfig
    const dir = direction === 'desc' ? -1 : 1
    rows.sort((a, b) => {
      const aRank = a.rank_position ?? a.rank ?? 0
      const bRank = b.rank_position ?? b.rank ?? 0
      if (column === 'valor' || activeMetrics.find((m) => m.id === column)) {
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
  }, [data, sortConfig, activeMetrics])

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { column, direction: column === 'valor' ? 'desc' : 'asc' }
    })
  }

  const pageSizeValue = pageSize === null ? 'all' : String(pageSize)
  const pageCount = pageSize ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1
  const pagedRows = useMemo(() => {
    if (!pageSize) return sortedRows
    const start = pageIndex * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex((prev) => {
      const maxIndex = pageCount - 1
      return prev > maxIndex ? Math.max(0, maxIndex) : prev
    })
  }, [pageCount])

  useEffect(() => {
    if (!sortConfig.column || sortConfig.column === 'rank' || sortConfig.column === 'nome_operadora' || sortConfig.column === 'reg_ans') {
      return
    }
    const visibleIds = new Set(visibleMetrics.map((metric) => metric.id))
    if (!visibleIds.has(sortConfig.column)) {
      setSortConfig({ column: 'rank', direction: 'asc' })
    }
  }, [visibleMetrics, sortConfig.column])

  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    const update = () => {
      const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      setHasScrollLeft(viewport.scrollLeft > 2)
      setHasScrollRight(viewport.scrollLeft < maxScrollLeft - 2)
    }

    update()
    const onScroll = () => update()
    viewport.addEventListener('scroll', onScroll, { passive: true })

    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update())
      ro.observe(viewport)
    }

    const raf = requestAnimationFrame(() => update())

    return () => {
      viewport.removeEventListener('scroll', onScroll)
      if (ro) ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [pageIndex, pageSize, visibleMetrics.length, pagedRows.length])

  const scrollByX = (delta) => {
    const viewport = scrollViewportRef.current
    if (!viewport) return
    viewport.scrollBy({ left: delta, behavior: 'smooth' })
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
    visibleMetrics.forEach((metric) => {
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
  }, [data, visibleMetrics])

  const getHeatStyle = (metricId, value) => {
    const stats = metricStats[metricId]
    if (!stats || stats.p10 === null || stats.p90 === null || !Number.isFinite(value)) return {}
    const palette = [
      { bg: 'rgb(220 38 38 / 0.32)', fg: 'rgb(127 29 29)' }, // vermelho forte
      { bg: 'rgb(249 115 22 / 0.30)', fg: 'rgb(124 45 18)' }, // laranja
      { bg: 'rgb(234 179 8 / 0.28)', fg: 'rgb(113 63 18)' }, // amarelo
      { bg: 'rgb(34 197 94 / 0.24)', fg: 'rgb(20 83 45)' }, // verde claro
      { bg: 'rgb(22 163 74 / 0.30)', fg: 'rgb(20 83 45)' }, // verde forte
    ]
    const weightRules = UNIODONTO_WEIGHT_RULES[metricId]
    if (weightRules) {
      const weight = applyWeightRules(value, weightRules)
      if (weight === null) return {}
      if (weight < 0) return { backgroundColor: palette[0].bg, color: palette[0].fg }
      if (weight >= 10) return { backgroundColor: palette[4].bg, color: palette[4].fg }
      const clamped = Math.min(Math.max(weight, 0), 10)
      const t = clamped / 10
      const idx = t <= 0.2 ? 0 : t <= 0.4 ? 1 : t <= 0.6 ? 2 : t <= 0.8 ? 3 : 4
      return { backgroundColor: palette[idx].bg, color: palette[idx].fg }
    }
    const baseMin = stats.p10
    const baseMax = stats.p90
    const span = baseMax - baseMin
    if (span === 0) return {}
    const clamped = Math.min(Math.max(value, baseMin), baseMax)
    const rawT = (clamped - baseMin) / span
    const meta = visibleMetrics.find((item) => item.id === metricId) ?? activeMetrics.find((item) => item.id === metricId)
    const t = meta?.trend === 'lower' ? 1 - rawT : rawT
    const idx = t <= 0.1 ? 0 : t <= 0.3 ? 1 : t <= 0.7 ? 2 : t <= 0.9 ? 3 : 4
    return {
      backgroundColor: palette[idx].bg,
      color: palette[idx].fg,
    }
  }

  const headerSortIcon = (column) => {
    if (sortConfig.column !== column) return null
    return <span className="text-[11px] uppercase text-muted-foreground">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
  }

  const infoText = `Clique nos cabeçalhos para ordenar. Comparação feita com ${comparisonLabel?.toLowerCase?.() ?? 'a média definida'}.`
  const operatorInView = pagedRows.some((row) => row.nome_operadora === operatorName)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{subtitle ?? infoText}</p>
            {accessScopeDescription ? <p className="text-xs text-muted-foreground">{accessScopeDescription}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ordenar por</p>
            <Select value={selectedMetricId} onValueChange={(value) => onMetricChange?.(value)}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Métrica do ranking" />
              </SelectTrigger>
              <SelectContent>
                {groupedOptions
                  ? groupedOptions.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.items.map((option) => (
                          <SelectItem
                            key={option.id}
                            value={option.id}
                            style={option.indent ? { paddingLeft: `${8 + option.indent * 12}px` } : undefined}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  : rankingMetricOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Columns className="h-4 w-4" />
                  Colunas
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 space-y-3 p-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Colunas visíveis
                  </p>
                  <Input
                    placeholder="Buscar coluna..."
                    value={columnQuery}
                    onChange={(event) => setColumnQuery(event.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleMetricIds(activeMetrics.map((item) => item.id))}
                  >
                    Selecionar tudo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleMetricIds([selectedMetricId].filter(Boolean))}
                    disabled={!selectedMetricId}
                  >
                    Só "{selectedMetric?.label ?? 'métrica'}"
                  </Button>
                </div>

                <ScrollArea className="h-72 pr-2" type="always">
                  <div className="space-y-2">
                    {filteredMetricOptions.map((metricOption) => {
                      const checked = visibleMetricIds.includes(metricOption.id)
                      const disableUncheck = checked && visibleMetricIds.length <= 1
                      return (
                        <label key={metricOption.id} className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-muted">
                          <Checkbox
                            checked={checked}
                            disabled={disableUncheck}
                            onCheckedChange={(next) => {
                              const isChecked = Boolean(next)
                              setVisibleMetricIds((prev) => {
                                if (isChecked) return prev.includes(metricOption.id) ? prev : [...prev, metricOption.id]
                                const nextIds = prev.filter((id) => id !== metricOption.id)
                                return nextIds.length ? nextIds : prev
                              })
                            }}
                          />
                          <span className="flex-1 text-sm leading-5">{metricOption.label}</span>
                        </label>
                      )
                    })}
                    {!filteredMetricOptions.length ? (
                      <p className="px-2 py-2 text-sm text-muted-foreground">Nenhuma coluna encontrada.</p>
                    ) : null}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-3">
        <div className="relative flex-1 rounded-md border">
          <ScrollArea className="h-full" scrollbars="both" type="always" viewportRef={scrollViewportRef}>
            <div className="pb-3 pr-3">
              <table className="min-w-[1200px] text-sm">
              <thead className="sticky top-0 z-20 bg-card/95 text-xs uppercase text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <tr>
                  <th
                    className="sm:sticky sm:left-0 z-40 px-3 py-2 text-left bg-card border-r border-border/70"
                    style={{ left: 0, width: PINNED_RANK_WIDTH, minWidth: PINNED_RANK_WIDTH }}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1 font-semibold"
                      onClick={() => handleSort('rank')}
                    >
                      #
                      {headerSortIcon('rank')}
                    </button>
                  </th>
                  <th
                    className="sm:sticky z-40 px-3 py-2 text-left bg-card"
                    style={{
                      left: PINNED_OPERATOR_LEFT,
                      width: PINNED_OPERATOR_WIDTH,
                      minWidth: PINNED_OPERATOR_WIDTH,
                    }}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1 font-semibold"
                      onClick={() => handleSort('nome_operadora')}
                    >
                      Operadora
                      {headerSortIcon('nome_operadora')}
                    </button>
                  </th>
                  <th
                    className="sm:sticky z-40 px-3 py-2 text-left bg-card border-r border-border/70"
                    style={{ left: PINNED_ANS_LEFT, width: PINNED_ANS_WIDTH, minWidth: PINNED_ANS_WIDTH }}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1 font-semibold"
                      onClick={() => handleSort('reg_ans')}
                    >
                      Nº ANS
                      {headerSortIcon('reg_ans')}
                    </button>
                  </th>
                  {visibleMetrics.map((metric) => (
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
                {pagedRows.map((row, index) => {
                  const rowIndex = pageSize ? pageIndex * pageSize + index : index
                  const rank = row.rank_position ?? row.rank ?? rowIndex + 1
                  const isOperator = row.nome_operadora === operatorName
                  return (
                    <tr
                      key={`${row.nome_operadora}-${rank}`}
                      className={cn(
                        'group border-t transition-colors hover:bg-muted/60 cursor-pointer',
                        isOperator && 'bg-primary/5',
                      )}
                      onClick={() => onOperatorClick?.(row)}
                    >
                      <td
                        className={cn(
                          'sm:sticky sm:left-0 z-20 px-3 py-2 text-left text-xs text-muted-foreground bg-card group-hover:bg-muted border-r border-border/70',
                          isOperator && 'bg-secondary',
                        )}
                        style={{ left: 0, width: PINNED_RANK_WIDTH, minWidth: PINNED_RANK_WIDTH }}
                      >
                        {rank ? `${rank}º` : '—'}
                      </td>
                      <td
                        className={cn(
                          'sm:sticky z-20 px-3 py-2 text-left font-medium bg-card group-hover:bg-muted',
                          isOperator && 'bg-secondary',
                        )}
                        style={{
                          left: PINNED_OPERATOR_LEFT,
                          width: PINNED_OPERATOR_WIDTH,
                          minWidth: PINNED_OPERATOR_WIDTH,
                        }}
                      >
                        {row.nome_operadora}
                      </td>
                      <td
                        className={cn(
                          'sm:sticky z-20 px-3 py-2 text-left text-xs text-muted-foreground bg-card group-hover:bg-muted border-r border-border/70',
                          isOperator && 'bg-secondary',
                        )}
                        style={{ left: PINNED_ANS_LEFT, width: PINNED_ANS_WIDTH, minWidth: PINNED_ANS_WIDTH }}
                      >
                        {row.reg_ans ?? '—'}
                      </td>
                      {visibleMetrics.map((metric) => {
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
                    <td colSpan={visibleMetrics.length + 3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Nenhum dado disponível para os filtros selecionados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          </ScrollArea>

          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 sm:left-[480px] w-10 bg-gradient-to-r from-card to-transparent transition-opacity',
              hasScrollLeft ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent transition-opacity',
              hasScrollRight ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>

        {data.length ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Linhas por página</p>
              <Select
                value={pageSizeValue}
                onValueChange={(value) => {
                  const next = value === 'all' ? null : Number.parseInt(value, 10)
                  setPageSize(Number.isFinite(next) ? next : null)
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="all">Tudo</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{sortedRows.length} linhas</span>
              <div className="hidden items-center gap-1 sm:flex">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => scrollByX(-360)}
                  aria-label="Rolar colunas para a esquerda"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => scrollByX(360)}
                  aria-label="Rolar colunas para a direita"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {pageSize ? (
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={pageIndex <= 0}
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página <span className="font-semibold text-foreground">{pageIndex + 1}</span> de{' '}
                  <span className="font-semibold text-foreground">{pageCount}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
                  disabled={pageIndex + 1 >= pageCount}
                >
                  Próxima
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {operatorRow && !operatorInView ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{operatorRow.nome_operadora}</p>
            {(() => {
              const activeMetric =
                visibleMetrics.find((metric) => metric.id === sortConfig.column) ?? visibleMetrics[0] ?? null
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
