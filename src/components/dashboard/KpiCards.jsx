import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn, formatNumber, formatPercent } from '../../lib/utils'
import { metricFormulas } from '../../lib/metricFormulas'
import { Badge } from '../ui/badge'

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

function ScoreGauge({ value, min = 1, max = 4, steps = 8, className }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const filled = Math.round(ratio * steps)
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-[10px] text-muted-foreground">RUIM</span>
      <div className="flex gap-0.5">
        {Array.from({ length: steps }).map((_, index) => (
          <span
            key={index}
            className={cn(
              'h-2 w-3 rounded-sm',
              index < filled ? 'bg-emerald-500/80 shadow-sm' : 'bg-muted-foreground/30',
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">ÓTIMA</span>
    </div>
  )
}

function ScoreBadge({ label }) {
  if (!label) {
    return <Badge variant="outline" className="text-muted-foreground">Sem dado</Badge>
  }
  const style = classificationColors[label] ?? 'bg-muted text-muted-foreground'
  return <Badge className={cn('text-xs font-semibold', style)}>{label}</Badge>
}

function formatBoolean(value) {
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  return '—'
}

function MetaItem({ label, value }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value ?? '—'}</p>
    </div>
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

  if (!operatorName) {
    return (
      <Card className="min-w-0">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Indicadores agregados</CardTitle>
            <CardDescription>
              {peerLabel
                ? `Visualizando a media definida em "Comparar com": ${peerLabel}.`
                : 'Selecione uma operadora para destravar a comparacao com seus pares.'}
            </CardDescription>
            {selectedPeriod ? (
              <p className="text-xs text-muted-foreground">Período ativo: {selectedPeriod.periodo ?? `${selectedPeriod.ano}T${selectedPeriod.trimestre}`}</p>
            ) : null}
          </div>
          {periodSelect}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {indicatorSpec.map((metric) => {
              const value = fallbackSummary?.[metric.key]
              return (
                <div key={metric.key} className="min-w-0 rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-semibold">{formatValue(value, metric.format)}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="min-w-0">
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
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetaItem label="Período" value={selectedPeriod?.periodo ?? `${selectedPeriod?.ano ?? '—'}T${selectedPeriod?.trimestre ?? '—'}`} />
              <MetaItem label="Modalidade" value={snapshot?.operator?.modalidade ?? '—'} />
              <MetaItem label="Porte" value={snapshot?.operator?.porte ?? '—'} />
              <MetaItem label="Uniodonto" value={formatBoolean(snapshot?.operator?.uniodonto)} />
              <MetaItem label="Ativa" value={formatBoolean(snapshot?.operator?.ativa)} />
              <MetaItem label="Reg. ANS" value={snapshot?.operator?.reg_ans ?? snapshot?.operator?.regAns ?? '—'} />
            </div>
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
                <ScoreGauge value={regulatoryLoading ? null : regulatoryData?.finalScore?.value ?? null} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {regulatoryLoading
                  ? 'Calculando score com o grupo filtrado...'
                  : `${peerLabel ?? 'Sem comparação definida'}${peerCount ? ` (n=${peerCount})` : ''}`}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {indicatorSpec.map((metric) => {
              const operatorValue = snapshot?.operator?.[metric.key]
              const peerValue = snapshot?.peers?.[metric.key]
              const regMetric = regulatoryMetricMap[metric.key]
              return (
                <div key={metric.key} className="min-w-0 space-y-2 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <ScoreBadge label={regulatoryLoading ? null : regMetric?.classification} />
                  </div>
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
                  <ScoreGauge value={regulatoryLoading ? null : regMetric?.note ?? null} steps={6} />
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default KpiCards
