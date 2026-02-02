import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Info } from 'lucide-react'
import { cn, formatNumber, formatPercent } from '../../lib/utils'
import {
  UNIODONTO_INDICATORS,
  UNIODONTO_INDICATOR_GROUPS,
  UNIODONTO_NOTE_META,
  computeUniodontoMetrics,
} from '../../lib/uniodontoMetrics'

function formatValue(value, format) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  if (format === 'percent') {
    return formatPercent(value, 2)
  }
  if (format === 'currency') {
    return formatNumber(value, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  if (format === 'decimal') {
    return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (format === 'days') {
    return formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }
  if (format === 'score') {
    return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildPeriodValue(period) {
  if (!period) return ''
  return `${period.ano}-${period.trimestre}`
}

function getComparisonTrendClass(operatorValue, peerValue, direction = 'higher') {
  if (
    operatorValue === null ||
    operatorValue === undefined ||
    peerValue === null ||
    peerValue === undefined ||
    Number.isNaN(operatorValue) ||
    Number.isNaN(peerValue)
  ) {
    return ''
  }
  const delta = operatorValue - peerValue
  if (Math.abs(delta) < 1e-6) {
    return ''
  }
  const isBetter = direction === 'lower' ? delta < 0 : delta > 0
  return isBetter ? 'text-emerald-600' : 'text-red-600'
}

const classificationColors = {
  ÓTIMA: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  BOA: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  REGULAR: 'bg-amber-50 text-amber-800 ring-amber-100',
  RUIM: 'bg-red-50 text-red-800 ring-red-100',
  'SEM DADO': 'bg-muted text-muted-foreground',
}

function getGaugeStepColor(index, total, { active }) {
  if (total <= 1) {
    return active ? 'hsl(142, 70%, 45%)' : 'hsl(142, 30%, 75%)'
  }
  const ratio = index / (total - 1)
  const hue = 2 + Math.round(136 * ratio)
  const saturation = active ? 75 : 35
  const lightness = active ? 45 : 78
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

function ScoreGauge({ value, min = 0, max = 10, steps = 8, className, classification }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const filled = Math.round(ratio * steps)
  let baseColor = null
  if (classification) {
    if (classification.toUpperCase().includes('RUIM')) baseColor = '#dc2626'
    else if (classification.toUpperCase().includes('REGULAR')) baseColor = '#f97316'
    else if (classification.toUpperCase().includes('BOA')) baseColor = '#16a34a'
    else if (classification.toUpperCase().includes('ÓTIMA')) baseColor = '#15803d'
  }
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-[10px] text-muted-foreground">RUIM</span>
      <div className="flex gap-0.5">
        {Array.from({ length: steps }).map((_, index) => (
          <span
            key={index}
            className={cn('h-2 w-3 rounded-sm transition', index < filled ? 'shadow-sm' : '')}
            style={{
              backgroundColor: baseColor
                ? baseColor
                : getGaugeStepColor(index, steps, { active: index < filled }),
              opacity: index < filled ? 1 : 0.35,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">ÓTIMA</span>
    </div>
  )
}

function ScoreBadge({ label, className }) {
  if (!label) {
    return (
      <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground', className)}>
        Sem dado
      </span>
    )
  }
  const style = classificationColors[label] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', style, className)}>
      {label}
    </span>
  )
}

function classifyNote(value, meta) {
  if (!meta || value === null || value === undefined || Number.isNaN(value)) {
    return { label: null }
  }
  const min = Number.isFinite(meta.min) ? meta.min : 0
  const max = Number.isFinite(meta.max) ? meta.max : 10
  if (min === max) {
    return { label: 'SEM DADO' }
  }
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  if (ratio < 0.25) return { label: 'RUIM' }
  if (ratio < 0.5) return { label: 'REGULAR' }
  if (ratio < 0.75) return { label: 'BOA' }
  return { label: 'ÓTIMA' }
}

function UniodontoKpiCards({
  snapshot,
  fallbackSummary,
  peerSummary,
  onPeriodChange,
  period,
  peerLabel,
  fallbackPeriods = [],
}) {
  const operatorName = snapshot?.operatorName
  const selectedPeriod = snapshot?.selectedPeriod ?? period
  const periodOptions = operatorName ? snapshot?.availablePeriods ?? [] : fallbackPeriods ?? []
  const periodValue = buildPeriodValue(selectedPeriod)
  const peerCount = peerSummary?.peer_count ?? snapshot?.peerCount ?? snapshot?.peers?.peer_count ?? 0

  const operatorMetrics = operatorName ? computeUniodontoMetrics(snapshot?.operator ?? {}) : null
  const peerMetrics = operatorName && peerSummary ? peerSummary.metrics ?? computeUniodontoMetrics(peerSummary) : null
  const aggregateMetrics = !operatorName ? computeUniodontoMetrics(fallbackSummary ?? {}) : null
  const indicatorMap = Object.fromEntries(UNIODONTO_INDICATORS.map((metric) => [metric.id, metric]))
  const indicatorGroups = UNIODONTO_INDICATOR_GROUPS?.length
    ? UNIODONTO_INDICATOR_GROUPS
    : [
        {
          id: 'all',
          label: 'Indicadores',
          items: UNIODONTO_INDICATORS.map((metric) => metric.id),
        },
      ]

  const handlePeriodChange = (value) => {
    if (!value) return
    const [anoStr, trimStr] = value.split('-')
    const ano = Number(anoStr)
    const trimestre = Number(trimStr)
    const match = periodOptions.find((item) => item.ano === ano && item.trimestre === trimestre)
    const nextPeriod = match ?? { ano, trimestre, periodo: `${ano}T${trimestre}` }
    onPeriodChange?.(nextPeriod)
  }

  const periodSelect = periodOptions.length ? (
    <Select value={periodValue} onValueChange={handlePeriodChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Período" />
      </SelectTrigger>
      <SelectContent>
        {periodOptions.map((item) => (
          <SelectItem key={`${item.ano}-${item.trimestre}`} value={`${item.ano}-${item.trimestre}`}>
            {item.periodo ?? `${item.ano}T${item.trimestre}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null

  const renderIndicatorHeader = (metric) => {
    const tooltipText = metric.description || 'Fórmula não disponível.'
    return (
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full p-1 text-muted-foreground transition hover:bg-muted/80"
              aria-label={`Ver fórmula de ${metric.label}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs leading-snug">
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  const renderMetricCard = (metric) => {
    const operatorValue = operatorMetrics?.[metric.id] ?? null
    const peerValue = peerMetrics?.[metric.id] ?? null
    const aggregateValue = aggregateMetrics?.[metric.id] ?? null
    const displayValue = operatorName ? operatorValue : aggregateValue
    const noteMeta = UNIODONTO_NOTE_META?.[metric.id]
    const noteValue = operatorName
      ? operatorMetrics?.[noteMeta?.key]
      : aggregateMetrics?.[noteMeta?.key]
    const resolvedNoteValue = noteValue ?? null
    const noteClassification = classifyNote(resolvedNoteValue, noteMeta)
    return (
      <div key={metric.id} className="min-w-0 space-y-2 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
        {renderIndicatorHeader(metric)}
        <p
          className={cn(
            'text-2xl font-semibold leading-tight',
            operatorName ? getComparisonTrendClass(operatorValue, peerValue, metric.trend ?? 'higher') : '',
          )}
        >
          {formatValue(displayValue, metric.format)}
        </p>
        {operatorName ? (
          <p className="text-xs text-muted-foreground">
            Média filtrada: {formatValue(peerValue, metric.format)}
          </p>
        ) : null}
        {noteMeta ? (
          <div className="flex items-center gap-2">
            <ScoreGauge
              value={resolvedNoteValue}
              min={noteMeta.min}
              max={noteMeta.max}
              steps={8}
              classification={noteClassification.label}
              className="flex-1"
            />
            <ScoreBadge label={noteClassification.label} className="whitespace-nowrap" />
          </div>
        ) : null}
      </div>
    )
  }

  const renderIndicators = () => {
    const growthGroup = indicatorGroups.find((group) => group.id === 'crescimento')
    const growthMetrics = (growthGroup?.items ?? []).map((id) => indicatorMap[id]).filter(Boolean)

    return (
      <div className="space-y-6">
        {indicatorGroups.map((group) => {
          if (group.id === 'crescimento') return null
          const metrics = (group.items ?? [])
            .map((id) => indicatorMap[id])
            .filter(Boolean)
          if (!metrics.length) return null

          if (group.id === 'liquidez' && growthMetrics.length) {
            const combinedMetrics = [...metrics]
            combinedMetrics.push(...growthMetrics)

            return (
              <section key={group.id ?? group.label} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{group.label}</h3>
                    {group.description ? (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {combinedMetrics.map(renderMetricCard)}
                </div>
              </section>
            )
          }

          return (
            <section key={group.id ?? group.label} className="space-y-3">
              <div>
                {group.id === 'score' || group.id === 'despesas' || group.id === 'liquidez' ? (
                  <h3 className="text-lg font-semibold">{group.label}</h3>
                ) : (
                  <p className="text-sm font-semibold">{group.label}</p>
                )}
                {group.description ? (
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                ) : null}
              </div>
              {group.id === 'despesas' ? <div className="h-px bg-border" /> : null}
              <div
                className={cn(
                  'grid gap-4 sm:grid-cols-2',
                  group.id === 'eficiencia' ||
                    group.id === 'assistenciais' ||
                    group.id === 'receitas_assistenciais' ||
                    group.id === 'prestadores'
                    ? 'lg:grid-cols-3 xl:grid-cols-5'
                    : 'xl:grid-cols-3 2xl:grid-cols-4',
                )}
              >
                {metrics.map(renderMetricCard)}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="min-w-0">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">{operatorName || 'Indicadores Uniodonto'}</CardTitle>
            <CardDescription>
              {operatorName
                ? selectedPeriod
                  ? `Período ${selectedPeriod.periodo}`
                  : 'Selecione um período disponível.'
                : 'Dashboard exclusivo Uniodonto (objetivo 55% assistencial, 35% administrativo, 5% comercial e 5% resultado).'}
            </CardDescription>
            {operatorName && peerLabel ? (
              <p className="text-xs text-muted-foreground">
                {peerLabel}
                {peerCount ? ` (n=${peerCount})` : ''}
              </p>
            ) : null}
          </div>
          {periodSelect}
        </CardHeader>
        <CardContent>{renderIndicators()}</CardContent>
      </Card>
    </TooltipProvider>
  )
}

export default UniodontoKpiCards
