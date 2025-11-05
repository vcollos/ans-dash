import { useMemo } from 'react'
import { Scatter } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { formatNumber, formatPercent, toNumber } from '../../lib/utils'

function ScatterChart({ data, metricsCatalog, metrics, onMetricsChange }) {
  const metricX = metricsCatalog.find((item) => item.id === metrics.x) ?? metricsCatalog[0]
  const metricY = metricsCatalog.find((item) => item.id === metrics.y) ?? metricsCatalog[1] ?? metricsCatalog[0]

  const scatterData = useMemo(() => {
    return {
      datasets: [
        {
          label: `${metricY.label} vs ${metricX.label}`,
          data: data.map((item) => ({
            x: toNumber(item.x_value),
            y: toNumber(item.y_value),
            nome_operadora: item.nome_operadora,
            porte: item.porte,
            modalidade: item.modalidade,
            beneficiarios: toNumber(item.qt_beneficiarios),
            resultado: toNumber(item.resultado_liquido),
          })),
          backgroundColor: 'hsl(var(--primary)/0.35)',
          pointRadius: (context) => {
            const size = toNumber(context.raw?.beneficiarios)
            if (size <= 0) return 4
            return Math.min(18, 4 + Math.log10(size))
          },
        },
      ],
    }
  }, [data, metricX.label, metricY.label])

  const scatterOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const raw = context.raw || {}
              const xValue = toNumber(raw.x)
              const yValue = toNumber(raw.y)
              const formatValue = (value, format) => {
                if (format === 'percent') return formatPercent(value ?? 0)
                if (format === 'currency') return formatNumber(value ?? 0, { style: 'currency', maximumFractionDigits: 0 })
                return formatNumber(value ?? 0)
              }
              return [
                raw.nome_operadora,
                `Modalidade: ${raw.modalidade ?? '—'}`,
                `Porte: ${raw.porte ?? '—'}`,
                `${metricX.label}: ${formatValue(xValue, metricX.format)}`,
                `${metricY.label}: ${formatValue(yValue, metricY.format)}`,
                `Beneficiários: ${formatNumber(toNumber(raw.beneficiarios), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                `Resultado Líquido: ${formatNumber(toNumber(raw.resultado), { style: 'currency', maximumFractionDigits: 0 })}`,
              ]
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: metricX.label },
          ticks: {
            callback: (value) => {
              const numeric = toNumber(value)
              if (metricX.format === 'percent') return `${numeric}%`
              if (metricX.format === 'currency') {
                return formatNumber(numeric, { style: 'currency', maximumFractionDigits: 0 })
              }
              return formatNumber(numeric)
            },
          },
        },
        y: {
          title: { display: true, text: metricY.label },
          ticks: {
            callback: (value) => {
              const numeric = toNumber(value)
              if (metricY.format === 'percent') return `${numeric}%`
              if (metricY.format === 'currency') {
                return formatNumber(numeric, { style: 'currency', maximumFractionDigits: 0 })
              }
              return formatNumber(numeric)
            },
          },
        },
      },
    }),
    [metricX, metricY],
  )

  return (
    <Card className="h-[360px]">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Correlação Financeira</CardTitle>
          <p className="text-sm text-muted-foreground">
            Relacione indicadores para encontrar clusters de risco e desempenho.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={metricX.id} onValueChange={(value) => onMetricsChange({ ...metrics, x: value })}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Eixo X" />
            </SelectTrigger>
            <SelectContent>
              {metricsCatalog.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={metricY.id} onValueChange={(value) => onMetricsChange({ ...metrics, y: value })}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Eixo Y" />
            </SelectTrigger>
            <SelectContent>
              {metricsCatalog.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-full">
        <div className="h-[260px]">
          <Scatter data={scatterData} options={scatterOptions} />
        </div>
      </CardContent>
    </Card>
  )
}

export default ScatterChart
