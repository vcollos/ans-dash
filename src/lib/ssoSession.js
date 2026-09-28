// Session credentials stay in HttpOnly cookies. Only CSRF and UI state live in memory.
let state = { status: 'legacy', csrf: null, user: null }
export const getSsoState = () => state
export const isSsoSessionActive = () => state.status === 'active'
export function setSsoState(next) { state = next }
export function ssoRequestOptions(options = {}, session = state) {
  const headers = new Headers(options.headers)
  headers.delete('Authorization')
  headers.delete('X-Auth-Token')
  headers.delete('X-Dev-Auth-Bypass')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(String(options.method ?? 'GET').toUpperCase()) && session.csrf) {
    headers.set('x-csrf-token', session.csrf)
  }
  return { ...options, headers, credentials: 'same-origin', cache: 'no-store' }
}
export async function readSsoSession() {
  const response = await fetch('/api/auth/sso/session', { credentials: 'same-origin', cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (response.status === 404 || (response.status === 401 && payload.code === 'SSO_NO_SESSION')) {
    return { status: 'legacy', csrf: null, user: null, available: response.status !== 404 }
  }
  if (!response.ok || payload.user?.authSource !== 'uhub-sso' || !payload.user?.uid || !payload.csrf || payload.expiresAt * 1000 <= Date.now()) {
    throw new Error(response.status === 401 || response.status === 403
      ? 'Sua sessão UHub expirou ou o acesso não foi autorizado. Entre novamente pelo UHub.'
      : 'O acesso pelo UHub está indisponível. Tente novamente em instantes.')
  }
  return { status: 'active', csrf: payload.csrf, user: payload.user }
}
