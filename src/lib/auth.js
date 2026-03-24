import { signOut } from 'firebase/auth'
import { auth } from './firebaseClient'

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
