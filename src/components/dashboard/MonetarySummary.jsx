import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { monetaryIndicatorTree, monetaryIndicators } from '../../lib/monetaryIndicators'
import { cn, formatNumber, formatPercent, getVariationColor } from '../../lib/utils'

const indicatorMap = Object.fromEntries(monetaryIndicators.map((indicator) => [indicator.column, indicator]))

function getValueDisplay(value, isLoading) {
  if (isLoading) return '...'
  if (value === null || value === undefined) return '—'
  return formatNumber(value, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getDeltaDisplay(delta, isLoading) {
  if (isLoading) {
    return { label: '...', Icon: null }
  }
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return { label: '—', Icon: null }
  }
  const safeValue = Number(delta)
  if (!Number.isFinite(safeValue) || Math.abs(safeValue) < 0.00001) {
    return { label: formatPercent(0, 2), Icon: Minus }
  }
  const isPositive = safeValue > 0
  const label = `${isPositive ? '+' : ''}${formatPercent(safeValue, 2)}`
  return { label, Icon: isPositive ? ArrowUpRight : ArrowDownRight }
}

function VariationCell({ indicatorLabel, deltaValue, previousValue, isLoading }) {
  const { label: deltaLabel, Icon } = getDeltaDisplay(deltaValue, isLoading)
  const colorClass = getVariationColor(indicatorLabel, deltaLabel)
  const previousDisplay = getValueDisplay(previousValue, isLoading)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center justify-end gap-1 font-semibold', colorClass)}>
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {deltaLabel}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{`Período anterior: ${previousDisplay}`}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function RowContent({ label, indent = 0, value, previousValue, deltaValue, isLoading, showCaret = false }) {
  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_140px_140px] items-center gap-4 py-3 text-left">
      <div className="flex min-w-0 items-center gap-2">
        {showCaret ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition duration-200 group-data-[state=open]:rotate-180" />
        ) : null}
        <span className="font-medium text-muted-foreground" style={{ paddingLeft: indent * 12 }}>
          {label}
        </span>
      </div>
      <div className="text-right font-semibold">{getValueDisplay(value, isLoading)}</div>
      <div className="flex items-center justify-end">
        <VariationCell indicatorLabel={label} deltaValue={deltaValue} previousValue={previousValue} isLoading={isLoading} />
      </div>
    </div>
  )
}

function MonetarySummary({ summary, isLoading, className }) {
  const values = summary?.values ?? {}
  const previousValues = summary?.previousValues ?? {}
  const deltas = summary?.deltas ?? {}
  const periodLabel = summary?.period?.label ?? null
  const comparisonLabel = 'Variação'

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Valores monetários agregados</CardTitle>
        <CardDescription>
          {periodLabel
            ? `Base ${periodLabel}. Valores consolidados com filtros ativos.`
            : 'Valores consolidados com filtros ativos.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={200}>
          <div className="rounded-md border border-border/60">
            <div className="grid grid-cols-[minmax(0,1fr)_140px_140px] items-center gap-4 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Indicador</span>
              <span className="text-right">Valor (R$)</span>
              <span className="text-right">{comparisonLabel}</span>
            </div>
            <HierarchyAccordion
              nodes={monetaryIndicatorTree}
              values={values}
              previousValues={previousValues}
              deltas={deltas}
              isLoading={isLoading}
            />
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

function HierarchyAccordion({ nodes, level = 0, values, previousValues, deltas, isLoading }) {
  if (!nodes?.length) return null
  const defaultOpen = level === 0 ? ['group_resultado'] : []
  return (
    <Accordion
      type="multiple"
      collapsible
      defaultValue={defaultOpen}
      className={level === 0 ? 'divide-y divide-border/60' : 'pl-4'}
    >
      {nodes.map((node) => (
        <HierarchyNode
          key={node.id ?? node.column}
          node={node}
          level={level}
          values={values}
          previousValues={previousValues}
          deltas={deltas}
          isLoading={isLoading}
        />
      ))}
    </Accordion>
  )
}

function HierarchyNode({ node, level, values, previousValues, deltas, isLoading }) {
  const indicator = indicatorMap[node.column]
  if (!indicator) return null
  const label = node.label ?? indicator.label
  const hasChildren = Array.isArray(node.children) && node.children.length > 0
  const value = values?.[indicator.column] ?? null
  const previousValue = previousValues?.[indicator.column] ?? null
  const deltaValue = deltas?.[indicator.column] ?? null

  if (hasChildren) {
    return (
      <AccordionItem value={node.id ?? node.column} className="border-b border-border/60 last:border-b-0">
        <AccordionTrigger className="group px-4 py-0 text-left hover:no-underline">
          <RowContent
            label={label}
            indent={level}
            value={value}
            previousValue={previousValue}
            deltaValue={deltaValue}
            isLoading={isLoading}
            showCaret
          />
        </AccordionTrigger>
        <AccordionContent className="px-0 pb-0">
          <HierarchyAccordion
            nodes={node.children}
            level={level + 1}
            values={values}
            previousValues={previousValues}
            deltas={deltas}
            isLoading={isLoading}
          />
        </AccordionContent>
      </AccordionItem>
    )
  }

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <RowContent
        label={label}
        indent={level}
        value={value}
        previousValue={previousValue}
        deltaValue={deltaValue}
        isLoading={isLoading}
      />
    </div>
  )
}

export default MonetarySummary
