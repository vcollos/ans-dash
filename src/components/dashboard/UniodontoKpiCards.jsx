import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Info } from 'lucide-react'
import { cn, formatNumber, formatPercent } from '../../lib/utils'
import { UNIODONTO_INDICATORS, computeUniodontoMetrics } from '../../lib/uniodontoMetrics'

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
  const peerMetrics = operatorName && peerSummary ? computeUniodontoMetrics(peerSummary) : null
  const aggregateMetrics = !operatorName ? computeUniodontoMetrics(fallbackSummary ?? {}) : null

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

  const renderIndicators = () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {UNIODONTO_INDICATORS.map((metric) => {
        const operatorValue = operatorMetrics?.[metric.id] ?? null
        const peerValue = peerMetrics?.[metric.id] ?? null
        const aggregateValue = aggregateMetrics?.[metric.id] ?? null
        const displayValue = operatorName ? operatorValue : aggregateValue
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
          </div>
        )
      })}
    </div>
  )

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
