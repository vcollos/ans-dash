import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { formatNumber, formatPercent, getVariationColor } from '../../lib/utils'

const monetarySpec = [
  { key: 'vr_contraprestacoes', label: 'Receitas de contraprestações' },
  { key: 'vr_contraprestacoes_pre', label: 'Receitas de contraprestações (pré)' },
  { key: 'vr_creditos_operacoes_saude', label: 'Créditos de operações de saúde' },
  { key: 'vr_eventos_liquidos', label: 'Eventos assistenciais líquidos' },
  { key: 'vr_eventos_a_liquidar', label: 'Eventos a liquidar' },
  { key: 'vr_desp_comerciais', label: 'Despesas comerciais' },
  { key: 'vr_desp_comerciais_promocoes', label: 'Despesas comerciais com promoções' },
  { key: 'vr_desp_administrativas', label: 'Despesas administrativas' },
  { key: 'vr_outras_desp_oper', label: 'Outras despesas operacionais' },
  { key: 'vr_desp_tributos', label: 'Despesas com tributos' },
  { key: 'vr_receitas_fin', label: 'Receitas financeiras' },
  { key: 'vr_despesas_fin', label: 'Despesas financeiras' },
  { key: 'resultado_financeiro', label: 'Resultado financeiro' },
  { key: 'resultado_liquido', label: 'Resultado líquido' },
]

function computeVariation(current, previous) {
  if (current === null || current === undefined) return null
  if (previous === null || previous === undefined || previous === 0) return null
  const delta = ((current - previous) / Math.abs(previous)) * 100
  return Number.isFinite(delta) ? delta : null
}

function MonetarySummary({ data, isLoading, className }) {
  const previousPeriodLabel = data?.previousPeriod?.periodo ?? null
  const comparisonLabel = previousPeriodLabel ? `Variação vs ${previousPeriodLabel}` : 'Variação (YoY)'

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Valores monetários agregados</CardTitle>
        <CardDescription>
          Indicadores financeiros (R$) considerando os filtros ativos. A coluna de variação compara com o mesmo período do ano anterior quando disponível.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 text-left">Indicador</th>
                <th className="py-2 pr-4 text-right">Valor</th>
                <th className="py-2 text-right">{comparisonLabel}</th>
              </tr>
            </thead>
            <tbody>
              {monetarySpec.map((metric) => {
                const rawValue = data?.[metric.key]
                const previousValue = data?.previousPeriod?.[metric.key]
                const displayValue = isLoading
                  ? '...'
                  : formatNumber(rawValue, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                const variationValue = isLoading ? null : computeVariation(rawValue, previousValue)
                const variationDisplay =
                  isLoading || variationValue === null
                    ? isLoading
                      ? '...'
                      : '—'
                    : `${variationValue > 0 ? '+' : ''}${formatPercent(variationValue, 2)}`
                const variationClass = variationValue === null ? 'text-muted-foreground' : getVariationColor(metric.label, variationDisplay)
                return (
                  <tr key={metric.key} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2 pr-4 font-medium text-muted-foreground align-top">{metric.label}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{displayValue}</td>
                    <td className={`py-2 text-right text-sm font-semibold ${variationClass}`}>{variationDisplay}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default MonetarySummary
