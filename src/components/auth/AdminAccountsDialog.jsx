import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import AdminEmailTemplatesPanel from './AdminEmailTemplatesPanel'
import {
  approveAccount,
  approveAdminUpload,
  assignAccountOperator,
  bulkApproveAccounts,
  createAdminAccount,
  deleteAdminAccount,
  deleteAdminUpload,
  fetchAdminAccounts,
  fetchAdminUploadDetail,
  fetchAdminUploadReport,
  fetchOperatorsCatalog,
  rejectAdminUpload,
  rejectAccount,
  requestAccountCompletion,
  updateAdminAccount,
} from '../../lib/accessProfile'

const APPROVED_STATUSES = new Set(['auto_aprovado', 'aprovado_manual'])
const UPLOAD_APPROVAL_STATUS = {
  PENDING: 'PENDENTE',
  APPROVED: 'APROVADO',
  REJECTED: 'REJEITADO',
  NOT_SENT: 'NAO_ENVIADO',
}
const EMPTY_NEW_ACCOUNT = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  jobTitle: '',
  roleFunction: '',
  regAns: '',
}
const EMPTY_EDIT_ACCOUNT = {
  firstName: '',
  lastName: '',
  phone: '',
  jobTitle: '',
  roleFunction: '',
  regAns: '',
}
function normalizeRegAns(value) {
  return String(value ?? '').replace(/\D/g, '')
}

function accountName(account = {}) {
  return [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email || account.uid
}

function upsertAccount(accounts, nextAccount) {
  if (!nextAccount?.uid) return accounts
  const exists = accounts.some((item) => item.uid === nextAccount.uid)
  if (!exists) return [nextAccount, ...accounts]
  return accounts.map((item) => (item.uid === nextAccount.uid ? { ...item, ...nextAccount } : item))
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return numeric.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  })
}

