import { useMemo, useId } from 'react'
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'
import { metricFormulas } from '../../lib/metricFormulas.js'
import { formatNumber, formatPercent, toNumber } from '../../lib/utils'

const metricOptions = [
  {
    id: 'regulatory_score',
    label: 'Score regulatório ponderado',
    format: 'score',
  },
  ...metricFormulas
    .filter((metric) => metric.showInCards)
    .map((metric) => ({
      id: metric.id,
      label: metric.label,
      format: metric.format,
    })),
]

const OPERATOR_COLOR = '#550039'
const FILTER_AVERAGE_COLOR = '#e1ff7b'

function formatMetricValue(value, format, { compact = false } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  if (format === 'score') {
    return formatNumber(value, { minimumFractionDigits: compact ? 1 : 2, maximumFractionDigits: 2 })
  }
  if (format === 'percent') {
    return formatPercent(value, compact ? 0 : 2)
  }
  if (format === 'currency') {
    return formatNumber(value, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  if (format === 'decimal') {
    return formatNumber(value, { minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 1 : 2 })
  }
  if (format === 'days') {
    return formatNumber(value, { minimumFractionDigits: compact ? 0 : 1, maximumFractionDigits: compact ? 0 : 1 })
  }
  return formatNumber(value, { minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 1 : 2 })
}

function LegendItem({ label, color }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-3 w-3 rounded-full border border-border/40" style={{ backgroundColor: color }} />
      <span className="font-medium text-foreground">{label}</span>
    </div>
  )
}

function IndicatorTrendChart({ dataByMetric = {}, isLoading = false, primaryLabel, comparisonLabel }) {
  const chartId = useId().replace(/:/g, '')
  const chartConfig = useMemo(
    () => ({
      primary: {
        label: primaryLabel ?? 'Operadora',
        color: OPERATOR_COLOR,
      },
      comparison: {
        label: comparisonLabel ?? 'Comparação',
        color: FILTER_AVERAGE_COLOR,
      },
    }),
    [primaryLabel, comparisonLabel],
  )

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-lg">Evolução dos indicadores</CardTitle>
        <CardDescription>Visualize todas as séries (2 por linha) sem trocar de indicador.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <LegendItem label={chartConfig.primary.label} color={OPERATOR_COLOR} />
          <LegendItem label={chartConfig.comparison.label} color={FILTER_AVERAGE_COLOR} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {metricOptions.map((metric) => {
            const rawData = dataByMetric?.[metric.id] ?? []
            const chartData = (rawData ?? []).map((row) => {
              const primary = toNumber(row?.operador_valor ?? row?.valor, null)
              const comparison = toNumber(row?.pares_valor, null)
              return {
                periodo: row?.periodo ?? (row?.ano && row?.trimestre ? `${row.ano}T${row.trimestre}` : '—'),
                primary: primary === null ? null : Number(primary),
                comparison: comparison === null ? null : Number(comparison),
              }
            })
            const hasData = chartData.some((item) => item.primary !== null || item.comparison !== null)
            const hasComparisonSeries = chartData.some((item) => item.comparison !== null)

            return (
              <div key={metric.id} className="relative rounded-lg border p-3">
                {isLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70 text-xs text-muted-foreground">
                    Carregando séries...
                  </div>
                ) : null}
                <p className="mb-2 text-sm font-semibold">{metric.label}</p>
                {hasData ? (
                  <ChartContainer
                    id={`trend-${chartId}-${metric.id}`}
                    className="h-[260px] w-full items-stretch justify-stretch rounded-lg border aspect-auto"
                    config={chartConfig}
                  >
                    <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-muted" />
                      <XAxis dataKey="periodo" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          if (value === null || value === undefined || Number.isNaN(value)) return ''
                          const formatted = formatMetricValue(value, metric.format, { compact: true })
                          return formatted === '—' ? '' : formatted
                        }}
                        width={70}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent valueFormatter={(value) => formatMetricValue(value, metric.format)} />}
                      />
                      <Line
                        type="monotone"
                        dataKey="primary"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--color-primary)', r: 2.5, strokeWidth: 0 }}
                        activeDot={{ r: 4 }}
                        connectNulls
                        name={chartConfig.primary.label}
                      />
                      {hasComparisonSeries ? (
                        <Line
                          type="monotone"
                          dataKey="comparison"
                          stroke="var(--color-comparison)"
                          strokeWidth={2}
                          dot={{ fill: 'var(--color-comparison)', r: 2.5, strokeWidth: 0 }}
                          activeDot={{ r: 4 }}
                          connectNulls
                          name={chartConfig.comparison.label}
                        />
                      ) : null}
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    Sem dados para este indicador nos filtros atuais.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default IndicatorTrendChart
