import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn, formatNumber, formatPercent } from '../../lib/utils'
import { metricFormulas } from '../../lib/metricFormulas'

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

function KpiCards({ snapshot, fallbackSummary, onPeriodChange, period, peerLabel, fallbackPeriods = [] }) {
  const operatorName = snapshot?.operatorName
  const selectedPeriod = snapshot?.selectedPeriod ?? period
  const periodOptions = operatorName ? snapshot?.availablePeriods ?? [] : fallbackPeriods ?? []
  const periodValue = buildPeriodValue(selectedPeriod)

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

  const peerCount = snapshot?.peerCount ?? snapshot?.peers?.peer_count ?? 0

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {indicatorSpec.map((metric) => {
            const operatorValue = snapshot?.operator?.[metric.key]
            const peerValue = snapshot?.peers?.[metric.key]
            return (
              <div key={metric.key} className="min-w-0 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</p>
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
            </div>
          )
        })}
        </div>
      </CardContent>
    </Card>
  )
}

export default KpiCards
