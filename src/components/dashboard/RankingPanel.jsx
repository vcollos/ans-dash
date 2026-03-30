import { useMemo, useState } from 'react'
import RankingChart from './RankingChart'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { UNIODONTO_INDICATOR_GROUPS, UNIODONTO_RANKING_METRICS } from '../../lib/uniodontoMetrics.js'

const monetaryRankingMetricGroups = [
  {
    label: 'Resultados',
    items: [
      { id: 'resultado_liquido_final_ans', label: 'Resultado líquido final (ANS)', format: 'currency', trend: 'higher' },
      { id: 'resultado_liquido', label: 'Resultado líquido', format: 'currency', trend: 'higher' },
      { id: 'resultado_financeiro', label: 'Resultado financeiro', format: 'currency', trend: 'higher' },
    ],
  },
  {
    label: 'Receitas (Classe 3)',
    items: [
      { id: 'vr_receitas', label: '3 – Receitas totais', format: 'currency', trend: 'higher' },
      { id: 'vr_contraprestacoes', label: '311 – Contraprestações', format: 'currency', trend: 'higher', indent: 1 },
      { id: 'vr_contraprestacoes_efetivas', label: '3111 – Contraprestações efetivas', format: 'currency', trend: 'higher', indent: 2 },
      { id: 'vr_contraprestacoes_pre', label: '311121 – Contraprestações (pré)', format: 'currency', trend: 'higher', indent: 3 },
      { id: 'vr_corresponsabilidade_cedida', label: '3117 – Corresponsabilidade cedida', format: 'currency', trend: 'lower', indent: 2 },
      { id: 'vr_eventos_liquidos', label: '41 – Eventos líquidos', format: 'currency', trend: 'lower', indent: 1 },
      { id: 'vr_eventos_a_liquidar', label: '2111 – Eventos a liquidar', format: 'currency', trend: 'lower', indent: 2 },
      { id: 'vr_outras_receitas_operacionais', label: '33 – Outras receitas operacionais', format: 'currency', trend: 'higher', indent: 1 },
      { id: 'vr_receitas_fin', label: '35 – Receitas financeiras', format: 'currency', trend: 'higher', indent: 1 },
      { id: 'vr_receitas_patrimoniais', label: '36 – Receitas patrimoniais', format: 'currency', trend: 'higher', indent: 1 },
    ],
  },
  {
    label: 'Despesas (Classe 4)',
    items: [
      { id: 'vr_despesas', label: '4 – Despesas totais', format: 'currency', trend: 'lower' },
      { id: 'vr_desp_comerciais', label: '43 – Despesas comerciais', format: 'currency', trend: 'lower', indent: 1 },
      { id: 'vr_desp_comerciais_promocoes', label: '464119113 – Promoções', format: 'currency', trend: 'lower', indent: 2 },
      { id: 'vr_desp_administrativas', label: '46 – Despesas administrativas', format: 'currency', trend: 'lower', indent: 1 },
      { id: 'vr_outras_desp_oper', label: '44 – Outras despesas operacionais', format: 'currency', trend: 'lower', indent: 1 },
      { id: 'vr_desp_tributos', label: '47 – Despesas tributárias', format: 'currency', trend: 'lower', indent: 1 },
      { id: 'vr_despesas_fin', label: '45 – Despesas financeiras', format: 'currency', trend: 'lower', indent: 1 },
    ],
  },
  {
    label: 'Balanço e solvência',
    items: [
      { id: 'vr_ativo_circulante', label: '12 – Ativo circulante', format: 'currency', trend: 'higher' },
      { id: 'vr_conta_1213', label: '1213 – Conta 1213', format: 'currency', trend: 'higher', indent: 1 },
      { id: 'vr_conta_1214', label: '1214 – Conta 1214', format: 'currency', trend: 'higher', indent: 1 },
      { id: 'vr_conta_122', label: '122 – Conta 122', format: 'currency', trend: 'higher', indent: 1 },
      { id: 'vr_creditos_operacoes_saude', label: '1231 – Créditos (op. saúde)', format: 'currency', trend: 'higher', indent: 1 },
      { id: 'vr_ativo_permanente', label: '13 – Ativo não circulante', format: 'currency', trend: 'higher' },
      { id: 'vr_passivo_circulante', label: '21 – Passivo circulante', format: 'currency', trend: 'lower' },
      { id: 'vr_passivo_nao_circulante', label: '23 – Passivo não circulante', format: 'currency', trend: 'lower' },
      { id: 'vr_patrimonio_liquido', label: '25 – Patrimônio líquido', format: 'currency', trend: 'higher' },
      { id: 'vr_ativos_garantidores', label: '31 – Ativos garantidores', format: 'currency', trend: 'higher' },
      { id: 'vr_provisoes_tecnicas', label: '32 – Provisões técnicas', format: 'currency', trend: 'lower' },
      { id: 'vr_pl_ajustado', label: '2521 – PL ajustado', format: 'currency', trend: 'higher' },
      { id: 'vr_margem_solvencia_exigida', label: '2522 – Margem solvência exigida', format: 'currency', trend: 'higher' },
      { id: 'vr_conta_61', label: '61 – Impostos/participações', format: 'currency', trend: 'lower' },
    ],
  },
]

