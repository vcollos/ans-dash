import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { formatNumber } from '../../lib/utils'

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
  { key: 'vr_outras_receitas_operacionais', label: 'Outras receitas operacionais' },
  { key: 'vr_ativo_circulante', label: 'Ativo circulante' },
  { key: 'vr_ativo_permanente', label: 'Ativo permanente' },
  { key: 'vr_passivo_circulante', label: 'Passivo circulante' },
  { key: 'vr_passivo_nao_circulante', label: 'Passivo não circulante' },
  { key: 'vr_patrimonio_liquido', label: 'Patrimônio líquido' },
  { key: 'vr_ativos_garantidores', label: 'Ativos garantidores' },
  { key: 'vr_provisoes_tecnicas', label: 'Provisões técnicas' },
  { key: 'vr_pl_ajustado', label: 'PL ajustado' },
  { key: 'vr_margem_solvencia_exigida', label: 'Margem de solvência exigida' },
  { key: 'resultado_liquido', label: 'Resultado líquido' },
]

function MonetarySummary({ data, isLoading }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Valores monetários agregados</CardTitle>
        <CardDescription>Indicadores financeiros (R$) considerando os filtros ativos.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <tbody>
              {monetarySpec.map((metric) => {
                const rawValue = data?.[metric.key]
                const displayValue = isLoading
                  ? '...'
                  : formatNumber(rawValue, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                return (
                  <tr key={metric.key} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2 pr-4 font-medium text-muted-foreground align-top">{metric.label}</td>
                    <td className="py-2 text-right font-semibold">{displayValue}</td>
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
