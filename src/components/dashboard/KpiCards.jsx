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
  }))

const fallbackMapping = {
  sinistralidade_pct: 'sinistralidade',
  margem_lucro_pct: 'margem_lucro_liquido',
  despesas_adm_pct: 'despesas_adm',
  despesas_comerciais_pct: 'despesas_comerciais',
  despesas_operacionais_pct: 'despesas_operacionais',
  indice_resultado_financeiro_pct: 'indice_resultado_financeiro',
  retorno_pl_pct: 'retorno_patrimonio_liquido',
  liquidez_corrente: 'liquidez_corrente',
  capital_terceiros_sobre_pl: 'capital_terceiros',
  pmcr: 'pmcr',
  pmpe: 'pmpe',
}

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

function KpiCards({ snapshot, fallbackSummary, onPeriodChange, period, peerLabel }) {
  const operatorName = snapshot?.operatorName
  const selectedPeriod = snapshot?.selectedPeriod ?? period

  if (!operatorName) {
    return (
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-lg">Indicadores agregados</CardTitle>
          <CardDescription>Selecione uma operadora para destravar a comparação com seus pares.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {indicatorSpec.map((metric) => {
              const fallbackKey = fallbackMapping[metric.key] ?? metric.key
              const value = fallbackSummary?.[fallbackKey]
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

  const periodValue = buildPeriodValue(selectedPeriod)
  const periods = snapshot?.availablePeriods ?? []
  const peerCount = snapshot?.peerCount ?? snapshot?.peers?.peer_count ?? 0

  const handlePeriodChange = (value) => {
    if (!value) return
    const [anoStr, trimStr] = value.split('-')
    const nextPeriod = { ano: Number(anoStr), trimestre: Number(trimStr) }
    onPeriodChange?.(nextPeriod)
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
        {periods.length ? (
          <Select value={periodValue} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((item) => (
                <SelectItem key={`${item.ano}-${item.trimestre}`} value={`${item.ano}-${item.trimestre}`}>
                  {item.periodo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
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
                  {peerLabel ?? 'Média dos pares'}: {snapshot?.isLoading ? '...' : formatValue(peerValue, metric.format)}
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
