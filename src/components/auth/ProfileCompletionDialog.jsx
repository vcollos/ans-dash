import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'

function toText(value) {
  return String(value ?? '').trim()
}

function buildInitialState(defaultProfile = {}, defaultEmail = '') {
  return {
    firstName: toText(defaultProfile?.firstName),
    lastName: toText(defaultProfile?.lastName),
    phone: toText(defaultProfile?.phone),
    phoneIsWhatsapp: defaultProfile?.phoneIsWhatsapp === true,
    email: toText(defaultProfile?.email) || toText(defaultEmail),
    jobTitle: toText(defaultProfile?.jobTitle),
    roleFunction: toText(defaultProfile?.roleFunction) || toText(defaultProfile?.department),
    regAns: toText(defaultProfile?.regAns),
  }
}

export default function ProfileCompletionDialog({
  open,
  onOpenChange,
  defaultProfile = null,
  defaultEmail = '',
  operatorOptions = [],
  isLoadingOperators = false,
  isSubmitting = false,
  errorMessage = null,
  title = 'Complete seu cadastro',
  description = 'Para enviar dados no menu "Atualize seus dados", informe seu vínculo com a Uniodonto e seus dados de contato.',
  submitLabel = 'Salvar cadastro',
  lockOpen = false,
  regAnsRequired = true,
  onSendPasswordReset,
  isSendingPasswordReset = false,
  passwordResetMessage = null,
  onSubmit,
}) {
  const [form, setForm] = useState(() => buildInitialState(defaultProfile, defaultEmail))
  const normalizedOptions = useMemo(
    () =>
      [...operatorOptions].sort((a, b) => {
        const aLabel = a.operatorName ?? a.regAns
        const bLabel = b.operatorName ?? b.regAns
        return aLabel.localeCompare(bLabel)
      }),
    [operatorOptions],
  )

  useEffect(() => {
    if (!open) return
    setForm(buildInitialState(defaultProfile, defaultEmail))
  }, [open, defaultProfile, defaultEmail])

  const canSubmit =
    !isSubmitting &&
    !isSendingPasswordReset &&
    !isLoadingOperators &&
    toText(form.firstName) &&
    toText(form.lastName) &&
    toText(form.phone) &&
    toText(form.email) &&
    toText(form.jobTitle) &&
    toText(form.roleFunction) &&
    (regAnsRequired ? toText(form.regAns) : true)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit?.({
      firstName: toText(form.firstName),
      lastName: toText(form.lastName),
      phone: toText(form.phone),
      phoneIsWhatsapp: form.phoneIsWhatsapp === true,
      email: toText(form.email),
      jobTitle: toText(form.jobTitle),
      roleFunction: toText(form.roleFunction),
      department: toText(form.roleFunction),
      regAns: toText(form.regAns),
    })
  }

  return (
    <Dialog open={open} onOpenChange={lockOpen ? () => {} : onOpenChange}>
      <DialogContent
        className={`max-w-xl ${lockOpen ? '[&>button]:hidden' : ''}`}
        onEscapeKeyDown={(event) => {
          if (lockOpen) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (lockOpen) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-first-name">Nome</Label>
              <Input
                id="profile-first-name"
                value={form.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-last-name">Sobrenome</Label>
              <Input
                id="profile-last-name"
                value={form.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Telefone</Label>
              <Input
                id="profile-phone"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="(11) 99999-9999 ou (11) 3333-3333"
                disabled={isSubmitting}
                required
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={form.phoneIsWhatsapp}
                  onCheckedChange={(checked) => updateField('phoneIsWhatsapp', checked === true)}
                  disabled={isSubmitting}
                />
                Este telefone é WhatsApp
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-job-title">Cargo</Label>
              <Input
                id="profile-job-title"
                value={form.jobTitle}
                onChange={(event) => updateField('jobTitle', event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role-function">Função</Label>
              <Input
                id="profile-role-function"
                value={form.roleFunction}
                onChange={(event) => updateField('roleFunction', event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-reg-ans">Uniodonto vinculada</Label>
            <select
              id="profile-reg-ans"
              value={form.regAns}
              onChange={(event) => updateField('regAns', event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isSubmitting || isLoadingOperators || isSendingPasswordReset}
              required={regAnsRequired}
            >
              <option value="">
                {isLoadingOperators
                  ? 'Carregando operadoras...'
                  : regAnsRequired
                    ? 'Selecione a Uniodonto'
                    : 'Selecione a Uniodonto (opcional)'}
              </option>
              {normalizedOptions.map((item) => (
                <option key={item.regAns} value={item.regAns}>
                  {item.operatorName ?? item.regAns} ({item.regAns})
                </option>
              ))}
            </select>
          </div>
          {passwordResetMessage ? <p className="text-sm text-emerald-600">{passwordResetMessage}</p> : null}
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <DialogFooter>
            {onSendPasswordReset ? (
              <Button type="button" variant="outline" onClick={onSendPasswordReset} disabled={isSubmitting || isSendingPasswordReset}>
                {isSendingPasswordReset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </Button>
            ) : null}
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
