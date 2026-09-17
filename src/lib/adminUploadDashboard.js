export function buildUploadDashboard(report, { period = '', operator = '', status = '', search = '' } = {}, accounts = []) {
  const query = normalize(search)
  return (report.operators ?? []).map((item) => {
    const history = (report.uploads ?? []).filter((upload) => String(upload.regAns) === String(item.regAns))
    const selectedUploads = period ? history.filter((upload) => (upload.competencias ?? [upload.competencia]).includes(period)) : history
    const contacts = [...new Set(accounts.filter((account) => {
      const links = account.accessLinks ?? []
      return links.length ? links.some((link) => link.active !== false && String(link.regAns) === String(item.regAns)) : String(account.accessRegAns ?? account.regAns) === String(item.regAns)
    }).map((account) => account.email).filter(Boolean))]
    return { ...item, history, selectedUploads, contacts, sent: selectedUploads.length > 0 }
  }).filter((item) => (!operator || String(item.regAns) === operator)
    && (!status || (status === 'sent' ? item.sent : status === 'never' ? item.neverSubmitted : !item.sent))
    && (!query || normalize([item.operatorName, item.regAns, ...item.contacts, ...item.history.flatMap((upload) => [upload.uploadedByEmail, upload.responsavelEmail, upload.sourceFileName])].join(' ')).includes(query)))
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function uploadDashboardCsv(items, period) {
  const escape = (value) => {
    let text = String(value ?? '')
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  const rows = [['Operadora', 'Registro ANS', 'Período consultado', 'Situação no recorte', 'Envios no recorte', 'Envios no histórico disponível', 'Períodos enviados', 'Nunca enviou no histórico disponível', 'Contatos cadastrados', 'Último envio', 'Remetente do último envio', 'Responsável declarado no último envio'], ...items.map((item) => [item.operatorName, item.regAns, period || 'Todo o histórico', item.sent ? 'Enviou' : 'Sem envio', item.selectedUploads.length, item.totalUploads, (item.periodsSent ?? []).join(', '), item.neverSubmitted ? 'Sim' : 'Não', item.contacts.join(', '), item.lastUpload?.uploadedAt, item.lastUpload?.uploadedByEmail, item.lastUpload?.responsavelEmail])]
  return '\uFEFF' + rows.map((row) => row.map(escape).join(';')).join('\r\n')
}