function formatNumeric(value) {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return numeric.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function getUploadStatusMeta(status) {
  if (status === UPLOAD_APPROVAL_STATUS.APPROVED) {
    return {
      label: 'Aprovado',
      className: 'rounded bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700',
    }
  }
  if (status === UPLOAD_APPROVAL_STATUS.REJECTED) {
    return {
      label: 'Rejeitado',
      className: 'rounded bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive',
    }
  }
  if (status === UPLOAD_APPROVAL_STATUS.PENDING) {
    return {
      label: 'Pendente aprovação',
      className: 'rounded bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700',
    }
  }
  return {
    label: 'Pendente envio',
    className: 'rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground',
  }
}

function findAccountValue(rows = [], code) {
  const row = rows.find((item) => String(item?.cdContaContabil ?? '').trim() === code)
  return Number.isFinite(Number(row?.vlSaldoFinal)) ? Number(row.vlSaldoFinal) : null
}

function buildUploadCheckItems(rows = []) {
  const ativo = findAccountValue(rows, '1')
  const passivo = findAccountValue(rows, '2')
  const receitas = findAccountValue(rows, '3')
  const despesas = findAccountValue(rows, '4')
  return [
    { label: 'Linhas', value: rows.length.toLocaleString('pt-BR') },
    { label: 'Conta 1 - Ativo', value: formatMoney(ativo) },
    { label: 'Conta 2 - Passivo/PL', value: formatMoney(passivo) },
    { label: 'Dif. Ativo - Conta 2', value: ativo === null || passivo === null ? '—' : formatMoney(ativo - passivo) },
    { label: 'Conta 3 - Receitas', value: formatMoney(receitas) },
    { label: 'Conta 4 - Despesas', value: formatMoney(despesas) },
    { label: 'Resultado 3 - 4', value: receitas === null || despesas === null ? '—' : formatMoney(receitas - despesas) },
  ]
}

function accountToEditForm(account = {}) {
  return {
    firstName: account.firstName ?? '',
    lastName: account.lastName ?? '',
    phone: account.phone ?? '',
    jobTitle: account.jobTitle ?? '',
    roleFunction: account.roleFunction ?? account.department ?? '',
    regAns: normalizeRegAns(account.accessRegAns ?? account.regAns),
  }
}

export default function AdminAccountsDialog({ open, onOpenChange, onOpenUploadForOperator, inline = false, onBack }) {
  const [accounts, setAccounts] = useState([])
  const [operators, setOperators] = useState([])
  const [uploadReport, setUploadReport] = useState({ rows: [], periods: [], summary: null })
  const [activeTab, setActiveTab] = useState('accounts')
  const [accountSearch, setAccountSearch] = useState('')
  const [newAccount, setNewAccount] = useState(EMPTY_NEW_ACCOUNT)
  const [selectedUids, setSelectedUids] = useState(() => new Set())
  const [bulkOperatorRegAns, setBulkOperatorRegAns] = useState('')
  const [operatorByUid, setOperatorByUid] = useState({})
  const [editingUid, setEditingUid] = useState(null)
  const [editAccount, setEditAccount] = useState(EMPTY_EDIT_ACCOUNT)
  const [uploadDetail, setUploadDetail] = useState(null)
  const [isUploadDetailLoading, setIsUploadDetailLoading] = useState(false)
  const [uploadDetailSearch, setUploadDetailSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionKey, setActionKey] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const pendingAccounts = useMemo(
    () => accounts.filter((account) => !APPROVED_STATUSES.has(account.statusAprovacao)),
    [accounts],
  )
  const selectedPendingUids = useMemo(
    () => pendingAccounts.map((account) => account.uid).filter((uid) => selectedUids.has(uid)),
    [pendingAccounts, selectedUids],
  )
  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedUids.has(account.uid)),
    [accounts, selectedUids],
  )
  const filteredAccounts = useMemo(() => {
    const query = normalizeSearchText(accountSearch).trim()
    if (!query) return accounts
    return accounts.filter((account) => {
      const text = normalizeSearchText(
        [
          accountName(account),
          account.email,
          account.operatorName,
          account.accessOperatorName,
          ...(account.accessLinks ?? []).flatMap((link) => [link.operatorName, link.regAns]),
          account.regAns,
          account.accessRegAns,
        ].join(' '),
      )
      return text.includes(query)
    })
  }, [accountSearch, accounts])
  const allVisibleSelected = filteredAccounts.length > 0 && filteredAccounts.every((account) => selectedUids.has(account.uid))
  const uploadDetailRows = useMemo(() => uploadDetail?.rows ?? [], [uploadDetail])
  const uploadDetailCheckItems = useMemo(() => buildUploadCheckItems(uploadDetailRows), [uploadDetailRows])
  const filteredUploadDetailRows = useMemo(() => {
    const query = normalizeSearchText(uploadDetailSearch).trim()
    if (!query) return uploadDetailRows
    return uploadDetailRows.filter((row) => {
      const text = normalizeSearchText(
        [
          row.cdContaContabil,
          row.descricao,
          row.statusFechamento,
          row.tipoEnvio,
          row.modalidade,
          row.porte,
          row.observacoes,
        ].join(' '),
      )
      return text.includes(query)
    })
  }, [uploadDetailRows, uploadDetailSearch])

  async function reloadUploadReport() {
    const report = await fetchAdminUploadReport()
    setUploadReport(report)
    return report
  }

  async function loadUploadDetail(uploadId) {
    setIsUploadDetailLoading(true)
    setErrorMessage(null)
    try {
      const detail = await fetchAdminUploadDetail(uploadId)
      setUploadDetail(detail)
      return detail
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao carregar dados do envio.')
      throw err
    } finally {
      setIsUploadDetailLoading(false)
    }
  }

  useEffect(() => {
    if (!open && !inline) return
    let cancelled = false
    setIsLoading(true)
    setErrorMessage(null)
    Promise.all([fetchAdminAccounts(), fetchOperatorsCatalog(), fetchAdminUploadReport()])
      .then(([accountItems, operatorItems, report]) => {
        if (cancelled) return
        setAccounts(accountItems)
        setOperators(operatorItems)
        setUploadReport(report)
        setOperatorByUid(
          Object.fromEntries(
            accountItems
              .map((account) => [account.uid, normalizeRegAns(account.accessRegAns ?? account.regAns)])
              .filter(([, regAns]) => regAns),
          ),
        )
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err?.message ?? 'Falha ao carregar painel administrativo.')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, inline])

  function toggleSelected(uid, checked) {
    setSelectedUids((current) => {
      const next = new Set(current)
      if (checked) next.add(uid)
      else next.delete(uid)
      return next
    })
  }

  function handleSelectAllVisible() {
    setSelectedUids(new Set(filteredAccounts.map((account) => account.uid).filter(Boolean)))
  }

  function handleClearSelection() {
    setSelectedUids(new Set())
  }

  async function handleApprove(account) {
    const regAns = normalizeRegAns(operatorByUid[account.uid] ?? account.accessRegAns ?? account.regAns)
    if (!regAns) {
      setErrorMessage('Selecione uma operadora antes de aprovar a conta.')
      return
    }
    setActionKey(`approve:${account.uid}`)
    setErrorMessage(null)
    try {
      const approvedAccount = await approveAccount(account.uid, regAns)
      setAccounts((current) => upsertAccount(current, approvedAccount))
      toggleSelected(account.uid, false)
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao aprovar conta.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleBulkApprove() {
    if (!selectedPendingUids.length) return
    setActionKey('bulk-approve')
    setErrorMessage(null)
    try {
      const approved = await bulkApproveAccounts(selectedPendingUids)
      setAccounts((current) => approved.reduce(upsertAccount, current))
      setSelectedUids(new Set())
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao aprovar contas em lote.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleBulkAssignOperator() {
    const regAns = normalizeRegAns(bulkOperatorRegAns)
    if (!regAns || !selectedAccounts.length) return
    setActionKey('bulk-operator')
    setErrorMessage(null)
    try {
      const updated = []
      for (const account of selectedAccounts) {
        updated.push(await assignAccountOperator(account.uid, regAns))
      }
      setAccounts((current) => updated.reduce(upsertAccount, current))
      setOperatorByUid((current) => ({
        ...current,
        ...Object.fromEntries(updated.map((account) => [account.uid, normalizeRegAns(account.accessRegAns ?? account.regAns)])),
      }))
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao vincular operadora nas contas selecionadas.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleReject(uid) {
    setActionKey(`reject:${uid}`)
    setErrorMessage(null)
    try {
      const account = await rejectAccount(uid, 'rejeitado_admin')
      setAccounts((current) => upsertAccount(current, account))
      toggleSelected(uid, false)
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao rejeitar conta.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleAssignOperator(account) {
    const regAns = normalizeRegAns(operatorByUid[account.uid])
    if (!regAns) return
    setActionKey(`operator:${account.uid}`)
    setErrorMessage(null)
    try {
      const nextAccount = await assignAccountOperator(account.uid, regAns)
      setAccounts((current) => upsertAccount(current, nextAccount))
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao vincular operadora.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleRequestCompletion(account) {
    setActionKey(`request-completion:${account.uid}`)
    setErrorMessage(null)
    try {
      const nextAccount = await requestAccountCompletion(account.uid)
      setAccounts((current) => upsertAccount(current, nextAccount))
      setOperatorByUid((current) => {
        const next = { ...current }
        delete next[account.uid]
        return next
      })
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao solicitar complemento cadastral.')
    } finally {
      setActionKey(null)
    }
  }

  function handleOpenUpload(account) {
    const regAns = normalizeRegAns(operatorByUid[account.uid] ?? account.accessRegAns ?? account.regAns)
    const operator = operators.find((item) => normalizeRegAns(item.regAns) === regAns)
    if (operator && typeof onOpenUploadForOperator === 'function') {
      onOpenUploadForOperator(operator)
    }
  }

  function handleOpenUploadForReportRow(row) {
    if (typeof onOpenUploadForOperator !== 'function') return
    onOpenUploadForOperator({
      regAns: row.regAns,
      operatorName: row.operatorName,
      competencia: row.competencia,
    })
  }

  function updateNewAccount(field, value) {
    setNewAccount((current) => ({ ...current, [field]: value }))
  }

  function startEditAccount(account) {
    setEditingUid(account.uid)
    setEditAccount(accountToEditForm(account))
  }

  function updateEditAccount(field, value) {
    setEditAccount((current) => ({ ...current, [field]: value }))
  }

  async function handleUpdateAccount(event) {
    event.preventDefault()
    if (!editingUid) return
    setActionKey(`edit:${editingUid}`)
    setErrorMessage(null)
    try {
      const account = await updateAdminAccount(editingUid, editAccount)
      setAccounts((current) => upsertAccount(current, account))
      setOperatorByUid((current) => ({ ...current, [account.uid]: normalizeRegAns(account.accessRegAns ?? account.regAns) }))
      setEditingUid(null)
      setEditAccount(EMPTY_EDIT_ACCOUNT)
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao editar usuário.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleDeleteAccount(account) {
    const confirmed = window.confirm(`Excluir ${accountName(account)} e liberar este e-mail para novo cadastro?`)
    if (!confirmed) return
    setActionKey(`delete-account:${account.uid}`)
    setErrorMessage(null)
    try {
      await deleteAdminAccount(account.uid)
      setAccounts((current) => current.filter((item) => item.uid !== account.uid))
      setOperatorByUid((current) => {
        const next = { ...current }
        delete next[account.uid]
        return next
      })
      toggleSelected(account.uid, false)
      if (editingUid === account.uid) setEditingUid(null)
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao excluir usuário.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault()
    setActionKey('create-account')
    setErrorMessage(null)
    try {
      const account = await createAdminAccount(newAccount)
      setAccounts((current) => upsertAccount(current, account))
      setOperatorByUid((current) => ({ ...current, [account.uid]: normalizeRegAns(account.accessRegAns ?? account.regAns) }))
      setNewAccount(EMPTY_NEW_ACCOUNT)
      setActiveTab('accounts')
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao criar usuário.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleDeleteUpload(row) {
    const uploadId = row?.upload?.uploadId
    if (!uploadId) return
    const confirmed = window.confirm(`Excluir o envio de ${row.operatorName} (${row.competencia})?`)
    if (!confirmed) return
    setActionKey(`delete-upload:${uploadId}`)
    setErrorMessage(null)
    try {
      await deleteAdminUpload(uploadId)
      await reloadUploadReport()
      if (uploadDetail?.upload?.uploadId === uploadId) {
        setUploadDetail(null)
        setUploadDetailSearch('')
      }
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao excluir envio.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleViewUpload(row) {
    const uploadId = row?.upload?.uploadId
    if (!uploadId) return
    setUploadDetailSearch('')
    await loadUploadDetail(uploadId).catch(() => null)
  }

  async function handleApproveUpload(row) {
    const uploadId = row?.upload?.uploadId
    if (!uploadId) return
    setActionKey(`approve-upload:${uploadId}`)
    setErrorMessage(null)
    try {
      await approveAdminUpload(uploadId)
      await reloadUploadReport()
      if (uploadDetail?.upload?.uploadId === uploadId) {
        await loadUploadDetail(uploadId)
      }
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao aprovar envio.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleRejectUpload(row) {
    const uploadId = row?.upload?.uploadId
    if (!uploadId) return
    const notes = window.prompt('Motivo da rejeição do envio:', row.upload?.approvalNotes ?? '')
    if (notes === null) return
    setActionKey(`reject-upload:${uploadId}`)
    setErrorMessage(null)
    try {
      await rejectAdminUpload(uploadId, notes)
      await reloadUploadReport()
      if (uploadDetail?.upload?.uploadId === uploadId) {
        await loadUploadDetail(uploadId)
      }
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao rejeitar envio.')
    } finally {
      setActionKey(null)
    }
  }

  const detailUpload = uploadDetail?.upload ?? null
  const detailStatusMeta = getUploadStatusMeta(detailUpload?.approvalStatus)
  const detailCanModerate = Boolean(detailUpload?.uploadId) && detailUpload?.approvalStatus === UPLOAD_APPROVAL_STATUS.PENDING

  const panel = (
        <div className={inline ? 'flex min-h-0 flex-col rounded-lg border bg-background shadow-sm' : 'flex max-h-[calc(100dvh-2rem)] flex-col'}>
          <div className="border-b px-6 py-5">
            <DialogHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold leading-none tracking-tight">Administração</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aprovação em lote, vínculo usuário-operadora e envio pela operadora.
                  </p>
                </div>
                {inline && typeof onBack === 'function' ? (
                  <Button type="button" size="sm" variant="outline" onClick={onBack}>
                    Voltar ao painel
                  </Button>
                ) : null}
              </div>
            </DialogHeader>
          </div>

          <div className="border-b px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'accounts' ? 'default' : 'outline'}
                onClick={() => setActiveTab('accounts')}
              >
                Contas e vínculos
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'uploads' ? 'default' : 'outline'}
                onClick={() => setActiveTab('uploads')}
              >
                Envios de balancete
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'create' ? 'default' : 'outline'}
                onClick={() => setActiveTab('create')}
              >
                Novo usuário
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'emailTemplates' ? 'default' : 'outline'}
                onClick={() => setActiveTab('emailTemplates')}
              >
                Emails do sistema
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <div className="space-y-5">
                {activeTab === 'uploads' ? (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">Envios de balancete</h3>
                      <p className="text-xs text-muted-foreground">
                        {uploadReport.summary?.sent ?? 0} recebido(s) · {uploadReport.summary?.pending ?? 0} aguardando aprovação · {uploadReport.summary?.approved ?? 0} aprovado(s)
                      </p>
                    </div>
                  </div>
                  <div className="max-h-[280px] overflow-auto rounded-md border">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Operadora</th>
                          <th className="px-3 py-2">Reg. ANS</th>
                          <th className="px-3 py-2">Período</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Enviado em</th>
                          <th className="px-3 py-2">Quem enviou</th>
                          <th className="px-3 py-2">Arquivo</th>
                          <th className="px-3 py-2">Linhas</th>
                          <th className="px-3 py-2">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadReport.rows.length ? (
                          uploadReport.rows.map((row) => {
                            const statusMeta = getUploadStatusMeta(row.status)
                            const canModerate = Boolean(row.upload?.uploadId) && row.status === UPLOAD_APPROVAL_STATUS.PENDING
                            return (
                              <tr key={`${row.regAns}-${row.competencia ?? 'sem-periodo'}`} className="border-t">
                                <td className="px-3 py-2 font-medium">{row.operatorName}</td>
                                <td className="px-3 py-2">{row.regAns}</td>
                                <td className="px-3 py-2">{row.competencia ?? '—'}</td>
                                <td className="px-3 py-2">
                                  <span className={statusMeta.className}>{statusMeta.label}</span>
                                  {row.upload?.approvedByEmail ? (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      por {row.upload.approvedByEmail}
                                    </p>
                                  ) : null}
                                  {row.upload?.rejectedByEmail ? (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      por {row.upload.rejectedByEmail}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2">{formatDateTime(row.upload?.uploadedAt)}</td>
                                <td className="px-3 py-2">
                                  {row.upload?.responsavelEmail ?? row.upload?.uploadedByEmail ?? '—'}
                                </td>
                                <td className="px-3 py-2">{row.upload?.sourceFileName ?? '—'}</td>
                                <td className="px-3 py-2">{row.upload?.rowCount ?? '—'}</td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-2">
                                    {row.upload?.uploadId ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewUpload(row)}
                                        disabled={Boolean(actionKey) || isUploadDetailLoading}
                                      >
                                        {isUploadDetailLoading && uploadDetail?.upload?.uploadId === row.upload.uploadId
                                          ? 'Abrindo...'
                                          : 'Visualizar'}
                                      </Button>
                                    ) : null}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenUploadForReportRow(row)}
                                      disabled={Boolean(actionKey)}
                                    >
                                      {row.upload?.uploadId ? 'Atualizar' : 'Enviar'}
                                    </Button>
                                    {canModerate ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleApproveUpload(row)}
                                        disabled={Boolean(actionKey)}
                                      >
                                        {actionKey === `approve-upload:${row.upload.uploadId}` ? 'Aprovando...' : 'Aprovar'}
                                      </Button>
                                    ) : null}
                                    {canModerate ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRejectUpload(row)}
                                        disabled={Boolean(actionKey)}
                                      >
                                        {actionKey === `reject-upload:${row.upload.uploadId}` ? 'Rejeitando...' : 'Rejeitar'}
                                      </Button>
                                    ) : null}
                                    {row.upload?.uploadId ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteUpload(row)}
                                        disabled={Boolean(actionKey)}
                                      >
                                        {actionKey === `delete-upload:${row.upload.uploadId}` ? 'Excluindo...' : 'Excluir'}
                                      </Button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td className="px-3 py-4 text-muted-foreground" colSpan={9}>
                              Nenhum envio encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
                ) : null}

                {activeTab === 'accounts' ? (
                  <>
                    <div className="space-y-3 rounded-md border bg-muted/20 px-3 py-3">
                      <input
                        type="search"
                        value={accountSearch}
                        onChange={(event) => setAccountSearch(event.target.value)}
                        placeholder="Buscar por nome, e-mail, operadora ou reg. ANS"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        {pendingAccounts.length} pendente(s) · {filteredAccounts.length}/{accounts.length} conta(s) · {selectedAccounts.length} selecionada(s)
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={allVisibleSelected ? handleClearSelection : handleSelectAllVisible}
                          disabled={!accounts.length || Boolean(actionKey)}
                        >
                          {allVisibleSelected ? 'Limpar seleção' : 'Selecionar todos'}
                        </Button>
                        <select
                          value={bulkOperatorRegAns}
                          onChange={(event) => setBulkOperatorRegAns(event.target.value)}
                          disabled={!operators.length || Boolean(actionKey)}
                          className="h-9 max-w-[260px] rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">Operadora para selecionados</option>
                          {operators.map((operator) => (
                            <option key={operator.regAns} value={normalizeRegAns(operator.regAns)}>
                              {(operator.operatorName ?? `Reg ANS ${operator.regAns}`) + ` (${operator.regAns})`}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleBulkAssignOperator}
                          disabled={!selectedAccounts.length || !bulkOperatorRegAns || Boolean(actionKey)}
                        >
                          {actionKey === 'bulk-operator' ? 'Vinculando...' : 'Vincular selecionados'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleBulkApprove}
                          disabled={!selectedPendingUids.length || Boolean(actionKey)}
                        >
                          {actionKey === 'bulk-approve' ? 'Aprovando...' : `Aprovar selecionados (${selectedPendingUids.length})`}
                        </Button>
                      </div>
                      </div>
                    </div>
                {filteredAccounts.length ? (
                  <section className="space-y-3">
                {filteredAccounts.map((account) => {
                  const approved = APPROVED_STATUSES.has(account.statusAprovacao)
                  const regAns = normalizeRegAns(operatorByUid[account.uid] ?? account.accessRegAns ?? account.regAns)
                  const currentOperator = operators.find((item) => normalizeRegAns(item.regAns) === regAns)
                  const linkedOperators = (account.accessLinks?.length
                    ? account.accessLinks
                    : [{ regAns: account.accessRegAns, operatorName: account.accessOperatorName }]
                  ).filter((item) => normalizeRegAns(item.regAns))
                  return (
                    <div key={account.uid} className="rounded-md border p-3">
                      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_auto] lg:items-start">
                        <label className="flex items-start gap-3 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedUids.has(account.uid)}
                            onChange={(event) => toggleSelected(account.uid, event.target.checked)}
                          />
                          <span>
                            <span className="block font-semibold">{accountName(account)}</span>
                            <span className="block text-muted-foreground">{account.email}</span>
                            <span className="block text-xs text-muted-foreground">
                              {approved ? 'Aprovado' : 'Pendente'} · {account.approvalReason ?? 'sem motivo'}
                            </span>
                          </span>
                        </label>

                        <div className="space-y-2">
                          <select
                            value={regAns}
                            onChange={(event) =>
                              setOperatorByUid((current) => ({ ...current, [account.uid]: event.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">Selecione a operadora</option>
                            {operators.map((operator) => (
                              <option key={operator.regAns} value={normalizeRegAns(operator.regAns)}>
                                {(operator.operatorName ?? `Reg ANS ${operator.regAns}`) + ` (${operator.regAns})`}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-muted-foreground">
                            Vínculos: {linkedOperators.length ? linkedOperators.map((item) => item.operatorName ?? item.regAns).join(', ') : 'sem vínculo'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignOperator(account)}
                            disabled={!regAns || Boolean(actionKey)}
                          >
                            {actionKey === `operator:${account.uid}` ? 'Salvando...' : 'Adicionar vínculo'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenUpload(account)}
                            disabled={!currentOperator || Boolean(actionKey)}
                          >
                            Enviar dados
                          </Button>
                          {!linkedOperators.length ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestCompletion(account)}
                              disabled={Boolean(actionKey)}
                            >
                              {actionKey === `request-completion:${account.uid}` ? 'Enviando...' : 'Solicitar cadastro'}
                            </Button>
                          ) : null}
                          {!approved ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleApprove(account)}
                              disabled={!regAns || Boolean(actionKey)}
                            >
                              {actionKey === `approve:${account.uid}` ? 'Salvando...' : 'Aprovar'}
                            </Button>
                          ) : null}
                          {!approved ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(account.uid)}
                              disabled={Boolean(actionKey)}
                            >
                              Rejeitar
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => startEditAccount(account)}
                            disabled={Boolean(actionKey)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteAccount(account)}
                            disabled={Boolean(actionKey)}
                          >
                            {actionKey === `delete-account:${account.uid}` ? 'Excluindo...' : 'Excluir'}
                          </Button>
                        </div>
                      </div>
                      {editingUid === account.uid ? (
                        <form className="mt-3 grid gap-2 border-t pt-3 md:grid-cols-3" onSubmit={handleUpdateAccount}>
                          <input
                            className="rounded-md border px-3 py-2 text-sm"
                            placeholder="Nome"
                            value={editAccount.firstName}
                            onChange={(event) => updateEditAccount('firstName', event.target.value)}
                          />
                          <input
                            className="rounded-md border px-3 py-2 text-sm"
                            placeholder="Sobrenome"
                            value={editAccount.lastName}
                            onChange={(event) => updateEditAccount('lastName', event.target.value)}
                          />
                          <input
                            className="rounded-md border px-3 py-2 text-sm"
                            placeholder="Telefone"
                            value={editAccount.phone}
                            onChange={(event) => updateEditAccount('phone', event.target.value)}
                          />
                          <input
                            className="rounded-md border px-3 py-2 text-sm"
                            placeholder="Cargo"
                            value={editAccount.jobTitle}
                            onChange={(event) => updateEditAccount('jobTitle', event.target.value)}
                          />
                          <input
                            className="rounded-md border px-3 py-2 text-sm"
                            placeholder="Função"
                            value={editAccount.roleFunction}
                            onChange={(event) => updateEditAccount('roleFunction', event.target.value)}
                          />
                          <select
                            className="rounded-md border px-3 py-2 text-sm"
                            value={editAccount.regAns}
                            onChange={(event) => updateEditAccount('regAns', event.target.value)}
                          >
                            <option value="">Operadora</option>
                            {operators.map((operator) => (
                              <option key={operator.regAns} value={normalizeRegAns(operator.regAns)}>
                                {(operator.operatorName ?? `Reg ANS ${operator.regAns}`) + ` (${operator.regAns})`}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2 md:col-span-3">
                            <Button type="submit" size="sm" disabled={Boolean(actionKey)}>
                              {actionKey === `edit:${account.uid}` ? 'Salvando...' : 'Salvar'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUid(null)}
                              disabled={Boolean(actionKey)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  )
                })}
                  </section>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
                )}
                  </>
                ) : null}
                {activeTab === 'create' ? (
                  <form className="space-y-4 rounded-md border p-4" onSubmit={handleCreateAccount}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Nome" value={newAccount.firstName} onChange={(event) => updateNewAccount('firstName', event.target.value)} />
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Sobrenome" value={newAccount.lastName} onChange={(event) => updateNewAccount('lastName', event.target.value)} />
                      <input className="rounded-md border px-3 py-2 text-sm" type="email" placeholder="E-mail" value={newAccount.email} onChange={(event) => updateNewAccount('email', event.target.value)} />
                      <input className="rounded-md border px-3 py-2 text-sm" type="password" placeholder="Senha inicial" value={newAccount.password} onChange={(event) => updateNewAccount('password', event.target.value)} />
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Telefone" value={newAccount.phone} onChange={(event) => updateNewAccount('phone', event.target.value)} />
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Cargo" value={newAccount.jobTitle} onChange={(event) => updateNewAccount('jobTitle', event.target.value)} />
                      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Função" value={newAccount.roleFunction} onChange={(event) => updateNewAccount('roleFunction', event.target.value)} />
                      <select className="rounded-md border px-3 py-2 text-sm" value={newAccount.regAns} onChange={(event) => updateNewAccount('regAns', event.target.value)}>
                        <option value="">Operadora</option>
                        {operators.map((operator) => (
                          <option key={operator.regAns} value={normalizeRegAns(operator.regAns)}>
                            {(operator.operatorName ?? `Reg ANS ${operator.regAns}`) + ` (${operator.regAns})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" disabled={actionKey === 'create-account'}>
                      {actionKey === 'create-account' ? 'Criando...' : 'Criar usuário'}
                    </Button>
                  </form>
                ) : null}
                {activeTab === 'emailTemplates' ? <AdminEmailTemplatesPanel /> : null}
              </div>
            )}
            {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}
          </div>
        </div>
  )

  const detailDialog = (
    <Dialog
      open={Boolean(uploadDetail) || isUploadDetailLoading}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return
        setUploadDetail(null)
        setUploadDetailSearch('')
        setIsUploadDetailLoading(false)
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0 sm:max-w-6xl">
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="border-b px-6 py-5">
            <DialogHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold leading-none tracking-tight">Conferência do envio</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {detailUpload
                      ? `${detailUpload.operatorName ?? 'Operadora'} · ${detailUpload.regAns ?? 'sem reg. ANS'} · ${detailUpload.competencia ?? 'sem período'}`
                      : 'Carregando dados do envio...'}
                  </p>
                </div>
                {detailUpload ? <span className={detailStatusMeta.className}>{detailStatusMeta.label}</span> : null}
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {isUploadDetailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando linhas do balancete...
              </div>
            ) : detailUpload ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
                  {uploadDetailCheckItems.map((item) => (
                    <div key={item.label} className="rounded-md border bg-muted/20 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 rounded-md border bg-muted/20 px-3 py-3 text-sm md:grid-cols-3">
                  <p>
                    <span className="font-semibold">Arquivo:</span> {detailUpload.sourceFileName ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold">Enviado em:</span> {formatDateTime(detailUpload.uploadedAt)}
                  </p>
                  <p>
                    <span className="font-semibold">Enviado por:</span>{' '}
                    {detailUpload.responsavelEmail ?? detailUpload.uploadedByEmail ?? '—'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="search"
                    value={uploadDetailSearch}
                    onChange={(event) => setUploadDetailSearch(event.target.value)}
                    placeholder="Buscar conta, descrição, status ou observação"
                    className="min-w-[280px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-sm text-muted-foreground">
                    {filteredUploadDetailRows.length.toLocaleString('pt-BR')} de {uploadDetailRows.length.toLocaleString('pt-BR')} linha(s)
                  </p>
                </div>

                <div className="max-h-[48vh] overflow-auto rounded-md border">
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Conta</th>
                        <th className="px-3 py-2">Descrição</th>
                        <th className="px-3 py-2 text-right">Saldo inicial</th>
                        <th className="px-3 py-2 text-right">Débitos</th>
                        <th className="px-3 py-2 text-right">Créditos</th>
                        <th className="px-3 py-2 text-right">Saldo final</th>
                        <th className="px-3 py-2">Meta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUploadDetailRows.length ? (
                        filteredUploadDetailRows.map((row, index) => (
                          <tr key={`${row.cdContaContabil}-${index}`} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{row.cdContaContabil}</td>
                            <td className="px-3 py-2">{row.descricao ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(row.vlSaldoInicial)}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(row.vlDebitos)}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(row.vlCreditos)}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatMoney(row.vlSaldoFinal)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {[
                                row.statusFechamento,
                                row.tipoEnvio,
                                row.versaoEnvio ? `v${formatNumeric(row.versaoEnvio)}` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                            Nenhuma linha encontrada para a busca.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum envio selecionado.</p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setUploadDetail(null)}>
              Fechar
            </Button>
            {detailCanModerate ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRejectUpload({ upload: detailUpload })}
                disabled={Boolean(actionKey)}
              >
                {actionKey === `reject-upload:${detailUpload.uploadId}` ? 'Rejeitando...' : 'Rejeitar'}
              </Button>
            ) : null}
            {detailCanModerate ? (
              <Button
                type="button"
                onClick={() => handleApproveUpload({ upload: detailUpload })}
                disabled={Boolean(actionKey)}
              >
                {actionKey === `approve-upload:${detailUpload.uploadId}` ? 'Aprovando...' : 'Aprovar e publicar'}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (inline) {
    return (
      <>
        {panel}
        {detailDialog}
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0 sm:max-w-5xl">
          {panel}
        </DialogContent>
      </Dialog>
      {detailDialog}
    </>
  )
}
