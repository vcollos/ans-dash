import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { formatNumber, formatPercent, toNumber } from '../../lib/utils'

const rankingOptions = [
  { id: 'resultado_liquido', label: 'Resultado Líquido (R$)', format: 'currency' },
  { id: 'vr_contraprestacoes', label: 'Receitas de Contraprestações (R$)', format: 'currency' },
  { id: 'sinistralidade_pct', label: 'Sinistralidade Média (%)', format: 'percent' },
  { id: 'margem_lucro_pct', label: 'Margem de Lucro (%)', format: 'percent' },
]

function formatValue(value, format) {
  const numeric = toNumber(value)
  if (format === 'percent') {
    return formatPercent(numeric, 2)
  }
  if (format === 'currency') {
    return formatNumber(numeric, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  return formatNumber(numeric)
}

function RankingChart({ data, metric, onMetricChange, order = 'DESC', onOrderChange = () => {} }) {
  const selectedMetric = rankingOptions.find((item) => item.id === metric) ?? rankingOptions[0]

  const chartData = useMemo(() => {
    const labels = data.map((item) => item.nome_operadora)
    const values = data.map((item) => item.valor ?? 0)
    return {
      labels,
      datasets: [
        {
          label: selectedMetric.label,
          data: values,
          backgroundColor: 'hsl(var(--primary)/0.55)',
          borderRadius: 6,
        },
      ],
    }
  }, [data, selectedMetric])

  const chartOptions = useMemo(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            callback: (value) => formatValue(value, selectedMetric.format),
          },
        },
        y: {
          grid: { display: false },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatValue(ctx.parsed.x, selectedMetric.format)}`,
          },
        },
      },
    }),
    [selectedMetric],
  )

  return (
    <Card className="h-[360px]">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Ranking de Operadoras</CardTitle>
          <p className="text-sm text-muted-foreground">Top 10 operadoras conforme o indicador selecionado</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMetric.id} onValueChange={onMetricChange}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Escolha o indicador" />
            </SelectTrigger>
            <SelectContent>
              {rankingOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={order} onValueChange={onOrderChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DESC">Top maiores</SelectItem>
              <SelectItem value="ASC">Top menores</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-full">
        <div className="h-[260px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  )
}

export default RankingChart
