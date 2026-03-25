import { useEffect, useMemo, useState } from 'react'
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
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'

const REQUIRED_FIELDS = ['cd_conta_contabil', 'vl_saldo_final']
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
const HEADER_ALIASES = {
  codigo: 'cd_conta_contabil',
  codigo_da_conta: 'cd_conta_contabil',
  codigo_conta: 'cd_conta_contabil',
  classificacao: 'cd_conta_contabil',
  classificacao_da_conta: 'cd_conta_contabil',
  classificacao_contabil: 'cd_conta_contabil',
  codigo_contabil: 'cd_conta_contabil',
  conta_contabil: 'cd_conta_contabil',
  conta: 'cd_conta_contabil',
  conta_codigo: 'cd_conta_contabil',
  descricao: 'descricao',
  descricao_da_conta: 'descricao',
  descricao_conta: 'descricao',
  conta_descricao: 'descricao',
  saldo_inicial: 'vl_saldo_inicial',
  saldo_anterior: 'vl_saldo_inicial',
  saldo_abertura: 'vl_saldo_inicial',
  debito: 'vl_debitos',
  debitos: 'vl_debitos',
  valor_debito: 'vl_debitos',
  credito: 'vl_creditos',
  creditos: 'vl_creditos',
  valor_credito: 'vl_creditos',
  saldo_final: 'vl_saldo_final',
  saldo_atual: 'vl_saldo_final',
  saldo_encerramento: 'vl_saldo_final',
}
const DEFAULT_MODALIDADE = 'Cooperativa odontológica'
const MODALIDADE_OPTIONS = [
  'Cooperativa odontológica',
  'Odontologia de Grupo',
  'Autogestão',
  'Medicina de Grupo',
  'Seguradora Especializada em Saúde',
  'Filantropia',
  'Administradora de Benefícios',
  'Outra',
]

function normalizeHeaderName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeRegAns(value) {
  return String(value ?? '')
    .trim()
    .replace(/\D+/g, '')
}

function normalizeDigits(value) {
  return String(value ?? '')
    .trim()
    .replace(/\D+/g, '')
}

