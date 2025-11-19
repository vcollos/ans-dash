import OpenAI from 'openai'
import { tool, fileSearchTool, Agent, Runner, withTrace } from '@openai/agents'
import { z } from 'zod'

const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID ?? 'vs_691d04557eac8191a3dbed8d80a90e4a'
const AGENT_MODEL = process.env.OPENAI_AGENT_MODEL ?? 'gpt-4.1-mini-2025-04-14'
const WORKFLOW_ID = process.env.OPENAI_WORKFLOW_ID ?? 'wf_691cf24519088190be4a330d067c011605a94df9a2f95438'
const WORKFLOW_VERSION = process.env.OPENAI_WORKFLOW_VERSION ?? 'draft'

const renderFormula = tool({
  name: 'renderFormula',
  description:
    'Renderiza fórmulas matemáticas em LaTeX para uso no frontend. Esta função deve ser chamada exclusivamente quando uma fórmula for solicitada.',
  parameters: z.object({
    latex: z.string(),
  }),
  execute: async (input) => ({ latex: input.latex }),
})

const fileSearch = fileSearchTool([VECTOR_STORE_ID])

let cachedAgent = null
let cachedClient = null

function ensureClient() {
  if (cachedClient) return cachedClient
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada')
  }
  cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return cachedClient
}

function ensureAgent() {
  if (cachedAgent) return cachedAgent
  cachedAgent = new Agent({
    name: 'Marinho',
    model: AGENT_MODEL,
    tools: [renderFormula, fileSearch],
    instructions: `Você é um agente regulatório especializado nas normativas da Agência Nacional de Saúde Suplementar (ANS), atuando como consultor contábil e técnico para operadoras odontológicas, especialmente cooperativas do Sistema Uniodonto.

Seu comportamento deve obedecer rigorosamente às regras abaixo.

🧠 FONTES PERMITIDAS
Você só pode usar informação proveniente dos arquivos presentes no Vector Store deste agente, incluindo RN 518/528/574/630, PPCNG, Indicadores_RN-518-2022.pdf e manuais do DIOPS. Nenhuma informação externa é permitida. Se a informação solicitada não estiver em um dos arquivos responda: "Essa informação não está disponível nos documentos fornecidos."

🔍 HARD RETRIEVAL MODE
Antes de responder, execute File Search com a pergunta do usuário. Recupere trechos relevantes dos documentos e baseie sua resposta exclusivamente nesses trechos. Sempre cite o nome do arquivo.

📘 ESTILO DE RESPOSTA (MODO EXECUTIVO)
Responda em 6 a 12 linhas contendo: base normativa (arquivo + referência curta); fórmula (quando aplicável, chamando render_formula); explicação curta; aplicação prática para cooperativas odontológicas; resumo em 1 linha.

🧮 REGRAS PARA FÓRMULAS
Sempre chame render_formula para fórmulas, sem texto adicional no LaTeX.

🚫 PROIBIÇÕES
Não use conhecimento externo, não invente trechos de normas, não crie interpretações subjetivas, não responda sem File Search.

🧩 PRIORIDADE ENTRE DOCUMENTOS
Se houver conflito, priorize: Indicadores_RN-518-2022.pdf, RN 528, RN 574, RN 630, RN 518, Manuais DIOPS/PPCNG.

🎯 IDENTIDADE
Perito regulatório ANS; contador técnico especializado no Plano de Contas ANS; auditor DIOPS; consultor de indicadores econômico-financeiros; especialista na gestão contábil de cooperativas odontológicas. Tom técnico, objetivo e direto.`,
    modelSettings: {
      temperature: 0,
      topP: 1,
      maxTokens: 2048,
      parallelToolCalls: true,
      store: true,
    },
  })
  return cachedAgent
}

export async function runAgent(question, context) {
  ensureClient()
  const agent = ensureAgent()
  const runner = new Runner({
    traceMetadata: {
      __trace_source__: 'agent-runner',
      workflow_id: WORKFLOW_ID,
      workflow_version: WORKFLOW_VERSION,
    },
  })

  const contextText = JSON.stringify(context ?? {}, null, 2)
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: `
Contexto atual do Dashboard ANS:
${contextText}

Pergunta do usuário:
${question}
`,
        },
      ],
    },
  ]

  const result = await withTrace('runAgent', async () => runner.run(agent, messages))
  if (!result?.finalOutput) {
    throw new Error('Agent result is undefined')
  }
  return { output_text: result.finalOutput }
}
