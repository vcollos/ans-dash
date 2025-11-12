import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { formatNumber, formatPercent } from '../../lib/utils'

function TrendChart({ data, metric, metricsCatalog, onMetricChange, operatorName, peerLabel }) {
  const metricDefinition = useMemo(() => metricsCatalog.find((item) => item.id === metric), [metric, metricsCatalog])
  const hasComparison = useMemo(() => data.some((item) => item.operador_valor !== undefined || item.pares_valor !== undefined), [data])
  const chartData = useMemo(() => {
    const labels = data.map((item) => item.periodo)
    if (hasComparison) {
      return {
        labels,
        datasets: [
          {
            label: operatorName ?? 'Operadora selecionada',
            data: data.map((item) => item.operador_valor ?? null),
            tension: 0.3,
            fill: false,
            borderColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--primary))',
            pointRadius: 3,
          },
          {
            label: peerLabel ?? 'Média dos pares',
            data: data.map((item) => item.pares_valor ?? null),
            tension: 0.3,
            fill: false,
            borderColor: 'hsl(var(--muted-foreground))',
            backgroundColor: 'hsl(var(--muted-foreground))',
            borderDash: [4, 4],
            pointRadius: 3,
          },
        ],
      }
    }
    const values = data.map((item) => item.valor ?? 0)
    return {
      labels,
      datasets: [
        {
          label: metricDefinition?.label ?? 'Série temporal',
          data: values,
          tension: 0.3,
          fill: true,
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--primary)/0.12)',
          pointRadius: 3,
        },
      ],
    }
  }, [data, metricDefinition, hasComparison, operatorName, peerLabel])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          ticks: {
            callback: (value) => {
              if (metricDefinition?.format === 'percent') {
                return `${value}%`
              }
              if (metricDefinition?.format === 'currency') {
                return formatNumber(value, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
              }
              return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
            },
          },
        },
      },
      plugins: {
        legend: {
          display: hasComparison,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y
              if (metricDefinition?.format === 'percent') {
                return `${metricDefinition.label}: ${formatPercent(value, 2)}`
              }
              if (metricDefinition?.format === 'currency') {
                return `${metricDefinition.label}: ${formatNumber(value, {
                  style: 'currency',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`
              }
              return `${metricDefinition?.label ?? 'Valor'}: ${formatNumber(value)}`
            },
          },
        },
      },
    }),
    [metricDefinition, hasComparison],
  )

  return (
    <Card className="h-[360px]">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">{metricDefinition?.label ?? 'Série temporal'}</CardTitle>
          {metricDefinition?.description ? <p className="text-sm text-muted-foreground">{metricDefinition.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {metricsCatalog.map((item) => (
            <Badge
              key={item.id}
              variant={item.id === metric ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => onMetricChange(item.id)}
            >
              {item.label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-full">
        <div className="h-[260px]">
          <Line options={chartOptions} data={chartData} />
        </div>
      </CardContent>
    </Card>
  )
}

export default TrendChart
