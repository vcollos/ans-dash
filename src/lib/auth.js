const STORAGE_KEY = 'ans-dashboard:auth-token'
let memoryToken = null

export function getAuthToken() {
  if (memoryToken) return memoryToken
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (value && value.trim().length) {
      memoryToken = value
      return value
    }
    return null
  } catch (err) {
    console.warn('[auth] Falha ao acessar localStorage', err)
    return null
  }
}

export function setAuthToken(token) {
  memoryToken = token || null
  if (typeof window === 'undefined') return
  if (!token) {
    clearAuthToken()
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, token)
  } catch (err) {
    console.warn('[auth] Falha ao salvar token', err)
  }
}

export function clearAuthToken() {
  memoryToken = null
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn('[auth] Falha ao remover token', err)
  }
}

function notifyAuthExpired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auth:expired'))
}

export async function fetchWithAuth(url, options = {}) {
  const headers = new Headers(options.headers ?? {})
  const token = getAuthToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(url, { ...options, headers })
  if (response.status === 401 || response.status === 403) {
    clearAuthToken()
    notifyAuthExpired()
  }
  return response
}

export async function login({ username, password }) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).error ?? 'Falha ao autenticar.'
    throw new Error(message)
  }
  const payload = await response.json()
  if (!payload?.token) {
    throw new Error('Token de autenticacao ausente.')
  }
  return payload
}

export async function logout() {
  const token = getAuthToken()
  if (!token) return
  try {
    await fetchWithAuth('/api/logout', { method: 'POST' })
  } catch (err) {
    console.warn('[auth] Falha ao encerrar sessao', err)
  }
  clearAuthToken()
}
