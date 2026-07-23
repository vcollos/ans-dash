const ACCOUNT_DESCRIPTION_NOT_FOUND_PATTERN = /^Descri\u00e7\u00e3o n\u00e3o encontrada para a conta [0-9.\s-]+\.$/

export function isIgnorableAccountDescriptionError(message) {
  return ACCOUNT_DESCRIPTION_NOT_FOUND_PATTERN.test(String(message ?? '').trim())
}

export function buildIgnoredAccountDescriptionIssue({ row, code, message }) {
  return {
    row,
    codigo: String(code ?? '').trim() || null,
    motivo: String(message ?? '').trim(),
  }
}
