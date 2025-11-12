import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { formatNumber, formatPercent, getVariationColor } from '../../lib/utils'

const monetarySpec = [
  { key: 'vr_receitas', label: '3 - Receitas' },
  { key: 'vr_despesas', label: '4 - Despesas' },
  { key: 'vr_contraprestacoes', label: '311 - Receitas de contraprestações' },
  { key: 'vr_contraprestacoes_pre', label: '311121 - Receitas de contraprestações (pré)' },
  { key: 'vr_creditos_operacoes_saude', label: '1231 - Créditos de operações de saúde' },
  { key: 'vr_eventos_liquidos', label: '41 - Eventos assistenciais líquidos' },
  { key: 'vr_eventos_a_liquidar', label: '2111 - Eventos a liquidar' },
  { key: 'vr_desp_comerciais', label: '43 - Despesas comerciais' },
  { key: 'vr_desp_comerciais_promocoes', label: '464119113 - Despesas comerciais com promoções' },
  { key: 'vr_desp_administrativas', label: '46 - Despesas administrativas' },
  { key: 'vr_outras_desp_oper', label: '44 - Outras despesas operacionais' },
  { key: 'vr_desp_tributos', label: '47 - Despesas com tributos' },
  { key: 'vr_receitas_fin', label: '35 - Receitas financeiras' },
  { key: 'vr_receitas_patrimoniais', label: '36 - Receitas patrimoniais' },
  { key: 'vr_despesas_fin', label: '45 - Despesas financeiras' },
  { key: 'vr_outras_receitas_operacionais', label: '33 - Outras receitas operacionais' },
  { key: 'vr_ativo_circulante', label: '12 - Ativo circulante' },
  { key: 'vr_ativo_permanente', label: '13 - Ativo permanente' },
  { key: 'vr_passivo_circulante', label: '21 - Passivo circulante' },
  { key: 'vr_passivo_nao_circulante', label: '23 - Passivo não circulante' },
  { key: 'vr_patrimonio_liquido', label: '25 - Patrimônio líquido' },
  { key: 'vr_ativos_garantidores', label: '31 - Ativos garantidores' },
  { key: 'vr_provisoes_tecnicas', label: '32 - Provisões técnicas' },
  { key: 'vr_pl_ajustado', label: '2521 - PL ajustado' },
  { key: 'vr_margem_solvencia_exigida', label: '2522 - Margem de solvência exigida' },
  { key: 'vr_conta_61', label: '61 - Ajustes adicionais (ANS)' },
  { key: 'resultado_financeiro', label: 'Resultado financeiro' },
  { key: 'resultado_liquido_calculado', label: 'Resultado líquido (cálculo ANS)' },
  { key: 'resultado_liquido_final_ans', label: 'Resultado líquido final (ANS)' },
  { key: 'resultado_liquido_informado', label: 'Resultado líquido (informado)' },
  { key: 'resultado_liquido', label: 'Resultado líquido (em uso)' },
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
