import { fetchWithAuth } from './auth'

function mapAccessProfilePayload(payload = {}) {
  const registrationProfile = payload?.registrationProfile
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
    approvalStatus: payload?.approvalStatus ?? null,
    approvalReason: payload?.approvalReason ?? null,
    canAccess: payload?.canAccess !== false,
    uhubLink: payload?.uhubLink ?? null,
    requiresProfileCompletion: payload?.requiresProfileCompletion === true,
    registrationProfile: registrationProfile
      ? {
          firstName: String(registrationProfile?.firstName ?? '').trim() || null,
          lastName: String(registrationProfile?.lastName ?? '').trim() || null,
          phone: String(registrationProfile?.phone ?? '').trim() || null,
          phoneIsWhatsapp: registrationProfile?.phoneIsWhatsapp === true,
          email: String(registrationProfile?.email ?? '').trim() || null,
          jobTitle: String(registrationProfile?.jobTitle ?? '').trim() || null,
          roleFunction: String(registrationProfile?.roleFunction ?? '').trim() || null,
          department: String(registrationProfile?.department ?? '').trim() || null,
          regAns: String(registrationProfile?.regAns ?? '').trim() || null,
          operatorName: String(registrationProfile?.operatorName ?? '').trim() || null,
          isCompleted: registrationProfile?.isCompleted === true,
        }
      : null,
  }
}

export async function fetchAccessProfile() {
  const response = await fetchWithAuth('/api/auth/profile')
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload?.error ?? 'Falha ao carregar perfil de acesso.')
    error.code = payload?.code ?? null
    throw error
  }
  return mapAccessProfilePayload(payload)
}

export async function fetchOperatorsCatalog() {
  const response = await fetch('/api/onboarding/operators')
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload?.error ?? 'Falha ao carregar lista de operadoras.')
    error.code = payload?.code ?? null
    throw error
  }
  return Array.isArray(payload?.operators)
    ? payload.operators
        .map((item) => ({
          regAns: String(item?.regAns ?? '').trim(),
          operatorName: String(item?.operatorName ?? '').trim() || null,
        }))
        .filter((item) => item.regAns)
    : []
}

export async function saveProfileCompletion(formData = {}) {
  const response = await fetchWithAuth('/api/auth/profile/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload?.error ?? 'Falha ao salvar dados do cadastro.')
    error.code = payload?.code ?? null
    throw error
  }
  return mapAccessProfilePayload(payload)
}

export async function fetchPendingAccounts() {
  const response = await fetchWithAuth('/api/admin/accounts/pending')
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Falha ao carregar contas pendentes.')
  }
  return Array.isArray(payload?.accounts) ? payload.accounts : []
}

export async function approveAccount(uid) {
  const response = await fetchWithAuth(`/api/admin/accounts/${encodeURIComponent(uid)}/approve`, {
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Falha ao aprovar conta.')
  }
  return payload?.account ?? null
}

export async function rejectAccount(uid, reason = '') {
  const response = await fetchWithAuth(`/api/admin/accounts/${encodeURIComponent(uid)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Falha ao rejeitar conta.')
  }
  return payload?.account ?? null
}
