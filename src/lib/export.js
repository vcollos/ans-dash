function toCsv(rows, columns, summaryRow = null) {
  const header = columns.join(';')
  const outputRows = summaryRow ? [...rows, summaryRow] : rows
  const body = outputRows
    .map((row) =>
      columns
        .map((column) => {
          const value = row[column]
          if (value === null || value === undefined) {
            return ''
          }
          if (typeof value === 'number') {
            return String(value).replace('.', ',')
          }
          const sanitized = String(value).replace(/"/g, '""')
          return `"${sanitized}"`
        })
        .join(';'),
    )
    .join('\n')
  return `${header}\n${body}`
}

function sumNumeric(rows, key) {
  if (!rows?.length) return null
  let total = 0
  let hasValue = false
  rows.forEach((row) => {
    if (!row) return
    const raw = row[key]
    const value = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(value)) return
    total += value
    hasValue = true
  })
  return hasValue ? total : null
}

function buildPrestadoresSummaryRow(rows, columns) {
  const total = sumNumeric(rows, 'qt_prestadores')
  if (total === null || !columns?.length) return null
  const summary = {}
  const hasPrestadores = columns.includes('qt_prestadores')
  const labelColumn = columns.includes('nome_operadora') ? 'nome_operadora' : columns[0]
  if (labelColumn) {
    summary[labelColumn] = hasPrestadores ? 'TOTAL PRESTADORES' : `TOTAL PRESTADORES: ${total}`
  }
  if (hasPrestadores) {
    summary.qt_prestadores = total
  }
  return summary
}

export function downloadCsv({ rows, columns }, filename = 'relatorio_diops.csv', options = {}) {
  if (!rows?.length || !columns?.length) {
    return
  }
  const summaryRow = options.includePrestadoresTotal ? buildPrestadoresSummaryRow(rows, columns) : null
  const csv = toCsv(rows, columns, summaryRow)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadJson(data, filename = 'relatorio_diops.json', options = {}) {
  let payload = data
  if (options.includePrestadoresTotal) {
    const total = sumNumeric(data, 'qt_prestadores')
    payload = {
      rows: data ?? [],
      summary: {
        total_prestadores: total,
      },
    }
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
