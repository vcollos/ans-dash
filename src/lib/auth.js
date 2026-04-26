import { signOut } from 'firebase/auth'
import { auth } from './firebaseClient'

const FIREBASE_AUTH_MESSAGES = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado. Faça login ou use a recuperação de senha.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/invalid-api-key': 'Configuração de autenticação inválida. Avise a equipe responsável.',
  'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com a Uniodonto do Brasil.',
  'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/missing-password': 'Informe sua senha.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/popup-closed-by-user': 'Login com Google cancelado antes da conclusão.',
  'auth/cancelled-popup-request': 'Já existe uma janela de login com Google aberta.',
  'auth/popup-blocked': 'O navegador bloqueou a janela de login com Google.',
  'auth/too-many-requests': 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
  'auth/expired-action-code': 'Este link expirou. Solicite um novo link de acesso.',
  'auth/invalid-action-code': 'Este link de acesso não é válido. Solicite um novo link.',
}

export function getAuthErrorMessage(error, fallback = 'Falha ao autenticar.') {
  const code = error?.code
  if (code && FIREBASE_AUTH_MESSAGES[code]) {
    return FIREBASE_AUTH_MESSAGES[code]
  }
  const message = String(error?.message ?? '')
  const match = message.match(/\((auth\/[^)]+)\)/)
  if (match?.[1] && FIREBASE_AUTH_MESSAGES[match[1]]) {
    return FIREBASE_AUTH_MESSAGES[match[1]]
  }
  return fallback
}

async function getAuthToken() {
  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch (err) {
    console.warn('[auth] Falha ao obter ID token', err)
    return null
  }
}

function notifyAuthExpired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auth:expired'))
}

export async function fetchWithAuth(url, options = {}) {
  const headers = new Headers(options.headers ?? {})
  const token = await getAuthToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(url, { ...options, headers })
  if (response.status === 401) {
    try {
      await signOut(auth)
    } catch (err) {
      console.warn('[auth] Falha ao encerrar sessao', err)
    }
    notifyAuthExpired()
  }
  return response
}
