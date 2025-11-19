function extractFormula(answer = '') {
  const match = answer.match(/\{[\s\S]*"tool"\s*:\s*"renderFormula"[\s\S]*\}$/)
  if (!match) return { text: answer.trim(), formula: null }
  let formula = null
  try {
    const parsed = JSON.parse(match[0])
    if (parsed?.latex) {
      formula = parsed.latex
    }
  } catch (err) {
    console.warn('[agentApi] Falha ao analisar fórmula', err)
  }
  const text = answer.slice(0, match.index).trim()
  return { text, formula }
}

export async function askAgent(question, context) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, context }),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))).error ?? `Falha ao consultar agente (${response.status})`
    throw new Error(error)
  }
  const payload = await response.json()
  const answer = payload.answer ?? ''
  return extractFormula(answer)
}
