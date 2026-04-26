import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { fetchOperatorsCatalog } from '../../lib/accessProfile'
import uniodontoLogo from '../../assets/uniodonto-logo.svg'

function LoginScreen({
  onLogin,
  onSignUp,
  onGoogleLogin,
  onSendEmailLink,
  onForgotPassword,
  onCompleteEmailLink,
  isEmailLinkFlow = false,
  isLoading = false,
  errorMessage = null,
}) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupForm, setSignupForm] = useState({
    regAns: '',
    firstName: '',
    lastName: '',
    jobTitle: '',
    roleFunction: '',
    phone: '',
    phoneIsWhatsapp: false,
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [operatorOptions, setOperatorOptions] = useState([])
  const [isLoadingOperators, setIsLoadingOperators] = useState(false)
  const [operatorError, setOperatorError] = useState(null)

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading
  const canSendLink = email.trim().length > 0 && !isLoading
  const canSubmitSignup = useMemo(
    () =>
      !isLoading &&
      !isLoadingOperators &&
      signupForm.regAns &&
      signupForm.firstName.trim() &&
      signupForm.lastName.trim() &&
      signupForm.jobTitle.trim() &&
      signupForm.roleFunction.trim() &&
      signupForm.phone.trim() &&
      signupForm.email.trim() &&
      signupForm.password &&
      signupForm.confirmPassword &&
      signupForm.password === signupForm.confirmPassword,
    [isLoading, isLoadingOperators, signupForm],
  )

  useEffect(() => {
    if (mode !== 'signup' || operatorOptions.length) return
    let cancelled = false
    setIsLoadingOperators(true)
    setOperatorError(null)
    fetchOperatorsCatalog()
      .then((items) => {
        if (cancelled) return
        setOperatorOptions(items)
      })
      .catch((err) => {
        if (cancelled) return
        setOperatorError(err?.message ?? 'Falha ao carregar Uniodontos.')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoadingOperators(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, operatorOptions.length])

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    onLogin?.({ email: email.trim(), password })
  }

  function updateSignupField(field, value) {
    setSignupForm((current) => ({ ...current, [field]: value }))
  }

  function handleSignupSubmit(event) {
    event.preventDefault()
    if (!canSubmitSignup) return
    onSignUp?.({
      ...signupForm,
      firstName: signupForm.firstName.trim(),
      lastName: signupForm.lastName.trim(),
      jobTitle: signupForm.jobTitle.trim(),
      roleFunction: signupForm.roleFunction.trim(),
      phone: signupForm.phone.trim(),
      email: signupForm.email.trim(),
    })
  }

  if (mode === 'signup') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
        <Card className="w-full max-w-2xl border-border/80 shadow-lg">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <img src={uniodontoLogo} alt="Uniodonto" className="h-12 w-auto" />
              <div className="space-y-1">
                <CardTitle className="text-xl">Criar conta</CardTitle>
                <CardDescription>Painel Financeiro Contábil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSignupSubmit}>
              <div className="space-y-2">
                <Label htmlFor="signup-reg-ans">Uniodonto</Label>
                <select
                  id="signup-reg-ans"
                  value={signupForm.regAns}
                  onChange={(event) => updateSignupField('regAns', event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading || isLoadingOperators}
                  required
                >
                  <option value="">{isLoadingOperators ? 'Carregando Uniodontos...' : 'Selecione a Uniodonto'}</option>
                  {operatorOptions.map((item) => (
                    <option key={item.regAns} value={item.regAns}>
                      {item.operatorName ?? item.regAns} ({item.regAns})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-first-name">Nome</Label>
                  <Input id="signup-first-name" value={signupForm.firstName} onChange={(event) => updateSignupField('firstName', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-last-name">Sobrenome</Label>
                  <Input id="signup-last-name" value={signupForm.lastName} onChange={(event) => updateSignupField('lastName', event.target.value)} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-job-title">Cargo</Label>
                  <Input id="signup-job-title" value={signupForm.jobTitle} onChange={(event) => updateSignupField('jobTitle', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role-function">Função</Label>
                  <Input id="signup-role-function" value={signupForm.roleFunction} onChange={(event) => updateSignupField('roleFunction', event.target.value)} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Telefone</Label>
                  <Input
                    id="signup-phone"
                    value={signupForm.phone}
                    onChange={(event) => updateSignupField('phone', event.target.value)}
                    placeholder="(11) 99999-9999 ou (11) 3333-3333"
                    required
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <Checkbox
                    checked={signupForm.phoneIsWhatsapp}
                    onCheckedChange={(checked) => updateSignupField('phoneIsWhatsapp', checked === true)}
                  />
                  WhatsApp
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" autoComplete="email" value={signupForm.email} onChange={(event) => updateSignupField('email', event.target.value)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" type="password" autoComplete="new-password" value={signupForm.password} onChange={(event) => updateSignupField('password', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
                  <Input id="signup-confirm-password" type="password" autoComplete="new-password" value={signupForm.confirmPassword} onChange={(event) => updateSignupField('confirmPassword', event.target.value)} required />
                </div>
              </div>
              {signupForm.password && signupForm.confirmPassword && signupForm.password !== signupForm.confirmPassword ? (
                <p className="text-sm text-destructive">As senhas não conferem.</p>
              ) : null}
              {operatorError ? <p className="text-sm text-destructive">{operatorError}</p> : null}
              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="w-full" onClick={() => setMode('login')} disabled={isLoading}>
                  Voltar
                </Button>
                <Button type="submit" className="w-full" disabled={!canSubmitSignup}>
                  {isLoading ? 'Criando...' : 'Criar conta'}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            A conta será validada no UHub ou enviada para ativação pela Uniodonto do Brasil.
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <img src={uniodontoLogo} alt="Uniodonto" className="h-12 w-auto" />
            <div className="space-y-1">
              <CardTitle className="text-xl">Painel Financeiro Contábil</CardTitle>
              <CardDescription>DIOPS Financeiro</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Digite seu email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>
            {onForgotPassword ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => onForgotPassword({ email: email.trim() })}
                  disabled={!canSendLink}
                >
                  Esqueci a senha
                </Button>
              </div>
            ) : null}
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
            {onSignUp ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setMode('signup')}
                disabled={isLoading}
              >
                Criar conta
              </Button>
            ) : null}
            {onGoogleLogin ? (
              <Button type="button" variant="outline" className="w-full" onClick={onGoogleLogin} disabled={isLoading}>
                Entrar com Google
              </Button>
            ) : null}
            {onSendEmailLink ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => onSendEmailLink({ email: email.trim() })}
                disabled={!canSendLink}
              >
                Enviar link de acesso
              </Button>
            ) : null}
            {isEmailLinkFlow && onCompleteEmailLink ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onCompleteEmailLink({ email: email.trim() })}
                disabled={!canSendLink}
              >
                Concluir login por link
              </Button>
            ) : null}
          </form>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Use as credenciais fornecidas pela equipe responsavel.
        </CardFooter>
      </Card>
    </div>
  )
}

export default LoginScreen
