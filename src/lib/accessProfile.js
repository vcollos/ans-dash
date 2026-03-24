import { fetchWithAuth } from './auth'

export async function fetchAccessProfile() {
  const response = await fetchWithAuth('/api/auth/profile')
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload?.error ?? 'Falha ao carregar perfil de acesso.')
    error.code = payload?.code ?? null
    throw error
  }
  return {
    uid: payload?.uid ?? null,
    email: payload?.email ?? null,
    enforced: payload?.enforced === true,
    isAdmin: payload?.isAdmin === true,
    operators: Array.isArray(payload?.operators)
      ? payload.operators.map((item) => ({
          regAns: String(item?.regAns ?? '').trim(),
          operatorName: String(item?.operatorName ?? '').trim() || null,
          canUpload: item?.canUpload === false ? false : true,
        }))
      : [],
    allowedRegAns: Array.isArray(payload?.allowedRegAns) ? payload.allowedRegAns : [],
    canUploadRegAns: Array.isArray(payload?.canUploadRegAns) ? payload.canUploadRegAns : [],
    noAccess: payload?.noAccess === true,
  }
}
