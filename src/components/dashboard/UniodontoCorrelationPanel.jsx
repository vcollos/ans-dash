import { useId, useMemo } from 'react'
import { Scatter, ScatterChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ChartContainer, ChartTooltip } from '../ui/chart'
import { formatNumber, formatPercent, toNumber } from '../../lib/utils'

const computePercentile = (values, percentile) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = (percentile / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) return sorted[lower]
  const weight = rank - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

const getOutlierThresholds = (rows) => {
  const resultValues = rows
    .map((row) => toNumber(row?.icu_operacional, null))
    .filter((value) => value !== null && Number.isFinite(value))
  const comercialValues = rows
    .map((row) => toNumber(row?.indice_despesas_comerciais_pct, null))
    .filter((value) => value !== null && Number.isFinite(value))
  const growthValues = rows
    .map((row) => toNumber(row?.beneficiarios_crescimento_pct, null))
    .filter((value) => value !== null && Number.isFinite(value))
  if (!resultValues.length || !comercialValues.length) {
    return null
  }
  return {
    resultP5: computePercentile(resultValues, 5),
    resultP95: computePercentile(resultValues, 95),
    comercialP95: computePercentile(comercialValues, 95),
    growthP5: growthValues.length ? computePercentile(growthValues, 5) : null,
    growthP95: growthValues.length ? computePercentile(growthValues, 95) : null,
  }
}

const filterOutliers = (rows, { includeGrowth = false } = {}) => {
  const thresholds = getOutlierThresholds(rows)
  if (!thresholds) return rows
  const { resultP5, resultP95, comercialP95, growthP5, growthP95 } = thresholds
  return rows.filter((row) => {
    const resultValue = toNumber(row?.icu_operacional, null)
    const comercialValue = toNumber(row?.indice_despesas_comerciais_pct, null)
    if (resultValue === null || comercialValue === null) return false
    if (resultValue < -100 || resultValue > 100) return false
    if (resultP5 !== null && resultValue < resultP5) return false
    if (resultP95 !== null && resultValue > resultP95) return false
    if (comercialP95 !== null && comercialValue > comercialP95) return false
    if (includeGrowth) {
      const growthValue = toNumber(row?.beneficiarios_crescimento_pct, null)
      if (growthValue === null) return false
      if (growthP5 !== null && growthValue < growthP5) return false
      if (growthP95 !== null && growthValue > growthP95) return false
    }
    return true
  })
}

const buildScatterData = (rows, yKey) =>
  (rows ?? [])
    .map((row) => {
      const comercial = toNumber(row?.indice_despesas_comerciais_pct, null)
      const yValue = toNumber(row?.[yKey], null)
      if (comercial === null || yValue === null) return null
      return {
        name: row?.nome_operadora ?? '—',
        x: comercial,
        y: yValue,
      }
    })
    .filter(Boolean)

const computePearson = (points) => {
  if (!points?.length || points.length < 2) return null
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length
  let sumXY = 0
  let sumX2 = 0
  let sumY2 = 0
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    sumXY += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }
  const denom = Math.sqrt(sumX2 * sumY2)
  if (!Number.isFinite(denom) || denom === 0) return null
  return sumXY / denom
}

function CorrelationTooltip({ active, payload, yLabel }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{point.name}</div>
      <div className="text-muted-foreground">
        Despesa comercial: {formatPercent(point.x, 2)}
      </div>
      <div className="text-muted-foreground">
        {yLabel}: {formatPercent(point.y, 2)}
      </div>
    </div>
  )
}

function ScatterBlock({ id, title, description, points, yLabel, color }) {
  const correlation = useMemo(() => computePearson(points), [points])
  const correlationLabel =
    correlation === null ? '—' : formatNumber(correlation, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sampleSize = points.length
  const chartConfig = useMemo(
    () => ({
      series: {
        label: yLabel,
        color,
      },
    }),
    [color, yLabel],
  )

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          r = {correlationLabel} · n = {sampleSize}
        </div>
      </div>
      {sampleSize ? (
        <ChartContainer
          id={id}
          className="mt-3 h-[260px] w-full items-stretch justify-stretch rounded-lg border aspect-auto"
          config={chartConfig}
        >
          <ScatterChart margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-muted" />
            <XAxis
              dataKey="x"
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatPercent(value, 0)}
            />
            <YAxis
              dataKey="y"
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatPercent(value, 0)}
            />
            <ChartTooltip content={<CorrelationTooltip yLabel={yLabel} />} />
            <Scatter data={points} fill="var(--color-series)" />
          </ScatterChart>
        </ChartContainer>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          Sem dados suficientes para calcular correlação.
        </div>
      )}
    </div>
  )
}

function UniodontoCorrelationPanel({ rows = [], isLoading = false }) {
  const chartId = useId().replace(/:/g, '')
  const filteredRows = useMemo(() => filterOutliers(rows ?? []), [rows])
  const filteredGrowthRows = useMemo(() => filterOutliers(rows ?? [], { includeGrowth: true }), [rows])
  const growthPoints = useMemo(
    () => buildScatterData(filteredGrowthRows, 'beneficiarios_crescimento_pct'),
    [filteredGrowthRows],
  )
  const resultadoPoints = useMemo(() => buildScatterData(filteredRows, 'icu_operacional'), [filteredRows])
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-lg">Relação entre despesa comercial e desempenho</CardTitle>
        <CardDescription>
          Comparação entre despesa comercial (%) e crescimento de beneficiários ou resultado real (%).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <ScatterBlock
            id={`uniodonto-corr-growth-${chartId}`}
            title="Despesa comercial x crescimento"
            description="Crescimento de beneficiários no período."
            points={growthPoints}
            yLabel="Crescimento (%)"
            color="hsl(var(--chart-2))"
          />
          <ScatterBlock
            id={`uniodonto-corr-result-${chartId}`}
            title="Despesa comercial x resultado"
            description="Resultado real (%)."
            points={resultadoPoints}
            yLabel="Resultado real (%)"
            color="hsl(var(--chart-4))"
          />
        </div>
        {isLoading ? (
          <div className="mt-3 text-xs text-muted-foreground">Atualizando correlação...</div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default UniodontoCorrelationPanel
