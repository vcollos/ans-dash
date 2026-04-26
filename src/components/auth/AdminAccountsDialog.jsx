import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { approveAccount, fetchPendingAccounts, rejectAccount } from '../../lib/accessProfile'

export default function AdminAccountsDialog({ open, onOpenChange }) {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionUid, setActionUid] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setIsLoading(true)
    setErrorMessage(null)
    fetchPendingAccounts()
      .then((items) => {
        if (cancelled) return
        setAccounts(items)
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err?.message ?? 'Falha ao carregar contas.')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  async function handleApprove(uid) {
    setActionUid(uid)
    setErrorMessage(null)
    try {
      await approveAccount(uid)
      setAccounts((current) => current.filter((item) => item.uid !== uid))
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao aprovar conta.')
    } finally {
      setActionUid(null)
    }
  }

  async function handleReject(uid) {
    setActionUid(uid)
    setErrorMessage(null)
    try {
      await rejectAccount(uid, 'rejeitado_admin')
      setAccounts((current) => current.filter((item) => item.uid !== uid))
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao rejeitar conta.')
    } finally {
      setActionUid(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Aprovação de contas</DialogTitle>
          <DialogDescription>Cadastros que não tiveram auto-aprovação segura pelo UHub.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : accounts.length ? (
          <div className="max-h-[60vh] space-y-3 overflow-auto pr-1">
            {accounts.map((account) => (
              <div key={account.uid} className="rounded-md border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">
                      {account.firstName} {account.lastName}
                    </p>
                    <p className="text-muted-foreground">{account.email}</p>
                    <p className="text-muted-foreground">
                      {account.operatorName ?? account.regAns ?? 'Uniodonto não informada'}
                    </p>
                    <p className="text-xs text-muted-foreground">Motivo: {account.approvalReason ?? 'pendente'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => handleApprove(account.uid)} disabled={Boolean(actionUid)}>
                      {actionUid === account.uid ? 'Salvando...' : 'Aprovar'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(account.uid)}
                      disabled={Boolean(actionUid)}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma conta pendente.</p>
        )}
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </DialogContent>
    </Dialog>
  )
}

