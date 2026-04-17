import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading
  const canSendLink = email.trim().length > 0 && !isLoading

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    onLogin?.({ email: email.trim(), password })
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
                onClick={() => onSignUp({ email: email.trim(), password })}
                disabled={!canSubmit}
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
