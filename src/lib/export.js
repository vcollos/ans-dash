function toCsv(rows, columns) {
  const header = columns.join(';')
  const body = rows
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

export function downloadCsv({ rows, columns }, filename = 'relatorio_diops.csv') {
  if (!rows?.length || !columns?.length) {
    return
  }
  const csv = toCsv(rows, columns)
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

export function downloadJson(data, filename = 'relatorio_diops.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
