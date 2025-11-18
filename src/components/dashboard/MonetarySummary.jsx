import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { formatNumber, formatPercent, getVariationColor } from '../../lib/utils'

const monetarySpec = [
  { key: 'vr_receitas', label: '3 - Receitas' },
  { key: 'vr_despesas', label: '4 - Despesas' },
  { key: 'vr_contraprestacoes', label: '311 - Receitas de contraprestações' },
  { key: 'vr_contraprestacoes_efetivas', label: '3111 - Contraprestações efetivas' },
  { key: 'vr_corresponsabilidade_cedida', label: '3117 - Corresponsabilidade cedida' },
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

const specWithCodes = monetarySpec.map((metric, index) => ({
  ...metric,
  code: extractAccountCode(metric.label),
  order: index,
}))

const accountTree = (() => {
  const tree = buildAccountTree(specWithCodes)
  sortAccountNodes(tree)
  return tree
})()

function extractAccountCode(label) {
  const match = label.match(/^(\d[\d]*)\s*-/)
  return match ? match[1] : null
}

function buildAccountTree(spec) {
  const nodes = spec.map((metric) => ({
    ...metric,
    children: [],
  }))
  const codeMap = new Map()
  nodes.forEach((node) => {
    if (node.code) {
      codeMap.set(node.code, node)
    }
  })
  const roots = []
  nodes.forEach((node) => {
    if (!node.code) {
      roots.push(node)
      return
    }
    const parentCode = findParentCode(node.code, codeMap)
    if (parentCode) {
      codeMap.get(parentCode).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function findParentCode(code, codeMap) {
  for (let i = code.length - 1; i > 0; i -= 1) {
    const candidate = code.slice(0, i)
    if (codeMap.has(candidate)) {
      return candidate
    }
  }
  return null
}

function sortAccountNodes(nodes) {
  nodes.sort((a, b) => compareNodes(a, b))
  nodes.forEach((node) => {
    if (node.children.length) {
      sortAccountNodes(node.children)
    }
  })
}

function compareNodes(a, b) {
  if (a.code && b.code) {
    const lengthDiff = a.code.length - b.code.length
    if (lengthDiff !== 0) {
      return lengthDiff
    }
    return a.code.localeCompare(b.code, undefined, { numeric: true })
  }
  if (a.code) return -1
  if (b.code) return 1
  return a.order - b.order
}

function flattenTree(nodes, expandedNodes, depth = 0) {
  const rows = []
  nodes.forEach((node) => {
    rows.push({ node, depth })
    const nodeId = node.code ?? node.key
    if (node.children.length && expandedNodes.has(nodeId)) {
      rows.push(...flattenTree(node.children, expandedNodes, depth + 1))
    }
  })
  return rows
}

function computeVariation(current, previous) {
  if (current === null || current === undefined) return null
  if (previous === null || previous === undefined || previous === 0) return null
  const delta = ((current - previous) / Math.abs(previous)) * 100
  return Number.isFinite(delta) ? delta : null
}

function MonetarySummary({ data, isLoading, className }) {
  const [expandedNodes, setExpandedNodes] = useState(() => new Set())
  const previousPeriodLabel = data?.previousPeriod?.periodo ?? null
  const comparisonLabel = previousPeriodLabel ? `Variação vs ${previousPeriodLabel}` : 'Variação (YoY)'
  const rows = useMemo(() => flattenTree(accountTree, expandedNodes), [expandedNodes])

  const toggleNode = (nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

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
              {rows.map(({ node, depth }) => {
                const info = getMetricDisplays(node, data, isLoading)
                const nodeId = node.code ?? node.key
                const isExpandable = node.children.length > 0
                const isExpanded = isExpandable && expandedNodes.has(nodeId)
                return (
                  <tr key={node.key} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2 pr-4 align-top">
                      <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
                        {isExpandable ? (
                          <button
                            type="button"
                            onClick={() => toggleNode(nodeId)}
                            className="h-4 w-4 text-muted-foreground transition hover:text-foreground"
                            aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} ${node.label}`}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        ) : (
                          <span className="h-4 w-4" />
                        )}
                        <span className="font-medium text-muted-foreground">{node.label}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right font-semibold">{info.displayValue}</td>
                    <td className={`py-2 text-right text-sm font-semibold ${info.variationClass}`}>{info.variationDisplay}</td>
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

function getMetricDisplays(node, data, isLoading) {
  const rawValue = data?.[node.key]
  const previousValue = data?.previousPeriod?.[node.key]
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
  const variationClass =
    variationValue === null ? 'text-muted-foreground' : getVariationColor(node.label, variationDisplay)
  return { displayValue, variationDisplay, variationClass }
}
