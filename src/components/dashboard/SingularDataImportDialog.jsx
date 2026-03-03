import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '../../lib/auth'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'

const REQUIRED_FIELDS = ['competencia', 'reg_ans', 'cd_conta_contabil', 'vl_saldo_final']
const ALLOWED_FIELDS = [
  'competencia',
  'reg_ans',
  'cnpj',
  'cd_conta_contabil',
  'vl_saldo_final',
  'descricao',
  'vl_saldo_inicial',
  'vl_debitos',
  'vl_creditos',
  'moeda',
  'status_fechamento',
  'tipo_envio',
  'versao_envio',
  'dt_envio',
  'sistema_origem',
  'responsavel_nome',
  'responsavel_email',
  'qt_beneficiarios',
  'qt_prestadores',
  'modalidade',
  'porte',
  'observacoes',
]

function normalizeHeaderName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toNullableString(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeInputRow(rawRow = {}) {
  const mapped = {}
  Object.entries(rawRow).forEach(([key, value]) => {
    const normalizedKey = normalizeHeaderName(key)
    if (!normalizedKey || !ALLOWED_FIELDS.includes(normalizedKey)) return
    mapped[normalizedKey] = value
  })
  return mapped
}

function hasAnyValue(row = {}) {
  return Object.values(row).some((value) => toNullableString(value) !== '')
}

async function readSpreadsheetRows(file) {
  const buffer = await file.arrayBuffer()
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames?.[0]
  if (!sheetName) return []
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
}

async function downloadCsv(endpoint, fallbackFileName) {
  const response = await fetchWithAuth(endpoint)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.error ?? 'Falha ao baixar o template.')
  }
  const contentDisposition = response.headers.get('content-disposition') ?? ''
  const suggestedFileName = contentDisposition.match(/filename="([^"]+)"/i)?.[1] ?? fallbackFileName
  const blob = await response.blob()
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = suggestedFileName
  anchor.click()
  URL.revokeObjectURL(href)
}

export default function SingularDataImportDialog({
  open,
  onOpenChange,
  operatorName,
  operatorRegAns,
  onUploadSuccess,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [parseError, setParseError] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const isSingularOperator = useMemo(() => /\bsingular\b/i.test(String(operatorName ?? '')), [operatorName])
  const canSubmit = parsedRows.length > 0 && !isSubmitting && isSingularOperator

  async function handleTemplateDownload(kind) {
    setIsDownloadingTemplate(true)
    setParseError(null)
    try {
      const endpoint =
        kind === 'exemplo' ? '/api/import/demonstracoes/exemplo.csv' : '/api/import/demonstracoes/template.csv'
      const fallbackFileName =
        kind === 'exemplo' ? 'demonstracoes_contabeis_exemplo.csv' : 'demonstracoes_contabeis_template.csv'
      await downloadCsv(endpoint, fallbackFileName)
    } catch (err) {
      setParseError(err?.message ?? 'Falha ao baixar o arquivo de referência.')
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setUploadResult(null)
    setParseError(null)
    setParsedRows([])

    if (!file) return

    setIsParsing(true)
    try {
      const rows = await readSpreadsheetRows(file)
      if (!rows.length) {
        throw new Error('O arquivo está vazio.')
      }

      const unknownColumns = new Set()
      rows.forEach((rawRow) => {
        Object.keys(rawRow).forEach((key) => {
          const normalized = normalizeHeaderName(key)
          if (normalized && !ALLOWED_FIELDS.includes(normalized)) {
            unknownColumns.add(normalized)
          }
        })
      })
      if (unknownColumns.size) {
        throw new Error(`Colunas não suportadas: ${[...unknownColumns].slice(0, 20).join(', ')}`)
      }

      const normalizedRows = rows.map(normalizeInputRow).filter(hasAnyValue)
      if (!normalizedRows.length) {
        throw new Error('Nenhuma linha válida foi encontrada no arquivo.')
      }

      const missingRequiredFields = REQUIRED_FIELDS.filter((field) =>
        normalizedRows.every((row) => toNullableString(row[field]) === ''),
      )
      if (missingRequiredFields.length) {
        throw new Error(`Campos obrigatórios ausentes: ${missingRequiredFields.join(', ')}`)
      }

      setParsedRows(normalizedRows)
    } catch (err) {
      setParseError(err?.message ?? 'Falha ao ler o arquivo.')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !selectedFile) return
    setIsSubmitting(true)
    setParseError(null)
    setUploadResult(null)
    try {
      const response = await fetchWithAuth('/api/import/singular-demonstracoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorName,
          operatorRegAns: operatorRegAns ? String(operatorRegAns) : null,
          fileName: selectedFile.name,
          rows: parsedRows,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Falha ao enviar o arquivo.')
      }
      setUploadResult(payload)
      if (typeof onUploadSuccess === 'function') {
        onUploadSuccess(payload)
      }
    } catch (err) {
      setParseError(err?.message ?? 'Falha ao importar os dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenChange(nextOpen) {
    onOpenChange(nextOpen)
    if (nextOpen) return
    setSelectedFile(null)
    setParsedRows([])
    setParseError(null)
    setUploadResult(null)
    setIsParsing(false)
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualize seus dados</DialogTitle>
          <DialogDescription>
            Faça upload das demonstrações contábeis da operadora selecionada em tabela auxiliar (sem alterar a base ANS).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-sm">
            <p>
              <strong>Operadora:</strong> {operatorName ?? 'Não selecionada'}
            </p>
            <p>
              <strong>Registro ANS:</strong> {operatorRegAns ?? 'Não informado'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTemplateDownload('template')}
              disabled={isDownloadingTemplate}
            >
              {isDownloadingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Baixar template CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTemplateDownload('exemplo')}
              disabled={isDownloadingTemplate}
            >
              {isDownloadingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Baixar exemplo CSV
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="singular-file-input" className="text-sm font-medium">
              Arquivo de importação (CSV/XLS/XLSX)
            </label>
            <Input
              id="singular-file-input"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              disabled={!isSingularOperator || isParsing || isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Campos obrigatórios: <code>competencia</code>, <code>reg_ans</code>, <code>cd_conta_contabil</code>,{' '}
              <code>vl_saldo_final</code>.
            </p>
          </div>

          {isParsing ? (
            <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lendo arquivo...
            </div>
          ) : null}

          {parseError ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{parseError}</span>
            </div>
          ) : null}

          {parsedRows.length ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
              <FileUp className="mt-0.5 h-4 w-4" />
              <span>
                {parsedRows.length} linha(s) pronta(s) para envio. Arquivo: <strong>{selectedFile?.name}</strong>
              </span>
            </div>
          ) : null}

          {uploadResult?.success ? (
            <div className="space-y-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Upload concluído com sucesso.</span>
              </div>
              <p>
                <strong>Upload ID:</strong> {uploadResult.uploadId}
              </p>
              <p>
                <strong>Linhas inseridas:</strong> {uploadResult.insertedRows}
              </p>
              <p>
                <strong>Tabela auxiliar:</strong> {uploadResult.auxTable}
              </p>
              <p>
                <strong>View auxiliar:</strong> {uploadResult.latestView}
              </p>
              {uploadResult.warning ? <p className="text-amber-700">Aviso: {uploadResult.warning}</p> : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Fechar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            Enviar dados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
