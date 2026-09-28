import crypto from 'node:crypto'

export const PFC_ORIGIN = 'https://pfc.uniodonto.coop.br'
export const HUB_ORIGIN = 'https://uhub.uniodonto.coop.br'
export const CALLBACK = `${PFC_ORIGIN}/auth/sso/callback`
const TRANSACTION = '__Host-pfc_sso_tx'
const SESSION = '__Host-pfc_sso'
const opaque = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v)
const random = () => crypto.randomBytes(32).toString('base64url')
const hash = (v) => crypto.createHash('sha256').update(v).digest('base64url')
const fail = (status = 403) => { throw Object.assign(new Error('SSO indisponível ou acesso não autorizado.'), { status }) }
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

export function ssoConfig(env = process.env) {
  if (env.PFC_SSO_ENABLED !== 'true') return { enabled: false }
  if (!/^[a-f0-9]{64}$/i.test(env.PFC_SSO_COOKIE_KEY ?? '') || !opaque(env.PFC_SSO_CLIENT_SECRET)) {
    throw new Error('Configuração SSO obrigatória ausente ou inválida.')
  }
  return { enabled: true, key: Buffer.from(env.PFC_SSO_COOKIE_KEY, 'hex'), clientSecret: env.PFC_SSO_CLIENT_SECRET }
}

function readCookie(req, name) {
  const values = String(req.headers.cookie ?? '').split(';').map((s) => s.trim()).filter((s) => s.startsWith(`${name}=`))
  if (values.length > 1) fail(401)
  return values[0]?.slice(name.length + 1) ?? ''
}
function cookie(res, name, value, age) {
  res.append('Set-Cookie', `${name}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`)
}
function seal(value, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(TRANSACTION))
  return Buffer.concat([iv, cipher.update(JSON.stringify(value)), cipher.final(), cipher.getAuthTag()]).toString('base64url')
}
function unseal(value, key) {
  if (!/^[A-Za-z0-9_-]{1,2048}$/.test(value)) fail(401)
  const data = Buffer.from(value, 'base64url')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, data.subarray(0, 12))
  decipher.setAAD(Buffer.from(TRANSACTION))
  decipher.setAuthTag(data.subarray(-16))
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString())
}

// Only verified source IDs are accepted. Hub roles and e-mail never become PFC rights.
export function intersectSsoAccess(inspection, rows, now = Math.floor(Date.now() / 1000)) {
  const identity = inspection?.legacyIdentity
  const grant = inspection?.grant
  if (!inspection?.pessoaId || !Number.isSafeInteger(inspection.expiresAt) || inspection.expiresAt <= now ||
      identity?.namespace !== 'firebase:bigdata-467917' || typeof identity.uid !== 'string' || !identity.uid || identity.uid.length > 128 ||
      grant?.app_id !== 'pfc' || grant.pessoa_id !== inspection.pessoaId ||
      !/^[0-9]{6}$/.test(grant.reg_ans ?? '') || grant.context_type !== 'reg_ans' || grant.context_id !== grant.reg_ans ||
      typeof grant.can_upload !== 'boolean' ||
      !Array.isArray(grant.scopes) || !grant.scopes.every((s) => typeof s === 'string') || !grant.scopes.includes('pfc.read')) fail()
  const matches = rows.filter((r) => r.reg_ans === grant.reg_ans)
  // A local admin row is not promoted to global access through a contextual grant.
  if (!matches.length) fail()
  const canUpload = grant.can_upload && grant.scopes.includes('pfc.upload') && matches.some((r) => r.can_upload === true)
  return {
    user: { uid: identity.uid, email: null, claims: {}, pessoaId: inspection.pessoaId, authSource: 'uhub-sso' },
    accessContext: {
      enforced: true, isAdmin: false, sso: true,
      operators: [{ regAns: grant.reg_ans, operatorName: matches[0].operator_name ?? null, canUpload }],
      allowedRegAns: [grant.reg_ans], canUploadRegAns: canUpload ? [grant.reg_ans] : [],
    },
  }
}

