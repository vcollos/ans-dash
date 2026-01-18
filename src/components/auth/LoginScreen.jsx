import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

function LoginScreen({ onLogin, isLoading = false, errorMessage = null }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isLoading

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    onLogin?.({ username: username.trim(), password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <img src="https://collos.com.br/wp-content/uploads/2024/12/logo_contag.png" alt="Contag" className="h-12 w-auto" />
            <div className="space-y-1">
              <CardTitle className="text-xl">Painel Regulatorio RN 518</CardTitle>
              <CardDescription>DIOPS Financeiro</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Digite seu usuario"
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
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
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
