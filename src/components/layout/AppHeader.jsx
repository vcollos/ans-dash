import { useRef } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { RefreshCcw, Download } from 'lucide-react'
import ExportMenu from '../dashboard/ExportMenu'
import { formatInteger } from '../../lib/utils'

function SummaryBadge({ label, value }) {
  return (
    <div className="flex min-w-[140px] shrink-0 flex-col rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold leading-tight">{value}</span>
    </div>
  )
}

function AppHeader({
  onResetFilters,
  tableData,
  sourceInfo,
  summary,
  operatorName,
  operatorContext,
  onUploadDataset,
  isUploading,
  uploadFeedback,
}) {
  const operadorasValue = formatInteger(summary?.operadoras)
  const beneficiariosValue = formatInteger(summary?.beneficiarios)
  const fileInputRef = useRef(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file && onUploadDataset) {
      onUploadDataset(file)
    }
    event.target.value = ''
  }

  return (
    <header className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="space-y-2 lg:max-w-[520px]">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold leading-tight">Painel Regulatório RN 518</h1>
          <Badge variant="secondary" className="text-xs">
            DIOPS Financeiro
          </Badge>
          {sourceInfo?.source ? (
            <Badge variant="outline" className="text-xs">
              Fonte: {sourceInfo.source.toUpperCase()}
            </Badge>
          ) : null}
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Monitore solvência, liquidez e desempenho econômico das operadoras de saúde suplementar com base nos dados oficiais da ANS (DIOPS).</p>
          {operatorName ? (
            <p className="text-xs">
              Destaques para <span className="font-semibold text-foreground">{operatorName}</span>
              {operatorContext?.modalidade ? ` (${operatorContext.modalidade})` : ''}
              {operatorContext?.porte ? ` • Porte ${operatorContext.porte}` : ''}.
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 lg:items-end">
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <Button variant="ghost" size="sm" className="gap-2" onClick={onResetFilters}>
            <RefreshCcw className="h-4 w-4" /> Limpar filtros
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" size="sm" className="gap-2" onClick={handleUploadClick} disabled={isUploading}>
            <Download className={`h-4 w-4 rotate-180 ${isUploading ? 'animate-spin' : ''}`} /> {isUploading ? 'Importando...' : 'Atualizar CSV'}
          </Button>
          <ExportMenu tableData={tableData} />
          <Button variant="default" size="sm" className="gap-2" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <SummaryBadge label="Operadoras selecionadas" value={operadorasValue} />
          <SummaryBadge label="Beneficiários (último período)" value={beneficiariosValue} />
        </div>
        {isUploading || uploadFeedback ? (
          <p className="text-xs text-muted-foreground">
            {isUploading ? 'Processando CSV, aguarde alguns segundos…' : uploadFeedback?.message}
          </p>
        ) : null}
      </div>
    </header>
  )
}

export default AppHeader
