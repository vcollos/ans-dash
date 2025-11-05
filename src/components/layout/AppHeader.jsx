import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Download, RefreshCcw } from 'lucide-react'
import ExportMenu from '../dashboard/ExportMenu'
import { formatInteger } from '../../lib/utils'

function SummaryBadge({ label, value }) {
  return (
    <div className="flex min-w-[160px] flex-col rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  )
}

function AppHeader({ onResetFilters, tableData, trendData, sourceInfo, summary }) {
  const operadorasValue = formatInteger(summary?.operadoras)
  const beneficiariosValue = formatInteger(summary?.beneficiarios)

  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Painel Regulatório RN 518</h1>
          <Badge variant="secondary">DIOPS Financeiro</Badge>
          {sourceInfo?.source ? <Badge variant="outline">Fonte: {sourceInfo.source.toUpperCase()}</Badge> : null}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Monitore solvência, liquidez e desempenho econômico das operadoras de saúde suplementar com base nos dados oficiais da ANS (DIOPS).
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" className="gap-2" onClick={onResetFilters}>
          <RefreshCcw className="h-4 w-4" /> Limpar filtros
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <SummaryBadge label="Operadoras selecionadas" value={operadorasValue} />
          <SummaryBadge label="Beneficiários (último período)" value={beneficiariosValue} />
        </div>
        <Separator orientation="vertical" className="hidden h-8 lg:block" />
        <ExportMenu tableData={tableData} trendData={trendData} />
        <Button variant="default" className="gap-2" onClick={() => window.print()}>
          <Download className="h-4 w-4" /> Exportar PDF
        </Button>
      </div>
    </header>
  )
}

export default AppHeader
