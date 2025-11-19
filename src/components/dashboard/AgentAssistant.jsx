import { useMemo, useState } from 'react'
import { MessageCircle, SendHorizontal } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { ScrollArea } from '../ui/scroll-area'
import { askAgent } from '../../lib/agentApi'

function AgentAssistant({ context, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)

  const isInputDisabled = disabled || isSending
  const buttonLabel = disabled ? 'Carregando contexto...' : 'Falar com ChatGPT'

  async function handleSend() {
    if (!input.trim() || isSending || disabled) return
    const question = input.trim()
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setIsSending(true)
    setError(null)
    try {
      const reply = await askAgent(question, context)
      setMessages((prev) => [...prev, { role: 'assistant', text: reply.text || 'Sem resposta.', formula: reply.formula ?? null }])
    } catch (err) {
      console.error('[AgentAssistant] erro ao enviar pergunta', err)
      setError(err.message || 'Falha inesperada ao consultar o agente.')
      setMessages((prev) => prev.slice(0, -1))
      setInput(question)
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleSend()
    }
  }

  const emptyState = useMemo(
    () => (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
        <p>Explique o cenário atual ou tire dúvidas sobre os indicadores exibidos.</p>
        <p>As respostas consideram os filtros e valores que você está visualizando agora.</p>
      </div>
    ),
    [],
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2" disabled={disabled}>
          <MessageCircle className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assistente regulatório</DialogTitle>
          <DialogDescription>
            Converse com o agente treinado nos normativos da ANS. Ele utiliza os dados exibidos no painel e consulta os documentos oficiais
            no vector store para responder.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ScrollArea className="h-[320px] w-full rounded-md border p-4">
            {messages.length ? (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {message.role === 'assistant' ? 'Marinho' : 'Você'}
                    </p>
                    <p className="whitespace-pre-line text-sm text-foreground">{message.text}</p>
                    {message.formula ? (
                      <div
                        className="rounded-md border bg-muted/30 p-3 text-sm"
                        dangerouslySetInnerHTML={{ __html: katex.renderToString(message.formula, { throwOnError: false }) }}
                      />
                    ) : null}
                  </div>
                ))}
                {isSending ? <p className="text-xs text-muted-foreground">Consultando documentos...</p> : null}
              </div>
            ) : (
              emptyState
            )}
          </ScrollArea>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta. Use Ctrl+Enter ou ⌘+Enter para enviar."
              disabled={isInputDisabled}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>O agente recebe automaticamente o contexto dos filtros, KPIs, ranking e séries exibidos.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSend} disabled={isInputDisabled || !input.trim()} className="gap-2">
            <SendHorizontal className="h-4 w-4" />
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AgentAssistant
