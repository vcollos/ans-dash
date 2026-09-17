export function validateReportCompetencia(value) {
  if (value === undefined) return null
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    const error = new Error('Competência inválida. Use AAAA-MM.')
    error.statusCode = 400
    throw error
  }
  return value
}

const latestFirst = (a, b) => String(b.uploadedAt ?? '').localeCompare(String(a.uploadedAt ?? '')) ||
  String(b.uploadId ?? '').localeCompare(String(a.uploadId ?? ''))

export function buildUploadReport(catalog, sourceUploads, requestedPeriod = null) {
  const operatorMap = new Map(catalog.map((operator) => [operator.regAns, operator]))
  const grouped = new Map()
  for (const upload of [...sourceUploads].sort(latestFirst)) {
    if (!operatorMap.has(upload.regAns)) {
      operatorMap.set(upload.regAns, {
        regAns: upload.regAns,
        operatorName: upload.operatorName || `Operadora ${upload.regAns ?? 'não identificada'}`,
      })
    }
    const key = JSON.stringify([upload.regAns, upload.uploadId, upload.competencia])
    if (!grouped.has(key)) grouped.set(key, upload)
  }
  const periodUploads = [...grouped.values()]
  const periods = [...new Set([...periodUploads.map((upload) => upload.competencia), requestedPeriod]
    .filter(Boolean))].sort((a, b) => b.localeCompare(a))
  const uploadsByOperator = new Map()
  const uploadsByPeriod = new Map()
  for (const upload of periodUploads) {
    const operatorUploads = uploadsByOperator.get(upload.regAns) ?? new Map()
    const existing = operatorUploads.get(upload.uploadId)
    if (existing) {
      existing.competencias = [...new Set([...existing.competencias, upload.competencia].filter(Boolean))].sort().reverse()
      existing.rowCount += upload.rowCount
    } else {
      operatorUploads.set(upload.uploadId, { ...upload, competencias: upload.competencia ? [upload.competencia] : [] })
    }
    uploadsByOperator.set(upload.regAns, operatorUploads)
    const periodKey = JSON.stringify([upload.regAns, upload.competencia])
    const items = uploadsByPeriod.get(periodKey) ?? []
    items.push(upload)
    uploadsByPeriod.set(periodKey, items)
  }
  const operators = [...operatorMap.values()].sort((a, b) => a.operatorName.localeCompare(b.operatorName))
    .map((operator) => {
      const uploads = [...(uploadsByOperator.get(operator.regAns)?.values() ?? [])].sort(latestFirst)
      return {
        regAns: operator.regAns,
        operatorName: operator.operatorName,
        totalUploads: uploads.length,
        periodsSent: [...new Set(uploads.flatMap((upload) => upload.competencias))].sort().reverse(),
        lastUpload: uploads[0] ?? null,
        neverSubmitted: uploads.length === 0,
      }
    })
  const rows = operators.flatMap((operator) => (periods.length ? periods : [null]).map((competencia) => {
    const uploads = uploadsByPeriod.get(JSON.stringify([operator.regAns, competencia])) ?? []
    return {
      regAns: operator.regAns,
      operatorName: operator.operatorName,
      competencia,
      status: uploads.length ? 'enviado' : 'pendente',
      upload: uploads[0] ?? null,
      uploads,
      uploadCount: uploads.length,
    }
  }))
  const uploads = [...uploadsByOperator.values()].flatMap((items) => [...items.values()]).sort(latestFirst)
  const sent = rows.filter((row) => row.status === 'enviado').length
  return {
    periods,
    rows,
    operators,
    uploads,
    historyNote: 'Contagens e “nunca enviou” consideram somente o histórico disponível. Envios excluídos não podem ser reconstruídos. Períodos sem envio não representam um calendário obrigatório de entrega.',
    summary: {
      operators: operators.length,
      periods: periods.length,
      sent,
      pending: rows.length - sent,
      totalUploads: uploads.length,
      neverSubmitted: operators.filter((operator) => operator.neverSubmitted).length,
      operatorsWithUploads: operators.filter((operator) => !operator.neverSubmitted).length,
    },
  }
}
