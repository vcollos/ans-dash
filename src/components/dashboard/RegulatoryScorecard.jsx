import { AlertCircle, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Skeleton } from '../ui/skeleton'
import { cn, formatNumber, formatPercent } from '../../lib/utils'
import { REGULATORY_BASE_TEXT } from '../../lib/regulatoryScore'

const classificationColors = {
  ÓTIMA: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  BOA: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  REGULAR: 'bg-amber-50 text-amber-800 ring-amber-100',
  RUIM: 'bg-red-50 text-red-800 ring-red-100',
  'SEM DADO': 'bg-muted text-muted-foreground',
}

function GaugeBar({ value, min = 1, max = 4, steps = 8, className }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const filled = Math.round(ratio * steps)
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-[10px] text-muted-foreground">RUIM</span>
      <div className="flex gap-0.5">
        {Array.from({ length: steps }).map((_, index) => (
          <span
            key={index}
            className={cn(
              'h-2 w-3 rounded-sm',
              index < filled ? 'bg-emerald-500/80 shadow-sm' : 'bg-muted-foreground/30',
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">ÓTIMA</span>
    </div>
  )
}

function formatMetricValue(metric, digits = 1) {
  if (metric?.value === null || metric?.value === undefined) return '—'
  if (metric.format === 'percent') {
    return formatPercent(metric.value, digits)
  }
  if (metric.format === 'ratio') {
    return formatNumber(metric.value, { minimumFractionDigits: digits, maximumFractionDigits: digits })
  }
  if (metric.format === 'days') {
    return `${formatNumber(metric.value, { minimumFractionDigits: digits, maximumFractionDigits: digits })} d`
  }
  return formatNumber(metric.value, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function formatReference(format, value) {
  if (value === null || value === undefined) return '—'
  if (format === 'percent') return formatPercent(value, 1)
  if (format === 'ratio') return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (format === 'days') return `${formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} d`
  return formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function MetricRow({ metric }) {
  const badgeClass = classificationColors[metric.classification] ?? 'bg-muted text-muted-foreground'
  return (
    <div className="grid gap-3 rounded-md border px-3 py-3 text-sm md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
      <div>
        <p className="font-semibold leading-tight">{metric.label}</p>
        <p className="text-xs text-muted-foreground">
          {formatMetricValue(metric)} • Q1 {formatReference(metric.format, metric.percentiles.q1)} • Med{' '}
          {formatReference(metric.format, metric.percentiles.median)} • Q3 {formatReference(metric.format, metric.percentiles.q3)}
        </p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
        <Badge className={cn('w-fit', badgeClass)}>{metric.classification}</Badge>
        <GaugeBar value={metric.note} className="justify-start md:justify-end" />
      </div>
    </div>
  )
}

function ScoreSummary({ report, comparisonLabel }) {
  const badgeClass = classificationColors[report.finalScore.label] ?? 'bg-muted text-muted-foreground'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Período {report.operator.period} • {comparisonLabel} ({report.peerCount} pares)
        </p>
        <Badge className={badgeClass}>{report.finalScore.label}</Badge>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Score geral ponderado</p>
          <p className="text-3xl font-semibold">{report.finalScore.value ? report.finalScore.value.toFixed(2) : '—'}</p>
        </div>
        <GaugeBar value={report.finalScore.value ?? null} />
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-dashed p-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <p className="font-semibold text-foreground">{report.solvency.label}</p>
          <span className="text-xs text-muted-foreground">({report.solvency.classification})</span>
        </div>
        <GaugeBar value={report.solvency.value ?? null} />
        <p className="text-xs text-muted-foreground">
          Média das notas para cobertura de provisões, PMPE e PMCR ({report.solvency.value ? report.solvency.value.toFixed(2) : '—'})
        </p>
      </div>
    </div>
  )
}

function Explanation({ report }) {
  const highlights = report.metrics.filter((metric) => metric.note === 4).map((metric) => metric.label)
  const weaknesses = report.metrics.filter((metric) => metric.note === 1).map((metric) => metric.label)
  const comments = []
  if (highlights.length) {
    comments.push(`Acima do Q3: ${highlights.join(', ')}.`)
  }
  if (weaknesses.length) {
    comments.push(`Abaixo do Q1: ${weaknesses.join(', ')}.`)
  }
  comments.push(
    `Solvência: ${report.solvency.classification} (LC ${formatMetricValue(report.metrics.find((m) => m.id === 'liquidez_corrente'))}, bloco ${report.solvency.classification}).`,
  )
  comments.push(`Desempenho operacional: ${report.finalScore.label} (resultado operacional e margem líquida considerados nos pesos regulatórios).`)
  return (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">Explicação técnica</p>
      <p>{comments.join(' ')}</p>
      <p className="text-muted-foreground">{REGULATORY_BASE_TEXT}</p>
    </div>
  )
}

export default function RegulatoryScorecard({ report, isLoading, error, comparisonLabel, operatorName }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Score regulatório (RN 518/630)</CardTitle>
        <CardDescription>
          {operatorName ? `Indicadores da operadora comparados ao grupo filtrado (${comparisonLabel}).` : 'Selecione uma operadora para habilitar os insights regulatórios.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Não foi possível calcular o score regulatório.</p>
          </div>
        ) : !operatorName ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Escolha uma operadora no painel de filtros para comparar os indicadores com os pares selecionados.
          </div>
        ) : !report ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Nenhum dado disponível para o período selecionado.
          </div>
        ) : (
          <>
            <ScoreSummary report={report} comparisonLabel={comparisonLabel} />
            <Separator />
            <Explanation report={report} />
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-semibold">Indicadores avaliados</p>
              <div className="space-y-3">
                {report.metrics.map((metric) => (
                  <MetricRow key={metric.id} metric={metric} />
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