const monetaryRankingMetrics = monetaryRankingMetricGroups.flatMap((group) => group.items)
const uniodontoMetricMap = Object.fromEntries(UNIODONTO_RANKING_METRICS.map((metric) => [metric.id, metric]))
const uniodontoRankingMetricGroups = UNIODONTO_INDICATOR_GROUPS.map((group) => ({
  label: group.label,
  items: (group.items ?? []).map((id) => uniodontoMetricMap[id]).filter(Boolean),
}))

function RankingPanel({
  indicatorRanking,
  indicatorMetric,
  onIndicatorMetricChange,
  operatorName,
  operatorRow,
  comparisonLabel,
  accessScopeDescription = null,
  onOperatorClick,
  monetaryRanking,
  monetaryMetric,
  onMonetaryMetricChange,
  monetaryOperatorRow,
  isUniodontoMode = false,
  uniodontoMetric,
  onUniodontoMetricChange,
}) {
  const [tab, setTab] = useState('indicadores')

  const tabDescription = useMemo(() => {
    if (tab === 'monetarios') {
      return 'Contas base usadas na formação dos indicadores (valores absolutos).'
    }
    if (isUniodontoMode) {
      return 'Indicadores exclusivos do sistema Uniodonto, sem relação com RN 518.'
    }
    return 'Indicadores (percentuais/razões) lado a lado.'
  }, [tab, isUniodontoMode])

  const indicatorMetrics = isUniodontoMode ? UNIODONTO_RANKING_METRICS : null
  const indicatorMetricGroups = isUniodontoMode ? uniodontoRankingMetricGroups : null
  const activeIndicatorMetric = isUniodontoMode ? uniodontoMetric : indicatorMetric
  const handleIndicatorMetricChange = isUniodontoMode ? onUniodontoMetricChange : onIndicatorMetricChange
  const indicatorTitle = isUniodontoMode ? 'Ranking Uniodonto' : 'Ranking de Operadoras'

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">Ranking</p>
            <p className="text-xs text-muted-foreground">{tabDescription}</p>
          </div>
          <TabsList className="w-fit">
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
            <TabsTrigger value="monetarios">Valores monetários</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="indicadores">
          <RankingChart
            data={indicatorRanking}
            operatorRow={operatorRow}
            operatorName={operatorName}
            comparisonLabel={comparisonLabel}
            accessScopeDescription={accessScopeDescription}
            metric={activeIndicatorMetric}
            onMetricChange={handleIndicatorMetricChange}
            metrics={indicatorMetrics}
            metricGroups={indicatorMetricGroups}
            title={indicatorTitle}
            onOperatorClick={onOperatorClick}
          />
        </TabsContent>
        <TabsContent value="monetarios">
          <RankingChart
            title="Ranking de Valores Monetários"
            subtitle="Escolha uma conta para ordenar e compare valores absolutos entre operadoras."
            metrics={monetaryRankingMetrics}
            metricGroups={monetaryRankingMetricGroups}
            data={monetaryRanking}
            operatorRow={monetaryOperatorRow}
            operatorName={operatorName}
            comparisonLabel={comparisonLabel}
            accessScopeDescription={accessScopeDescription}
            metric={monetaryMetric}
            onMetricChange={onMonetaryMetricChange}
            onOperatorClick={onOperatorClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RankingPanel
