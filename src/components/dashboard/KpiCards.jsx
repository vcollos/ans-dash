import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatNumber, formatPercent } from '../../lib/utils'

const metricSpec = [
  { key: 'sinistralidade', label: 'Sinistralidade média', formatter: (value) => formatPercent(value, 2) },
  { key: 'despesas_adm', label: 'Despesas administrativas (%)', formatter: (value) => formatPercent(value, 2) },
  { key: 'despesas_comerciais', label: 'Despesas comerciais (%)', formatter: (value) => formatPercent(value, 2) },
  { key: 'despesas_tributarias', label: 'Despesas tributárias (%)', formatter: (value) => formatPercent(value, 2) },
  { key: 'despesas_operacionais', label: 'Despesas operacionais (%)', formatter: (value) => formatPercent(value, 2) },
  {
    key: 'resultado_financeiro',
    label: 'Resultado financeiro (R$)',
    formatter: (value) => formatNumber(value, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  },
  { key: 'margem_lucro_liquido', label: 'Margem líquida (%)', formatter: (value) => formatPercent(value, 2) },
  {
    key: 'liquidez_corrente',
    label: 'Liquidez corrente (mediana)',
    formatter: (value) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  },
  {
    key: 'liquidez_seca',
    label: 'Liquidez seca (mediana)',
    formatter: (value) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  },
  { key: 'endividamento', label: 'Endividamento (%)', formatter: (value) => formatPercent(value, 2) },
  { key: 'imobilizacao_pl', label: 'Imobilização do PL (%)', formatter: (value) => formatPercent(value, 2) },
  { key: 'retorno_patrimonio_liquido', label: 'Retorno sobre PL (%)', formatter: (value) => formatPercent(value, 2) },
  {
    key: 'cobertura_provisoes',
    label: 'Cobertura de provisões',
    formatter: (value) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  },
  { key: 'margem_solvencia', label: 'Margem de solvência', formatter: (value) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  { key: 'pmcr', label: 'PMCR', formatter: (value) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  { key: 'pmpe', label: 'PMPE', formatter: (value) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
]

function KpiCards({ data, isLoading }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metricSpec.map((metric) => (
        <Card key={metric.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{isLoading ? '...' : metric.formatter(data?.[metric.key])}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default KpiCards
