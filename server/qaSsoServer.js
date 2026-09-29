// Isolated QA BFF. Never import index.js: it initializes production integrations.
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { createSsoConsumer, ssoConfig, PFC_QA_ORIGIN } from './centralSso.js'
import { executeDataOperation } from './dataOperations.js'
import { metricSql } from '../src/lib/metricFormulas.js'
import { UNIODONTO_METRIC_SQL } from '../src/lib/metricFormulasModoUniodonto.js'

const deny = (status = 403) => { throw Object.assign(new Error('QA não autorizado.'), { status }) }
const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/)
const fixtureSchema = z.strictObject({ version: z.literal(1), accounts: z.array(z.strictObject({
  uid: id, pessoaId: id, grantId: id, regAns: z.string().regex(/^\d{6}$/),
})).min(1).max(20) })
export function parseQaFixtures(value) {
  const result = fixtureSchema.parse(value)
  const keys = result.accounts.map((a) => `${a.uid}:${a.grantId}`)
  if (new Set(keys).size !== keys.length) throw new Error('Fixture QA duplicada.')
  return result
}
export function readQaConfiguration(env = process.env) {
  if (env.PFC_SSO_QA_ISOLATED !== 'true' || env.PFC_SSO_ENABLED !== 'true' ||
      env.PFC_QA_NETWORK_ISOLATED !== 'true' || env.PFC_QA_DATA_MODE !== 'fixtures') throw new Error('QA exige opt-in, rede isolada e dados fixtures.')
  for (const key of Object.keys(env)) {
    if (/^(GOOGLE_|GCLOUD_|FIREBASE_|BQ_|SMTP_|BREVO_)/.test(key) || key === 'UHUB_API_TOKEN') {
      if (env[key]) throw new Error('Integrações externas não permitidas no BFF QA.')
    }
  }
  const port = Number(env.PFC_QA_PORT ?? 4084)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Porta QA inválida.')
  const host = env.PFC_QA_BIND ?? '127.0.0.1'
  if (!['127.0.0.1', '0.0.0.0'].includes(host)) throw new Error('Bind QA inválido.')
  // 0.0.0.0 is only for an internal container network approved by the runtime owner.
  if (host === '0.0.0.0' && env.PFC_QA_CONTAINER_INTERNAL !== 'true') throw new Error('Container QA precisa de rede interna.')
  for (const key of ['PFC_QA_FIXTURES_PATH', 'PFC_QA_DIST_DIR']) {
    if (!env[key] || !path.isAbsolute(env[key])) throw new Error('Caminhos QA explícitos obrigatórios.')
  }
  const raw = fs.readFileSync(env.PFC_QA_FIXTURES_PATH, 'utf8')
  if (Buffer.byteLength(raw) > 16384) throw new Error('Fixture QA excede limite.')
  const fixtures = parseQaFixtures(JSON.parse(raw))
  const distDir = env.PFC_QA_DIST_DIR
  if (!fs.statSync(path.join(distDir, 'index.html')).isFile()) throw new Error('Build frontend QA ausente.')
  return { host, port, fixtures, distDir, consumer: ssoConfig(env) }
}
const routes = new Set([
  'GET /api/health', 'GET /api/auth/status', 'GET /api/auth/sso/start',
  'GET /api/auth/sso/session', 'POST /api/auth/sso/logout',
  'GET /auth/sso/callback', 'POST /auth/sso/callback',
  'GET /api/auth/profile', 'POST /api/data/operation', 'GET /api/indicadores.csv',
])
const staticPath = (value) => value === '/' || /^\/assets\/[A-Za-z0-9_-]+\.(?:js|css|svg|png|webp|woff2?)$/.test(value)
export function qaRequestGuard(req, res, next) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
  if (req.headers.host !== new URL(PFC_QA_ORIGIN).host || req.headers['x-forwarded-proto'] !== 'https' ||
      req.headers.authorization || req.headers['x-auth-token'] || req.headers['x-dev-auth-bypass']) {
    return res.status(403).json({ error: 'Origem ou autenticação não permitida no QA.' })
  }
  if (!routes.has(`${req.method} ${req.path}`) && !(req.method === 'GET' && staticPath(req.path))) {
    return res.status(403).json({ error: 'Rota não disponível no QA isolado.' })
  }
  return next()
}
function fixtureRow(regAns) {
  return {
    ...Object.fromEntries([...Object.keys(metricSql), ...Object.keys(UNIODONTO_METRIC_SQL)].map((key) => [key, 10])),
    reg_ans: regAns, nome_operadora: 'QA — dados simulados', modalidade: 'Odontologia de grupo',
    porte: 'Pequeno Porte', ativa: true, uniodonto: true,
    ano: 2026, trimestre: 1, periodo: '2026T1', periodo_id: 20261, trimestre_rank: 1,
    qt_beneficiarios: 100, qt_prestadores: 12, peer_count: 1, cohort_count: 1,
    vr_receitas: 1000, vr_despesas: 400, resultado_liquido_final_ans: 600,
    operadoras: ['QA — dados simulados'], periodos: [{ ano: 2026, trimestre: 1, periodo: '2026T1' }],
    qa_fixture: true,
  }
}
export function createQaSsoApp({ config, fetchImpl = fetch }) {
  if (config.consumer?.isolatedQa !== true || config.consumer.enabled !== true) deny()
  const fixtures = parseQaFixtures(config.fixtures)
  const app = express()
  // Guard is first: forbidden requests cannot reach JSON parsing, auth or handlers.
  app.use(qaRequestGuard)
  app.use(express.json({ limit: '16kb' }))
  const consumer = createSsoConsumer({ config: config.consumer, fetchImpl,
    validateInspection: (dto) => {
      if (!fixtures.accounts.some((a) => a.uid === dto.legacyIdentity?.uid && a.pessoaId === dto.pessoaId &&
          a.grantId === dto.grant?.grant_id && a.regAns === dto.grant?.reg_ans)) deny()
    },
    loadLocalAccess: async (uid) => fixtures.accounts.filter((a) => a.uid === uid).map((a) => ({
      reg_ans: a.regAns, operator_name: 'QA — dados simulados', can_upload: false,
    })),
  })
  consumer.register(app)
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', isolatedQa: true, dataMode: 'fixtures' }))
  app.get('/api/auth/status', (_req, res) => res.json({ enabled: true, isolatedQa: true, legacyEnabled: false, dataMode: 'fixtures' }))
  app.use(async (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next()
    try {
      if (!await consumer.authenticate(req, res)) deny(401)
      return next()
    } catch (error) { return res.status(error.status ?? 503).json({ error: 'Sessão QA não autorizada.' }) }
  })
  app.get('/api/auth/profile', (req, res) => res.json({
    uid: req.user.uid, email: null, ...req.accessContext, qaFixture: true, dataMode: 'fixtures',
    noAccess: false, canAccess: true, requiresProfileCompletion: false,
    approvalStatus: null, approvalReason: null, uhubLink: null, registrationProfile: null,
  }))
  app.post('/api/data/operation', async (req, res) => {
    try {
      const row = fixtureRow(req.accessContext.allowedRegAns[0])
      const result = await executeDataOperation({ body: req.body, access: req.accessContext, env: {},
        // Executes the real named builders; this adapter DOES NOT run the SQL.
        // It returns identified synthetic rows, never implies BigQuery validation.
        executeQuery: async () => ({ rows: [row], fields: Object.keys(row).map((name) => ({ name })) }),
      })
      return res.json({ result, qaFixture: true, dataMode: 'fixtures' })
    } catch (error) { return res.status(error.status ?? 503).json({ error: 'Consulta QA inválida ou indisponível.' }) }
  })
  app.get('/api/indicadores.csv', (req, res) => {
    res.type('text/csv').send(`reg_ans,nome_operadora,qa_fixture\n${req.accessContext.allowedRegAns[0]},QA - dados simulados,true\n`)
  })
  app.get('/', (_req, res) => res.sendFile(path.join(config.distDir, 'index.html')))
  app.use('/assets', express.static(path.join(config.distDir, 'assets'), { fallthrough: false, index: false }))
  app.use((_req, res) => res.status(404).json({ error: 'Recurso QA não encontrado.' }))
  app.use((_error, _req, res, next) => { void next; return res.status(400).json({ error: 'Requisição QA inválida.' }) })
  return app
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = readQaConfiguration()
  createQaSsoApp({ config }).listen(config.port, config.host, () => {
    console.log(`PFC isolated QA BFF listening ${config.host}:${config.port}; fixture data only`)
  })
}
