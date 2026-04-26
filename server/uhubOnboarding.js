import crypto from 'crypto'

export const APPROVAL_STATUS = {
  AUTO_APPROVED: 'auto_aprovado',
  PENDING: 'pendente',
  MANUAL_APPROVED: 'aprovado_manual',
  REJECTED: 'rejeitado',
  PENDING_REVIEW: 'pendente_revisao',
}

export function normalizeEmailForUhub(value) {
  const email = String(value ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) return null
  return email
}

export function normalizePhoneForUhub(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`
  }
  if (digits.length < 10) return null
  return digits
}

export function uniquePessoaIds(items = []) {
  return [
    ...new Set(
      items
        .map((item) => String(item?.pessoa_id ?? item?.pessoaId ?? item?.id ?? '').trim())
        .filter(Boolean),
    ),
  ]
}

export function decideUhubMatch({ emailResults = [], phoneResults = [] } = {}) {
  const idsEmail = uniquePessoaIds(emailResults)
  const idsPhone = uniquePessoaIds(phoneResults)

  if (idsEmail.length > 1 || idsPhone.length > 1) {
    return { approved: false, reason: 'ambiguo', idsEmail, idsPhone }
  }
  if (!idsEmail.length && !idsPhone.length) {
    return { approved: false, reason: 'sem_match', idsEmail, idsPhone }
  }
  if (idsEmail.length && idsPhone.length && idsEmail[0] !== idsPhone[0]) {
    return { approved: false, reason: 'conflito_canais', idsEmail, idsPhone }
  }

  const pessoaId = idsEmail[0] ?? idsPhone[0]
  const matchBy = idsEmail.length && idsPhone.length ? 'ambos' : idsEmail.length ? 'email' : 'telefone'
  return {
    approved: true,
    reason: 'match_seguro',
    pessoaId,
    matchBy,
    idsEmail,
    idsPhone,
  }
}

export function isInactiveUhubPerson(person = {}) {
  const status = String(
    person?.status_cadastro ?? person?.statusCadastro ?? person?.status ?? person?.situacao ?? '',
  )
    .trim()
    .toLowerCase()
  const deletedAt = person?.deleted_at ?? person?.deletedAt ?? person?.excluido_em ?? person?.excluidoEm
  if (deletedAt) return true
  return ['inativo', 'inativa', 'desligado', 'desligada', 'excluido', 'excluida', 'deleted', 'inactive'].includes(status)
}

export function safeHash(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

export function last4(value) {
  const text = String(value ?? '').trim()
  return text ? text.slice(-4) : null
}

