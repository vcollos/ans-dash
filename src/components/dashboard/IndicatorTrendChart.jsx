import { useMemo, useId } from 'react'
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'
import { metricFormulas } from '../../lib/metricFormulas'
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

function IndicatorTrendChart({
  data = [],
  metric,
  onMetricChange,
  isLoading = false,
  primaryLabel,
  comparisonLabel,
}) {
  const selectedMetric = metricOptions.find((item) => item.id === metric) ?? metricOptions[0]
  const chartId = useId().replace(/:/g, '')

  const chartData = useMemo(() => {
    return (data ?? []).map((row) => {
      const primary = toNumber(row?.operador_valor ?? row?.valor, null)
      const comparison = toNumber(row?.pares_valor, null)
      return {
        periodo: row?.periodo ?? (row?.ano && row?.trimestre ? `${row.ano}T${row.trimestre}` : '—'),
        primary: primary === null ? null : Number(primary),
        comparison: comparison === null ? null : Number(comparison),
      }
    })
  }, [data])

  const hasData = chartData.some((item) => item.primary !== null || item.comparison !== null)
  const hasComparisonSeries = chartData.some((item) => item.comparison !== null)
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
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">Evolução dos indicadores</CardTitle>
          <CardDescription>Compare o histórico do indicador selecionado entre a linha principal e o grupo de comparação.</CardDescription>
        </div>
        <Select value={selectedMetric?.id} onValueChange={onMetricChange}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Escolha o indicador" />
          </SelectTrigger>
          <SelectContent>
            {metricOptions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <LegendItem label={chartConfig.primary.label} color={OPERATOR_COLOR} />
            {hasComparisonSeries ? <LegendItem label={chartConfig.comparison.label} color={FILTER_AVERAGE_COLOR} /> : null}
          </div>
          <div className="relative">
            {isLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70 text-sm text-muted-foreground">
                Carregando série histórica...
              </div>
            ) : null}
            {hasData ? (
              <ChartContainer
                id={`trend-${chartId}`}
                className="h-[360px] w-full items-stretch justify-stretch rounded-lg border aspect-auto"
                config={chartConfig}
              >
                <LineChart data={chartData} margin={{ left: 12, right: 12, top: 16, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-muted" />
                  <XAxis dataKey="periodo" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value === null || value === undefined || Number.isNaN(value)) return ''
                      const formatted = formatMetricValue(value, selectedMetric?.format, { compact: true })
                      return formatted === '—' ? '' : formatted
                    }}
                    width={80}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatMetricValue(value, selectedMetric?.format)}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="primary"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-primary)', r: 3, strokeWidth: 0 }}
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
                      dot={{ fill: 'var(--color-comparison)', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                      connectNulls
                      name={chartConfig.comparison.label}
                    />
                  ) : null}
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Nenhum dado disponível para o indicador selecionado.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default IndicatorTrendChart
