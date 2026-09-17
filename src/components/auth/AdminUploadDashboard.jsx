import { useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { buildUploadDashboard, uploadDashboardCsv } from '../../lib/adminUploadDashboard'

const fieldClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const dateTime = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('pt-BR') : 'Não informado'

export default function AdminUploadDashboard({ report, accounts, actionKey, onRefresh, onUpload, onDelete }) {
  const [period, setPeriod] = useState('')
  const [periodChoice, setPeriodChoice] = useState('')
  const [operator, setOperator] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const all = useMemo(() => buildUploadDashboard(report, { period }, accounts), [report, period, accounts])
  const items = useMemo(() => buildUploadDashboard(report, { period, operator, status, search }, accounts), [report, period, operator, status, search, accounts])
  const sent = all.filter((item) => item.sent).length
  const never = all.filter((item) => item.neverSubmitted).length
  const uploadCount = all.reduce((total, item) => total + item.selectedUploads.length, 0)
  const historicalCount = all.reduce((total, item) => total + item.totalUploads, 0)

  async function refresh() {
    setRefreshing(true)
    setError('')
    try { await onRefresh() } catch (err) { setError(err?.message || 'Não foi possível atualizar os envios.') } finally { setRefreshing(false) }
  }

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([uploadDashboardCsv(items, period)], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `acompanhamento-envios-${period || 'historico'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-4" aria-label="Dashboard de envios de balancete" aria-busy={refreshing}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Envios de balancete</h2>
          <p className="text-sm text-muted-foreground">Acompanhe as operadoras e organize a cobrança manual.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing || Boolean(actionKey)}>{refreshing ? 'Atualizando…' : 'Atualizar dados'}</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!items.length || refreshing}>Exportar lista filtrada (CSV)</Button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error} Os dados abaixo são da última consulta.</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Operadoras acompanhadas', all.length, 'Catálogo e histórico de envios'],
          [period ? `Enviaram em ${period}` : 'Já enviaram', sent, period ? 'Ao menos um envio no período' : 'Ao menos um envio no histórico'],
          [period ? `Sem envio em ${period}` : 'Sem envio registrado', all.length - sent, 'Ausência de registro no recorte'],
          ['Nunca enviaram', never, 'Em todo o histórico disponível'],
          ['Envios no recorte', uploadCount, `${historicalCount} envios no histórico disponível`],
        ].map(([label, value, detail]) => <div key={label} className="rounded-lg border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="my-1 text-3xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div>)}
      </div>
      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-xs font-medium">Buscar<input className={fieldClass} type="search" placeholder="Nome, ANS, e-mail ou arquivo" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">Período
          <select className={fieldClass} value={periodChoice} onChange={(event) => {
            setPeriodChoice(event.target.value)
            if (event.target.value !== 'custom') setPeriod(event.target.value)
          }}>
            <option value="">Todo o histórico</option>
            {(report.periods ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
            <option value="custom">Outro período</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">Situação<select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todas</option><option value="sent">Enviaram no recorte</option><option value="missing">Sem envio no recorte</option><option value="never">Nunca enviaram</option></select></label>
        <label className="space-y-1 text-xs font-medium">Operadora<select className={fieldClass} value={operator} onChange={(event) => setOperator(event.target.value)}><option value="">Todas as operadoras</option>{(report.operators ?? []).map((item) => <option key={item.regAns} value={item.regAns}>{item.operatorName} · {item.regAns}</option>)}</select></label>
        {periodChoice === 'custom' && (
          <form className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-4" onSubmit={(event) => {
            event.preventDefault()
            const value = new FormData(event.currentTarget).get('customPeriod')
            if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) setPeriod(value)
          }}>
            <label className="space-y-1 text-xs font-medium">Escolha outro período
              <input className={fieldClass} type="month" name="customPeriod" defaultValue={period} required />
            </label>
            <Button type="submit" size="sm" variant="outline">Aplicar período</Button>
            <p className="text-xs text-muted-foreground">Permite consultar um período mesmo sem envios registrados.</p>
          </form>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-4"><Button size="sm" variant="ghost" onClick={() => { setPeriod(''); setPeriodChoice(''); setOperator(''); setStatus(''); setSearch('') }}>Limpar filtros</Button><p className="text-xs text-muted-foreground">{period ? `Recorte: ${period}.` : 'Recorte: todo o histórico.'} Os cartões consideram todas as operadoras; a lista aplica os demais filtros.</p></div>
      </div>
      <p className="text-xs text-muted-foreground">{report.historyNote || 'O histórico disponível não inclui envios excluídos. “Nunca enviou” significa ausência de registro nesse histórico.'} Ausência de envio não define atraso ou obrigação.</p>
      <p className="text-sm text-muted-foreground" role="status">{items.length} de {all.length} operadora(s) na lista. O CSV contém esta lista e seus contatos cadastrados; nenhuma mensagem é enviada.</p>
      {!items.length && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{all.length ? 'Nenhuma operadora corresponde aos filtros. Ajuste a busca ou limpe os filtros.' : 'Nenhuma operadora disponível no relatório.'}</div>}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.regAns} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="break-words font-semibold">{item.operatorName}</h3><p className="text-xs text-muted-foreground">Registro ANS {item.regAns}</p></div>
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${item.sent ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{item.neverSubmitted ? 'Nunca enviou' : item.sent ? 'Enviou no recorte' : 'Sem envio no recorte'}</span>
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Envios no recorte / histórico</dt><dd className="font-medium">{item.selectedUploads.length} / {item.totalUploads}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Períodos enviados (histórico)</dt><dd className="break-words">{item.periodsSent?.join(', ') || 'Nenhum'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Último envio (histórico)</dt><dd>{item.lastUpload ? dateTime(item.lastUpload.uploadedAt) : 'Sem registro'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Contatos cadastrados</dt><dd className="break-all">{item.contacts.join(', ') || 'Nenhum contato cadastrado'}</dd></div>
            </dl>
            <div className="mt-3"><Button size="sm" variant="outline" disabled={Boolean(actionKey)} onClick={() => onUpload({ ...item, competencia: period || null, status: item.sent ? 'enviado' : 'pendente' })}>{item.sent ? 'Atualizar' : 'Enviar'}</Button></div>
            <details className="mt-3 border-t pt-3">
              <summary className="cursor-pointer text-sm font-medium">Ver histórico do recorte ({item.selectedUploads.length})</summary>
              {!item.selectedUploads.length ? <p className="mt-3 text-sm text-muted-foreground">Nenhum envio registrado{period ? ` em ${period}` : ''}.</p> : <div className="mt-3 space-y-3">{item.selectedUploads.map((upload) => <div key={upload.uploadId} className="rounded-md bg-muted/30 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{(upload.competencias ?? [upload.competencia]).filter(Boolean).join(', ') || 'Período não informado'} · {dateTime(upload.uploadedAt)}</p>{upload.uploadId && <Button size="sm" variant="outline" disabled={Boolean(actionKey)} onClick={() => onDelete({ ...item, competencia: upload.competencia, upload })}>{actionKey === `delete-upload:${upload.uploadId}` ? 'Excluindo…' : 'Excluir'}</Button>}</div><dl className="mt-2 grid gap-2 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Remetente (quem enviou)</dt><dd className="break-all">{upload.uploadedByEmail || 'Não registrado'}</dd></div><div><dt className="text-xs text-muted-foreground">Responsável declarado</dt><dd className="break-all">{upload.responsavelEmail || 'Não informado'}</dd></div><div><dt className="text-xs text-muted-foreground">Arquivo</dt><dd className="break-all">{upload.sourceFileName || 'Não informado'}</dd></div><div><dt className="text-xs text-muted-foreground">Linhas processadas</dt><dd>{upload.rowCount ?? 'Não informado'}</dd></div></dl></div>)}</div>}
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}