function toNullableString(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function getCurrentCompetencia() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function computePorteFromBeneficiarios(value) {
  const text = toNullableString(value)
  if (!text) return ''
  const numeric = Number(String(text).replace(/[^\d-]/g, ''))
  if (!Number.isFinite(numeric)) return ''
  if (numeric <= 19999) return 'Pequeno Porte'
  if (numeric <= 99999) return 'Médio Porte'
  return 'Grande Porte'
}

function createDefaultBatchForm(userEmail = '') {
  return {
    competencia: getCurrentCompetencia(),
    cnpj: '',
    versao_envio: '1',
    sistema_origem: 'UPLOAD_MANUAL',
    responsavel_nome: '',
    responsavel_email: toNullableString(userEmail),
    qt_beneficiarios: '',
    qt_prestadores: '',
    modalidade: DEFAULT_MODALIDADE,
    porte: '',
    observacoes: '',
  }
}

function normalizeInputRow(rawRow = {}) {
  const mapped = {}
  Object.entries(rawRow).forEach(([key, value]) => {
    const normalizedKey = resolveInputFieldName(key)
    if (!normalizedKey || !ALLOWED_FIELDS.includes(normalizedKey)) return
    mapped[normalizedKey] = value
  })
  return mapped
}

function resolveInputFieldName(value) {
  const normalized = normalizeHeaderName(value)
  if (!normalized) return ''
  return HEADER_ALIASES[normalized] ?? normalized
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

function normalizeOperatorList(values = []) {
  const map = new Map()
  values.forEach((item) => {
    const regAns = normalizeRegAns(item?.regAns)
    if (!regAns) return
    const current = map.get(regAns)
    const next = {
      regAns,
      operatorName: String(item?.operatorName ?? '').trim() || null,
      canUpload: item?.canUpload === false ? false : true,
    }
    if (!current) {
      map.set(regAns, next)
      return
    }
    map.set(regAns, {
      regAns,
      operatorName: current.operatorName ?? next.operatorName,
      canUpload: current.canUpload || next.canUpload,
    })
  })
  return [...map.values()].sort((a, b) => {
    const aLabel = a.operatorName ?? a.regAns
    const bLabel = b.operatorName ?? b.regAns
    return aLabel.localeCompare(bLabel)
  })
}

export default function OperadoraDataImportDialog({
  open,
  onOpenChange,
  allowedOperators = [],
  defaultOperatorName = null,
  defaultOperatorRegAns = null,
  userEmail = '',
  onUploadSuccess,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedRegAns, setSelectedRegAns] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [parseError, setParseError] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [isLoadingOperatorContext, setIsLoadingOperatorContext] = useState(false)
  const [batchForm, setBatchForm] = useState(() => createDefaultBatchForm(userEmail))

  const uploadOperators = useMemo(() => normalizeOperatorList(allowedOperators).filter((item) => item.canUpload), [allowedOperators])
  const selectedOperator = useMemo(
    () => uploadOperators.find((item) => item.regAns === selectedRegAns) ?? null,
    [selectedRegAns, uploadOperators],
  )
  const canSubmit = parsedRows.length > 0 && !isSubmitting && !isLoadingOperatorContext && Boolean(selectedOperator) && Boolean(toNullableString(batchForm.competencia))

  useEffect(() => {
    if (!open) return
    if (!uploadOperators.length) {
      setSelectedRegAns('')
      return
    }
    const normalizedDefaultRegAns = normalizeRegAns(defaultOperatorRegAns)
    const byRegAns = uploadOperators.find((item) => item.regAns === normalizedDefaultRegAns)
    const normalizedDefaultName = String(defaultOperatorName ?? '').trim().toLowerCase()
    const byName = uploadOperators.find((item) => String(item.operatorName ?? '').trim().toLowerCase() === normalizedDefaultName)
    const preferred = byRegAns?.regAns ?? byName?.regAns ?? uploadOperators[0]?.regAns ?? ''
    setSelectedRegAns((current) => {
      if (current && uploadOperators.some((item) => item.regAns === current)) return current
      return preferred
    })
  }, [defaultOperatorName, defaultOperatorRegAns, open, uploadOperators])

  useEffect(() => {
    setBatchForm((current) => ({
      ...createDefaultBatchForm(userEmail),
      ...current,
      responsavel_email: toNullableString(current.responsavel_email) || toNullableString(userEmail),
    }))
  }, [userEmail])

  useEffect(() => {
    if (!open || !selectedRegAns) return
    let cancelled = false
    setIsLoadingOperatorContext(true)
    setParseError(null)
    fetchWithAuth(`/api/import/operadora-demonstracoes/context?reg_ans=${selectedRegAns}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Falha ao carregar dados da operadora.')
        }
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        setBatchForm((current) => ({
          ...current,
          cnpj: toNullableString(payload?.cnpj) || current.cnpj,
          versao_envio: toNullableString(payload?.versaoEnvio) || current.versao_envio || '1',
          modalidade: toNullableString(payload?.modalidade) || current.modalidade || DEFAULT_MODALIDADE,
          responsavel_email:
            toNullableString(current.responsavel_email) ||
            toNullableString(payload?.responsavelEmail) ||
            toNullableString(userEmail),
          porte: computePorteFromBeneficiarios(current.qt_beneficiarios) || current.porte,
        }))
      })
      .catch((err) => {
        if (cancelled) return
        setParseError(err?.message ?? 'Falha ao carregar contexto da operadora.')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoadingOperatorContext(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, selectedRegAns, userEmail])

  async function handleTemplateDownload(kind) {
    setIsDownloadingTemplate(true)
    setParseError(null)
    try {
      const endpoint = kind === 'exemplo' ? '/api/import/demonstracoes/exemplo.csv' : '/api/import/demonstracoes/template.csv'
      const fallbackFileName = kind === 'exemplo' ? 'demonstracoes_contabeis_exemplo.csv' : 'demonstracoes_contabeis_template.csv'
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
          const normalized = resolveInputFieldName(key)
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

      const missingRequiredFields = REQUIRED_FIELDS.filter((field) => normalizedRows.every((row) => toNullableString(row[field]) === ''))
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
    if (!canSubmit || !selectedFile || !selectedOperator) return
    setIsSubmitting(true)
    setParseError(null)
    setUploadResult(null)
    try {
      const response = await fetchWithAuth('/api/import/operadora-demonstracoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorName: selectedOperator.operatorName ?? selectedOperator.regAns,
          operatorRegAns: selectedOperator.regAns,
          fileName: selectedFile.name,
          metadata: {
            competencia: batchForm.competencia,
            cnpj: batchForm.cnpj,
            versao_envio: batchForm.versao_envio,
            sistema_origem: batchForm.sistema_origem,
            responsavel_nome: batchForm.responsavel_nome,
            responsavel_email: batchForm.responsavel_email,
            qt_beneficiarios: batchForm.qt_beneficiarios,
            qt_prestadores: batchForm.qt_prestadores,
            modalidade: batchForm.modalidade,
            porte: batchForm.porte,
            observacoes: batchForm.observacoes,
          },
          rows: parsedRows,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detailMessage = Array.isArray(payload?.details) && payload.details.length
          ? ` ${payload.details
              .slice(0, 3)
              .map((item) => `Linha ${item.row}: ${item.message}`)
              .join(' | ')}`
          : ''
        throw new Error(`${payload?.error ?? 'Falha ao enviar o arquivo.'}${detailMessage}`)
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
    setIsLoadingOperatorContext(false)
    setBatchForm(createDefaultBatchForm(userEmail))
  }

  function updateBatchForm(field, value) {
    setBatchForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'qt_beneficiarios' ? { porte: computePorteFromBeneficiarios(value) } : null),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualize seus dados</DialogTitle>
          <DialogDescription>
            Envie demonstrações contábeis da sua operadora para a tabela auxiliar, sem alterar a base oficial da ANS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="operadora-upload-select">Operadora autorizada</Label>
            <select
              id="operadora-upload-select"
              value={selectedRegAns}
              onChange={(event) => setSelectedRegAns(event.target.value)}
              disabled={!uploadOperators.length || isSubmitting}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              {uploadOperators.length ? null : <option value="">Sem operadoras com permissão de envio</option>}
              {uploadOperators.map((item) => (
                <option key={item.regAns} value={item.regAns}>
                  {(item.operatorName ?? `Reg ANS ${item.regAns}`) + ` (${item.regAns})`}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-sm">
            <p>
              <strong>Operadora:</strong> {selectedOperator?.operatorName ?? 'Não selecionada'}
            </p>
            <p>
              <strong>Registro ANS:</strong> {selectedOperator?.regAns ?? 'Não informado'}
            </p>
            <p>
              <strong>Porte calculado:</strong> {batchForm.porte || 'Informe a quantidade de beneficiários'}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="upload-competencia">Competência</Label>
              <Input
                id="upload-competencia"
                type="month"
                value={batchForm.competencia}
                onChange={(event) => updateBatchForm('competencia', event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-cnpj">CNPJ</Label>
              <Input
                id="upload-cnpj"
                value={batchForm.cnpj}
                onChange={(event) => updateBatchForm('cnpj', normalizeDigits(event.target.value))}
                disabled={isSubmitting || isLoadingOperatorContext}
                placeholder="Preenchido automaticamente pelo reg_ans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-versao">Versão do envio</Label>
              <Input
                id="upload-versao"
                type="number"
                min="1"
                step="1"
                value={batchForm.versao_envio}
                onChange={(event) => updateBatchForm('versao_envio', event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-sistema-origem">Sistema de origem</Label>
              <Input
                id="upload-sistema-origem"
                value={batchForm.sistema_origem}
                onChange={(event) => updateBatchForm('sistema_origem', event.target.value)}
                disabled={isSubmitting}
                placeholder="Ex.: ERP, Protheus, Tasy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-responsavel-nome">Responsável</Label>
              <Input
                id="upload-responsavel-nome"
                value={batchForm.responsavel_nome}
                onChange={(event) => updateBatchForm('responsavel_nome', event.target.value)}
                disabled={isSubmitting}
                placeholder="Nome de quem está enviando"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-responsavel-email">Email do responsável</Label>
              <Input
                id="upload-responsavel-email"
                type="email"
                value={batchForm.responsavel_email}
                onChange={(event) => updateBatchForm('responsavel_email', event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-beneficiarios">Quantidade de beneficiários</Label>
              <Input
                id="upload-beneficiarios"
                type="number"
                min="0"
                step="1"
                value={batchForm.qt_beneficiarios}
                onChange={(event) => updateBatchForm('qt_beneficiarios', event.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">Informar a quantidade no último dia do período e ativos na ANS.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-prestadores">Quantidade de prestadores</Label>
              <Input
                id="upload-prestadores"
                type="number"
                min="0"
                step="1"
                value={batchForm.qt_prestadores}
                onChange={(event) => updateBatchForm('qt_prestadores', event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-modalidade">Modalidade</Label>
              <select
                id="upload-modalidade"
                value={batchForm.modalidade}
                onChange={(event) => updateBatchForm('modalidade', event.target.value)}
                disabled={isSubmitting || isLoadingOperatorContext}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              >
                {MODALIDADE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-porte">Porte</Label>
              <Input id="upload-porte" value={batchForm.porte} disabled readOnly placeholder="Calculado pelos beneficiários" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upload-observacoes">Observações</Label>
            <Textarea
              id="upload-observacoes"
              value={batchForm.observacoes}
              onChange={(event) => updateBatchForm('observacoes', event.target.value)}
              disabled={isSubmitting}
              className="min-h-[96px]"
              placeholder="Observações do lote enviado"
            />
            <p className="text-xs text-muted-foreground">
              A data do envio é registrada automaticamente pelo servidor no momento da importação.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleTemplateDownload('template')} disabled={isDownloadingTemplate}>
              {isDownloadingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Baixar modelo vazio
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleTemplateDownload('exemplo')} disabled={isDownloadingTemplate}>
              {isDownloadingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Baixar exemplo preenchido
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operadora-file-input">Arquivo de importação (CSV/XLS/XLSX)</Label>
            <Input
              id="operadora-file-input"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              disabled={!selectedOperator || isParsing || isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              O arquivo pode conter apenas <code>cd_conta_contabil</code> e <code>vl_saldo_final</code>, ou layouts equivalentes de balancete, como
              {' '}
              <code>Classificação</code>, <code>Descrição da conta</code>, <code>Saldo Anterior</code>, <code>Débito</code>, <code>Crédito</code> e <code>Saldo Atual</code>.
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