export function createSsoConsumer({ config = ssoConfig(), fetchImpl = fetch, loadLocalAccess, now = () => Math.floor(Date.now() / 1000) }) {
  const csrf = (session) => crypto.createHmac('sha256', config.key).update(`csrf:${session}`).digest('base64url')
  const call = async (path, body) => {
    const response = await fetchImpl(`${HUB_ORIGIN}/api/sso/${path}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.clientSecret}`, 'x-sso-client-id': 'pfc' },
      body: JSON.stringify(body),
    })
    if (!response.ok) fail(response.status === 401 || response.status === 403 ? 401 : 503)
    return response.json()
  }
  const inspect = async (session) => {
    if (!opaque(session)) fail(401)
    const data = await call('introspect', { session })
    if (data?.legacyIdentity?.namespace !== 'firebase:bigdata-467917' || typeof data.legacyIdentity.uid !== 'string' || !data.legacyIdentity.uid || data.legacyIdentity.uid.length > 128) fail()
    const rows = await loadLocalAccess(data.legacyIdentity.uid)
    return { ...intersectSsoAccess(data, rows, now()), expiresAt: data.expiresAt }
  }
  const mutation = (req, session) => {
    if (req.headers.origin !== PFC_ORIGIN || !equal(req.headers['x-csrf-token'], csrf(session))) fail()
  }
  const headers = (res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Referrer-Policy', 'no-referrer')
  }
  const wrap = (fn) => async (req, res) => {
    headers(res)
    try {
      if (!config.enabled) fail(404)
      return await fn(req, res)
    } catch (error) {
      return res.status(error.status ?? 503).json({ error: 'SSO indisponível ou acesso não autorizado.' })
    }
  }
  const register = (app) => {
    app.get('/api/auth/sso/start', wrap(async (req, res) => {
      if (Object.keys(req.query).length || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) fail(400)
      const state = random(), verifier = random()
      cookie(res, TRANSACTION, seal({ state, verifier, expiresAt: now() + 300 }, config.key), 300)
      const target = new URL('/auth/sso', HUB_ORIGIN)
      target.search = new URLSearchParams({ clientId: 'pfc', callback: CALLBACK, state, challenge: hash(verifier) }).toString()
      return res.redirect(303, target.href)
    }))
    app.get('/auth/sso/callback', async (req, res) => {
      headers(res)
      cookie(res, TRANSACTION, '', 0)
      try {
        if (!config.enabled) fail(404)
        const { code, state } = req.query
        if (Object.keys(req.query).length !== 2 || !opaque(code) || !opaque(state)) fail(400)
        const tx = unseal(readCookie(req, TRANSACTION), config.key)
        if (!opaque(tx.state) || !opaque(tx.verifier) || !Number.isSafeInteger(tx.expiresAt) || tx.expiresAt <= now() || tx.expiresAt > now() + 300 || !equal(state, tx.state)) fail(401)
        const result = await call('token', { code, callback: CALLBACK, verifier: tx.verifier })
        const principal = await inspect(result.session)
        const expiresAt = Math.min(result.expiresAt, principal.expiresAt, now() + 28800)
        if (!Number.isSafeInteger(expiresAt) || expiresAt <= now()) fail(401)
        cookie(res, SESSION, result.session, expiresAt - now())
        return res.redirect(303, '/')
      } catch {
        // Always remove the one-time code from the browser URL, including failures.
        cookie(res, SESSION, '', 0)
        return res.redirect(303, '/?sso=error')
      }
    })
    app.get('/api/auth/sso/session', wrap(async (req, res) => {
      if (Object.keys(req.query).length || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) fail()
      const session = readCookie(req, SESSION)
      if (!session) return res.status(401).json({ error: 'Sessão SSO ausente.', code: 'SSO_NO_SESSION' })
      const principal = await inspect(session)
      return res.json({ user: { uid: principal.user.uid, authSource: 'uhub-sso' }, csrf: csrf(session), expiresAt: principal.expiresAt })
    }))
    app.post('/api/auth/sso/logout', wrap(async (req, res) => {
      const session = readCookie(req, SESSION)
      if (!opaque(session) || Object.keys(req.query).length) fail(401)
      mutation(req, session)
      await call('logout/local', { session })
      cookie(res, SESSION, '', 0)
      return res.json({ ok: true })
    }))
  }
  const authenticate = async (req, res) => {
    const session = readCookie(req, SESSION)
    if (!session) return false
    headers(res)
    if (!config.enabled || req.headers.authorization || req.headers['x-auth-token'] || req.headers['x-dev-auth-bypass']) fail(401)
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) mutation(req, session)
    const principal = await inspect(session)
    req.user = principal.user
    req.accessContext = principal.accessContext
    return true
  }
  return { register, authenticate }
}

// This wrapper is ONLY for the fixed server-owned export_indicadores.sql: its
// output has one reg_ans per row. Never use it on client SQL or aggregates.
export function scopeSsoExport(exportSql, access) {
  if (!access?.sso) return exportSql
  if (access.allowedRegAns?.length !== 1 || !/^[0-9]{6}$/.test(access.allowedRegAns[0])) fail()
  return `SELECT * FROM (${exportSql}) AS pfc_export WHERE CAST(reg_ans AS STRING) = '${access.allowedRegAns[0]}'`
}
