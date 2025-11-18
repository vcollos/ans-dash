import { useRef } from 'react'
import { Button } from '../ui/button'
import { Download } from 'lucide-react'
import { formatInteger } from '../../lib/utils'

function SummaryBadge({ label, value }) {
  return (
    <div className="flex min-w-[140px] shrink-0 flex-col rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold leading-tight">{value}</span>
    </div>
  )
}

function AppHeader({ tableData, sourceInfo, summary, onUploadDataset, isUploading, uploadFeedback }) {
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
      <div className="space-y-4 lg:max-w-[520px]">
        <div className="flex items-center gap-4">
          <img src="https://collos.com.br/wp-content/uploads/2024/12/logo_contag.png" alt="Contag" className="h-14 w-auto" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-tight">Painel Regulatório RN 518</h1>
            <p className="text-sm font-medium text-muted-foreground">DIOPS Financeiro</p>
            <p className="text-sm text-muted-foreground">
              Monitore solvência, liquidez e desempenho econômico com dados oficiais da ANS (DIOPS).
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 lg:items-end">
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <input ref={fileInputRef} type="file" accept=".csv,.parquet" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" size="sm" className="gap-2" onClick={handleUploadClick} disabled={isUploading}>
            <Download className={`h-4 w-4 rotate-180 ${isUploading ? 'animate-spin' : ''}`} /> {isUploading ? 'Importando...' : 'Atualizar arquivo'}
          </Button>
        </div>
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <SummaryBadge label="Operadoras selecionadas" value={operadorasValue} />
          <SummaryBadge label="Beneficiários (último período)" value={beneficiariosValue} />
        </div>
        {isUploading || uploadFeedback ? (
          <p className="text-xs text-muted-foreground">
            {isUploading ? 'Processando arquivo, aguarde alguns segundos…' : uploadFeedback?.message}
          </p>
        ) : null}
      </div>
    </header>
  )
}

export default AppHeader
