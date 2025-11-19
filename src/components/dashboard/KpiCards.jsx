import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn, formatNumber, formatPercent } from '../../lib/utils'
import { metricFormulas } from '../../lib/metricFormulas'
import { Badge } from '../ui/badge'
import { REGULATORY_BASE_TEXT } from '../../lib/regulatoryScore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Info } from 'lucide-react'

const indicatorSpec = metricFormulas
  .filter((metric) => metric.showInCards)
  .map((metric) => ({
    key: metric.id,
    label: metric.label,
    format: metric.format,
    direction: metric.trend ?? 'higher',
    formula: metric.description ?? '',
  }))

function formatValue(value, format) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  if (format === 'percent') {
    return formatPercent(value, 2)
  }
  if (format === 'decimal') {
    return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (format === 'days') {
    return formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }
  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildPeriodValue(period) {
  if (!period) return ''
  return `${period.ano}-${period.trimestre}`
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
  const hue = 2 + Math.round(136 * ratio) // 2 deg ~ red to ~138 deg green
  const saturation = active ? 75 : 35
  const lightness = active ? 45 : 78
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

function ScoreGauge({ value, min = 1, max = 4, steps = 8, className, classification }) {
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
            className={cn(
              'h-2 w-3 rounded-sm transition',
              index < filled ? 'shadow-sm' : '',
            )}
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
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        Sem dado
      </Badge>
    )
  }
  const style = classificationColors[label] ?? 'bg-muted text-muted-foreground'
  return (
    <Badge className={cn('text-xs font-semibold', style, className)}>
      {label}
    </Badge>
  )
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

function KpiCards({
  snapshot,
  fallbackSummary,
  onPeriodChange,
  period,
  peerLabel,
  fallbackPeriods = [],
  regulatoryScore = null,
}) {
  const operatorName = snapshot?.operatorName
  const selectedPeriod = snapshot?.selectedPeriod ?? period
  const periodOptions = operatorName ? snapshot?.availablePeriods ?? [] : fallbackPeriods ?? []
  const periodValue = buildPeriodValue(selectedPeriod)
  const regulatoryData = regulatoryScore?.data ?? null
  const regulatoryLoading = regulatoryScore?.isLoading ?? false
  const peerCount = snapshot?.peerCount ?? snapshot?.peers?.peer_count ?? regulatoryData?.peerCount ?? 0
  const regulatoryMetricMap = {}
  if (regulatoryData?.metrics) {
    regulatoryData.metrics.forEach((metric) => {
      regulatoryMetricMap[metric.id] = metric
    })
  }
  const explanationText = (() => {
    if (!regulatoryData) return null
    const highs = regulatoryData.metrics.filter((metric) => metric.note === 4).map((metric) => metric.label)
    const lows = regulatoryData.metrics.filter((metric) => metric.note === 1).map((metric) => metric.label)
    const lcMetric = regulatoryMetricMap.liquidez_corrente
    const solvency = regulatoryData.solvency ?? {}
    const parts = []
    if (highs.length) {
      parts.push(`Acima do Q3: ${highs.join(', ')}.`)
    }
    if (lows.length) {
      parts.push(`Abaixo do Q1: ${lows.join(', ')}.`)
    }
    if (solvency?.classification) {
      const lcValue =
        lcMetric?.value !== null && lcMetric?.value !== undefined ? formatValue(lcMetric.value, lcMetric.format) : '—'
      parts.push(`Solvência: ${solvency.classification} (LC ${lcValue}, bloco ${solvency.classification}).`)
    }
    if (regulatoryData.finalScore?.label) {
      parts.push(
        `Desempenho operacional: ${regulatoryData.finalScore.label} (resultado operacional e margem líquida considerados nos pesos regulatórios).`,
      )
    }
    return parts.join(' ')
  })()

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
    <Select value={periodValue || undefined} onValueChange={handlePeriodChange}>
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
    const tooltipText = metric.formula || 'Fórmula não disponível.'
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

  const content = () => {
    if (!operatorName) {
      return (
        <>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Indicadores agregados</CardTitle>
              <CardDescription>
                {peerLabel
                  ? `Visualizando a media definida em "Comparar com": ${peerLabel}.`
                  : 'Selecione uma operadora para destravar a comparacao com seus pares.'}
              </CardDescription>
              {selectedPeriod ? (
                <p className="text-xs text-muted-foreground">
                  Período ativo: {selectedPeriod.periodo ?? `${selectedPeriod.ano}T${selectedPeriod.trimestre}`}
                </p>
              ) : null}
            </div>
            {periodSelect}
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg border border-border/70 bg-muted/30 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score ponderado</p>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-semibold">
                      {regulatoryLoading ? '...' : regulatoryData?.finalScore?.value ? regulatoryData.finalScore.value.toFixed(2) : '—'}
                    </p>
                    <ScoreBadge label={regulatoryLoading ? null : regulatoryData?.finalScore?.label} />
                  </div>
                </div>
                <ScoreGauge
                  value={regulatoryLoading ? null : regulatoryData?.finalScore?.value ?? null}
                  classification={regulatoryLoading ? null : regulatoryData?.finalScore?.label}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {regulatoryLoading ? 'Calculando score para o filtro atual...' : peerLabel ?? 'Comparação geral'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {indicatorSpec.map((metric) => {
                const value = fallbackSummary?.[metric.key]
                return (
                  <div key={metric.key} className="min-w-0 rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
                    {renderIndicatorHeader(metric)}
                    <p className="text-2xl font-semibold">{formatValue(value, metric.format)}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </>
      )
    }

    return (
      <>
        <CardHeader className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">{operatorName}</CardTitle>
            <CardDescription>
              {selectedPeriod ? `Período ${selectedPeriod.periodo}` : 'Selecione um período disponível para consultar os indicadores.'}
            </CardDescription>
            {peerLabel ? (
              <p className="text-xs text-muted-foreground">
                {peerLabel}
                {peerCount ? ` (n=${peerCount})` : ''}
              </p>
            ) : null}
          </div>
          {periodSelect}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="rounded-lg border border-border/70 bg-background/40 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score geral ponderado</p>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-semibold">
                      {regulatoryLoading ? '...' : regulatoryData?.finalScore?.value ? regulatoryData.finalScore.value.toFixed(2) : '—'}
                    </p>
                    <ScoreBadge label={regulatoryLoading ? null : regulatoryData?.finalScore?.label} />
                  </div>
                </div>
                <ScoreGauge
                  value={regulatoryLoading ? null : regulatoryData?.finalScore?.value ?? null}
                  classification={regulatoryLoading ? null : regulatoryData?.finalScore?.label}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {regulatoryLoading
                  ? 'Calculando score com o grupo filtrado...'
                  : `${peerLabel ?? 'Sem comparação definida'}${peerCount ? ` (n=${peerCount})` : ''}`}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {indicatorSpec.map((metric) => {
                const operatorValue = snapshot?.operator?.[metric.key]
                const peerValue = snapshot?.peers?.[metric.key]
                const regMetric = regulatoryMetricMap[metric.key]
                return (
                  <div key={metric.key} className="min-w-0 space-y-2 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    {renderIndicatorHeader(metric)}
                    <p
                      className={cn(
                        'text-2xl font-semibold leading-tight',
                        snapshot?.isLoading
                          ? ''
                          : getComparisonTrendClass(operatorValue, peerValue, metric.direction ?? 'higher'),
                      )}
                    >
                      {snapshot?.isLoading ? '...' : formatValue(operatorValue, metric.format)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Média filtrada: {snapshot?.isLoading ? '...' : formatValue(peerValue, metric.format)}
                    </p>
                    <div className="flex items-center gap-2">
                      <ScoreGauge
                        value={regulatoryLoading ? null : regMetric?.note ?? null}
                        steps={6}
                        classification={regulatoryLoading ? null : regMetric?.classification}
                        className="flex-1"
                      />
                      <ScoreBadge
                        label={regulatoryLoading ? null : regMetric?.classification}
                        className="whitespace-nowrap"
                      />
                    </div>
                  </div>
                )
              })}
              {regulatoryData && explanationText ? (
                <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4 rounded-lg border border-border/70 bg-muted/20 px-4 py-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explicação técnica</p>
                  <p className="mt-1 text-foreground">{explanationText}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{REGULATORY_BASE_TEXT}</p>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="min-w-0">{content()}</Card>
    </TooltipProvider>
  )
}

export default KpiCards
