import { useCallback } from 'react'
import { Download, FileJson } from 'lucide-react'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { downloadCsv, downloadJson } from '../../lib/export'

function ExportMenu({ tableData }) {
  const handleCsv = useCallback(() => {
    downloadCsv(tableData)
  }, [tableData])

  const handleTableJson = useCallback(() => {
    downloadJson(tableData.rows, 'dados_tabela.json')
  }, [tableData])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleCsv}>
          <Download className="h-4 w-4" />
          Download CSV (tabela)
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleTableJson}>
          <FileJson className="h-4 w-4" />
          Exportar JSON (tabela)
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export default ExportMenu
