import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import {
  createAdminEmailTemplate,
  deleteAdminEmailTemplate,
  fetchBrevoConfig,
  fetchAdminEmailTemplates,
  previewAdminEmailTemplate,
  saveAdminEmailTemplate,
  saveBrevoConfig,
  sendAdminEmailTemplateTest,
} from '../../lib/accessProfile'

const EMPTY_TEMPLATE = {
  id: '',
  name: '',
  category: 'Custom',
  enabled: true,
  subject: '',
  preheader: '',
  text: '',
  html: '',
}
const EMPTY_BREVO_CONFIG = {
  enabled: false,
  apiKey: '',
  senderName: '',
  senderEmail: '',
  replyToEmail: '',
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cloneTemplate(template = EMPTY_TEMPLATE) {
  return {
    id: template.id ?? '',
    name: template.name ?? '',
    category: template.category ?? 'Custom',
    enabled: template.enabled !== false,
    subject: template.subject ?? '',
    preheader: template.preheader ?? '',
    text: template.text ?? '',
    html: template.html ?? '',
    system: template.system === true,
  }
}

function upsertTemplate(templates, nextTemplate) {
  if (!nextTemplate?.id) return templates
  const exists = templates.some((template) => template.id === nextTemplate.id)
  if (!exists) return [...templates, nextTemplate]
  return templates.map((template) => (template.id === nextTemplate.id ? nextTemplate : template))
}

export default function AdminEmailTemplatesPanel() {
  const [templates, setTemplates] = useState([])
  const [variables, setVariables] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState(EMPTY_TEMPLATE)
  const [isLoading, setIsLoading] = useState(false)
  const [actionKey, setActionKey] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [testEmail, setTestEmail] = useState('')
  const [testMessage, setTestMessage] = useState(null)
  const [isBrevoOpen, setIsBrevoOpen] = useState(false)
  const [brevoConfig, setBrevoConfig] = useState(EMPTY_BREVO_CONFIG)
  const [brevoMeta, setBrevoMeta] = useState({ hasApiKey: false, apiKeyMasked: null, updatedAt: null, updatedByEmail: null })

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [selectedId, templates],
  )

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setErrorMessage(null)
    fetchAdminEmailTemplates()
      .then((payload) => {
        if (cancelled) return
        setTemplates(payload.templates)
        setVariables(payload.variables)
        const first = payload.templates[0] ?? null
        setSelectedId(first?.id ?? '')
        setForm(cloneTemplate(first ?? EMPTY_TEMPLATE))
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err?.message ?? 'Falha ao carregar templates de email.')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      previewAdminEmailTemplate(form)
        .then((nextPreview) => {
          if (cancelled) return
          setPreview(nextPreview)
        })
        .catch(() => {
          if (cancelled) return
          setPreview({ subject: form.subject, preheader: form.preheader, text: form.text, html: form.html })
        })
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [form])

  useEffect(() => {
    if (!isBrevoOpen) return
    let cancelled = false
    fetchBrevoConfig()
      .then((config) => {
        if (cancelled) return
        setBrevoConfig({
          enabled: config.enabled === true,
          apiKey: '',
          senderName: config.senderName ?? '',
          senderEmail: config.senderEmail ?? '',
          replyToEmail: config.replyToEmail ?? '',
        })
        setBrevoMeta({
          hasApiKey: config.hasApiKey === true,
          apiKeyMasked: config.apiKeyMasked ?? null,
          updatedAt: config.updatedAt ?? null,
          updatedByEmail: config.updatedByEmail ?? null,
        })
      })
      .catch((err) => setErrorMessage(err?.message ?? 'Falha ao carregar configuração Brevo.'))
    return () => {
      cancelled = true
    }
  }, [isBrevoOpen])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setTestMessage(null)
  }

  function updateBrevoConfig(field, value) {
    setBrevoConfig((current) => ({ ...current, [field]: value }))
  }

  function selectTemplate(template) {
    setSelectedId(template.id)
    setForm(cloneTemplate(template))
    setErrorMessage(null)
  }

  function startNewTemplate() {
    setSelectedId('')
    setForm(EMPTY_TEMPLATE)
    setErrorMessage(null)
  }

  async function handleSave(event) {
    event.preventDefault()
    const isNew = !selectedTemplate
    setActionKey('save-template')
    setErrorMessage(null)
    try {
      const saved = isNew
        ? await createAdminEmailTemplate(form)
        : await saveAdminEmailTemplate(selectedTemplate.id, form)
      setTemplates((current) => upsertTemplate(current, saved))
      setSelectedId(saved.id)
      setForm(cloneTemplate(saved))
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao salvar template.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleDelete() {
    if (!selectedTemplate) return
    const confirmed = window.confirm(`Excluir template "${selectedTemplate.name}"?`)
    if (!confirmed) return
    setActionKey('delete-template')
    setErrorMessage(null)
    try {
      await deleteAdminEmailTemplate(selectedTemplate.id)
      setTemplates((current) => current.filter((template) => template.id !== selectedTemplate.id))
      setSelectedId('')
      setForm(EMPTY_TEMPLATE)
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao excluir template.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleSaveBrevoConfig(event) {
    event.preventDefault()
    setActionKey('save-brevo')
    setErrorMessage(null)
    try {
      const config = await saveBrevoConfig(brevoConfig)
      setBrevoConfig({
        enabled: config.enabled === true,
        apiKey: '',
        senderName: config.senderName ?? '',
        senderEmail: config.senderEmail ?? '',
        replyToEmail: config.replyToEmail ?? '',
      })
      setBrevoMeta({
        hasApiKey: config.hasApiKey === true,
        apiKeyMasked: config.apiKeyMasked ?? null,
        updatedAt: config.updatedAt ?? null,
        updatedByEmail: config.updatedByEmail ?? null,
      })
      setIsBrevoOpen(false)
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao salvar configuração Brevo.')
    } finally {
      setActionKey(null)
    }
  }

  async function handleSendTest() {
    setActionKey('send-test')
    setErrorMessage(null)
    setTestMessage(null)
    try {
      await sendAdminEmailTemplateTest({ to: testEmail, template: form })
      setTestMessage(`Teste enviado para ${testEmail}.`)
    } catch (err) {
      setErrorMessage(err?.message ?? 'Falha ao enviar teste.')
    } finally {
      setActionKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando templates...
      </div>
    )
  }

  return (
    <>
    <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.8fr)]">
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Emails do sistema</h3>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setIsBrevoOpen(true)}>
              Brevo
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={startNewTemplate}>
              Novo
            </Button>
          </div>
        </div>
        <div className="max-h-[620px] space-y-2 overflow-auto">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template)}
              className={
                selectedId === template.id
                  ? 'w-full rounded-md border bg-primary px-3 py-2 text-left text-sm text-primary-foreground'
                  : 'w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-muted'
              }
            >
              <span className="block font-medium">{template.name}</span>
              <span className="block text-xs opacity-80">{template.category} · {template.id}</span>
            </button>
          ))}
        </div>
      </div>

      <form className="space-y-4 rounded-md border p-4" onSubmit={handleSave}>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="ID do template"
            value={form.id}
            disabled={Boolean(selectedTemplate)}
            onChange={(event) => updateForm('id', event.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Nome"
            value={form.name}
            onChange={(event) => updateForm('name', event.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Categoria"
            value={form.category}
            onChange={(event) => updateForm('category', event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => updateForm('enabled', event.target.checked)}
            />
            Ativo
          </label>
        </div>
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Assunto"
          value={form.subject}
          onChange={(event) => updateForm('subject', event.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Preheader"
          value={form.preheader}
          onChange={(event) => updateForm('preheader', event.target.value)}
        />
        <textarea
          className="min-h-[180px] w-full rounded-md border px-3 py-2 font-mono text-xs"
          placeholder="Texto simples"
          value={form.text}
          onChange={(event) => updateForm('text', event.target.value)}
        />
        <textarea
          className="min-h-[260px] w-full rounded-md border px-3 py-2 font-mono text-xs"
          placeholder="HTML"
          value={form.html}
          onChange={(event) => updateForm('html', event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={actionKey === 'save-template'}>
            {actionKey === 'save-template' ? 'Salvando...' : 'Salvar template'}
          </Button>
          {selectedTemplate ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={actionKey === 'delete-template'}
            >
              {actionKey === 'delete-template' ? 'Excluindo...' : 'Excluir'}
            </Button>
          ) : null}
          {errorMessage ? <span className="text-sm text-destructive">{errorMessage}</span> : null}
        </div>
        <div className="grid gap-2 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            type="email"
            placeholder="email@dominio.com para teste"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
          />
          <Button type="button" variant="outline" onClick={handleSendTest} disabled={!testEmail || actionKey === 'send-test'}>
            {actionKey === 'send-test' ? 'Enviando...' : 'Enviar teste'}
          </Button>
          {testMessage ? <p className="text-sm text-emerald-700 md:col-span-2">{testMessage}</p> : null}
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Preview</h3>
            <span className="text-xs text-muted-foreground">dados de exemplo</span>
          </div>
          <div className="mt-3 rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Assunto</p>
            <p className="text-sm">{preview?.subject || '—'}</p>
            {preview?.preheader ? <p className="mt-1 text-xs text-muted-foreground">{preview.preheader}</p> : null}
          </div>
          <iframe
            title="Preview do email"
            className="mt-3 h-[420px] w-full rounded-md border bg-white"
            srcDoc={preview?.html || '<p style="font-family:Arial;padding:16px;">Sem HTML para preview.</p>'}
          />
        </div>

        <div className="rounded-md border p-3">
          <h3 className="text-sm font-semibold">Variáveis disponíveis</h3>
          <div className="mt-3 max-h-[360px] space-y-2 overflow-auto">
            {variables.map((variable) => (
              <div key={variable.shortcode} className="rounded-md border bg-muted/20 p-2">
                <code className="text-xs font-semibold">{variable.shortcode}</code>
                {variable.alias ? <code className="ml-2 text-xs text-muted-foreground">{variable.alias}</code> : null}
                <p className="mt-1 text-xs text-muted-foreground">{variable.description}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
    <Dialog open={isBrevoOpen} onOpenChange={setIsBrevoOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <h2 className="text-lg font-semibold">Brevo API</h2>
          <p className="text-sm text-muted-foreground">Configuração transacional usada pelos emails do sistema.</p>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSaveBrevoConfig}>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={brevoConfig.enabled}
              onChange={(event) => updateBrevoConfig('enabled', event.target.checked)}
            />
            Ativar envio transacional via Brevo API
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-md border px-3 py-2 text-sm"
              type="password"
              autoComplete="new-password"
              placeholder={brevoMeta.hasApiKey ? `API key (${brevoMeta.apiKeyMasked})` : 'API key Brevo'}
              value={brevoConfig.apiKey}
              onChange={(event) => updateBrevoConfig('apiKey', event.target.value)}
            />
            <input
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Nome do remetente"
              value={brevoConfig.senderName}
              onChange={(event) => updateBrevoConfig('senderName', event.target.value)}
            />
            <input
              className="rounded-md border px-3 py-2 text-sm"
              type="email"
              placeholder="E-mail remetente"
              value={brevoConfig.senderEmail}
              onChange={(event) => updateBrevoConfig('senderEmail', event.target.value)}
            />
            <input
              className="rounded-md border px-3 py-2 text-sm"
              type="email"
              placeholder="Reply-to (opcional)"
              value={brevoConfig.replyToEmail}
              onChange={(event) => updateBrevoConfig('replyToEmail', event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={actionKey === 'save-brevo'}>
              {actionKey === 'save-brevo' ? 'Salvando...' : 'Salvar Brevo'}
            </Button>
            {brevoMeta.updatedAt ? (
              <span className="text-xs text-muted-foreground">
                Atualizado em {formatDateTime(brevoMeta.updatedAt)} por {brevoMeta.updatedByEmail ?? '—'}
              </span>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
