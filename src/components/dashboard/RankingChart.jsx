import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn, formatNumber, formatPercent, toNumber } from '../../lib/utils'
import { metricFormulas } from '../../lib/metricFormulas'

const rankingOptions = metricFormulas
  .filter((metric) => metric.showInCards)
  .map((metric) => ({
    id: metric.id,
    label: metric.label,
    format: metric.format === 'percent' ? 'percent' : metric.format === 'decimal' ? 'number' : metric.format,
    trend: metric.trend ?? 'higher',
  }))

function formatValue(value, format) {
  const numeric = toNumber(value)
  if (format === 'percent') {
    return formatPercent(numeric, 2)
  }
  if (format === 'currency') {
    return formatNumber(numeric, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  if (format === 'days') {
    return formatNumber(numeric, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }
  return formatNumber(numeric)
}

function RankingChart({
  data,
  operatorRow,
  metric,
  onMetricChange,
  order = 'DESC',
  onOrderChange = () => {},
  operatorName,
  comparisonLabel,
}) {
  const selectedMetric = rankingOptions.find((item) => item.id === metric) ?? rankingOptions[0]
  const orderDescription = order === 'ASC' ? 'Top 10 menores' : 'Top 10 maiores'
  const operatorInTop = data.some((row) => row.nome_operadora === operatorName)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Ranking de Operadoras</CardTitle>
          <p className="text-sm text-muted-foreground">
            {orderDescription} para o indicador escolhido. Comparando com {comparisonLabel?.toLowerCase?.() ?? 'a média definida'}.
          </p>
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
      <CardContent className="flex flex-1 flex-col space-y-3">
        <div className="flex-1 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Operadora</th>
                <th className="px-3 py-2 text-right">{selectedMetric.label}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => {
                const rank = row.rank_position ?? index + 1
                const isOperator = row.nome_operadora === operatorName
                return (
                  <tr key={`${row.nome_operadora}-${rank}`} className={cn('border-t', isOperator && 'bg-primary/5')}>
                    <td className="px-3 py-2 text-left text-xs text-muted-foreground">{rank ? `${rank}º` : '—'}</td>
                    <td className="px-3 py-2 text-left font-medium">{row.nome_operadora}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatValue(row.valor, selectedMetric.format)}</td>
                  </tr>
                )
              })}
              {!data.length ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhum dado disponível para os filtros selecionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {operatorRow && !operatorInTop ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{operatorRow.nome_operadora}</p>
            <p>
              Posição:{' '}
              <span className="font-semibold text-emerald-600">
                {operatorRow.rank_position ? `${operatorRow.rank_position}º` : '—'}
              </span>
              {' • '}
              Valor:{' '}
              <span className="font-semibold text-foreground">
                {formatValue(operatorRow.valor, selectedMetric.format)}
              </span>
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default RankingChart
