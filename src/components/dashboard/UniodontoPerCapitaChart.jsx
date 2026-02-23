import { useId, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { formatNumber, toNumber } from '../../lib/utils'
import {
  UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_OPTIONS,
  UNIODONTO_PER_CAPITA_REVENUE_BASE_OPTIONS,
  resolveRevenueBaseOption,
} from '../../lib/uniodontoPerCapita'

const PRIMARY_REVENUE_COLOR = '#0f766e'
const PRIMARY_EVENTS_COLOR = '#dc2626'
const COMPARISON_REVENUE_COLOR = '#14b8a6'
const COMPARISON_EVENTS_COLOR = '#f97316'

function formatCurrency(value, { compact = false } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return compact ? '' : '—'
  }
  return formatNumber(value, {
    style: 'currency',
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  })
}

function LegendItem({ label, color, dashed = false }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className="h-0 w-6 border-t-2"
        style={{
          borderColor: color,
          borderStyle: dashed ? 'dashed' : 'solid',
        }}
      />
      <span>{label}</span>
    </div>
  )
}

function UniodontoPerCapitaChart({
  series = [],
  filters,
  onFiltersChange,
  isLoading = false,
  primaryLabel,
  comparisonLabel,
  hasOperatorComparison = false,
}) {
  const chartId = useId().replace(/:/g, '')
  const revenueOption = resolveRevenueBaseOption(filters?.revenueBase)
  const revenueShortLabel = revenueOption?.shortLabel ?? 'Contraprestações'
  const chartConfig = useMemo(
    () => ({
      primaryRevenue: {
        label: `${primaryLabel ?? 'Seleção'} • ${revenueShortLabel} per capita (12m)`,
        color: PRIMARY_REVENUE_COLOR,
      },
      primaryEvents: {
        label: `${primaryLabel ?? 'Seleção'} • Eventos per capita (12m)`,
        color: PRIMARY_EVENTS_COLOR,
      },
      comparisonRevenue: {
        label: `${comparisonLabel ?? 'Média filtrada'} • ${revenueShortLabel} per capita (12m)`,
        color: COMPARISON_REVENUE_COLOR,
      },
      comparisonEvents: {
        label: `${comparisonLabel ?? 'Média filtrada'} • Eventos per capita (12m)`,
        color: COMPARISON_EVENTS_COLOR,
      },
    }),
    [primaryLabel, comparisonLabel, revenueShortLabel],
  )

  const chartData = (series ?? []).map((row) => ({
    periodo: row?.periodo ?? (row?.ano && row?.trimestre ? `${row.ano}T${row.trimestre}` : '—'),
    primaryRevenue: toNumber(row?.primaryRevenuePerCapita, null),
    primaryEvents: toNumber(row?.primaryEventsPerCapita, null),
    comparisonRevenue: toNumber(row?.comparisonRevenuePerCapita, null),
    comparisonEvents: toNumber(row?.comparisonEventsPerCapita, null),
  }))
  const hasData = chartData.some((item) => item.primaryRevenue !== null || item.primaryEvents !== null)
  const hasComparisonSeries =
    hasOperatorComparison &&
    chartData.some((item) => item.comparisonRevenue !== null || item.comparisonEvents !== null)

  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-lg">Contraprestações e eventos per capita por modalidade de pagamento</CardTitle>
          <CardDescription>
            Compara a operadora selecionada com a média filtrada, usando base de receita configurável no cálculo per capita de 12 meses.
          </CardDescription>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modalidade de pagamento</p>
            <Select value={filters?.paymentModality} onValueChange={(value) => onFiltersChange?.({ paymentModality: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Modalidade de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Base de receita</p>
            <Select value={filters?.revenueBase} onValueChange={(value) => onFiltersChange?.({ revenueBase: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Base de receita" />
              </SelectTrigger>
              <SelectContent>
                {UNIODONTO_PER_CAPITA_REVENUE_BASE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4">
          <LegendItem label={chartConfig.primaryRevenue.label} color={PRIMARY_REVENUE_COLOR} />
          <LegendItem label={chartConfig.primaryEvents.label} color={PRIMARY_EVENTS_COLOR} />
          {hasComparisonSeries ? (
            <>
              <LegendItem label={chartConfig.comparisonRevenue.label} color={COMPARISON_REVENUE_COLOR} dashed />
              <LegendItem label={chartConfig.comparisonEvents.label} color={COMPARISON_EVENTS_COLOR} dashed />
            </>
          ) : null}
        </div>

        {hasData ? (
          <div className="relative">
            {isLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70 text-xs text-muted-foreground">
                Carregando séries...
              </div>
            ) : null}
            <ChartContainer
              id={`uniodonto-per-capita-${chartId}`}
              config={chartConfig}
              className="h-[360px] w-full items-stretch justify-stretch rounded-lg border aspect-auto"
            >
              <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-muted" />
                <XAxis dataKey="periodo" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value, { compact: true })}
                  width={96}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => `Período ${value}`}
                      valueFormatter={(value) => formatCurrency(value)}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="primaryRevenue"
                  stroke="var(--color-primaryRevenue)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-primaryRevenue)', r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                  name={chartConfig.primaryRevenue.label}
                />
                <Line
                  type="monotone"
                  dataKey="primaryEvents"
                  stroke="var(--color-primaryEvents)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-primaryEvents)', r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                  name={chartConfig.primaryEvents.label}
                />
                {hasComparisonSeries ? (
                  <Line
                    type="monotone"
                    dataKey="comparisonRevenue"
                    stroke="var(--color-comparisonRevenue)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={{ fill: 'var(--color-comparisonRevenue)', r: 2.5, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    connectNulls
                    name={chartConfig.comparisonRevenue.label}
                  />
                ) : null}
                {hasComparisonSeries ? (
                  <Line
                    type="monotone"
                    dataKey="comparisonEvents"
                    stroke="var(--color-comparisonEvents)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={{ fill: 'var(--color-comparisonEvents)', r: 2.5, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    connectNulls
                    name={chartConfig.comparisonEvents.label}
                  />
                ) : null}
              </LineChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Sem dados per capita para os filtros atuais.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UniodontoPerCapitaChart
