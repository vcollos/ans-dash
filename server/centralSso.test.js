import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { createSsoConsumer, intersectSsoAccess, ssoConfig, scopeSsoExport, CALLBACK, HUB_ORIGIN, PFC_ORIGIN } from './centralSso.js'

const config = ssoConfig({ PFC_SSO_ENABLED: 'true', PFC_SSO_COOKIE_KEY: 'a'.repeat(64), PFC_SSO_CLIENT_SECRET: 'b'.repeat(43) })
const session = 's'.repeat(43)
const now = 1700000000
const rows = [{ reg_ans: '123456', can_upload: true, operator_name: 'Operadora' }]
const inspection = () => ({ pessoaId: 'person', expiresAt: now + 28000, legacyIdentity: { namespace: 'firebase:bigdata-467917', uid: 'verified-uid' }, grant: { pessoa_id: 'person', app_id: 'pfc', reg_ans: '123456', can_upload: true, context_type: 'reg_ans', context_id: '123456', role: 'user', scopes: ['pfc.read', 'pfc.upload'] } })

async function fixture(t, options = {}) {
  const calls = []
  let currentInspection = inspection()
  let currentRows = rows
  const consumer = createSsoConsumer({
    config, now: () => now,
    loadLocalAccess: async (uid) => { assert.equal(uid, 'verified-uid'); return currentRows },
    fetchImpl: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) })
      assert.equal(new URL(url).origin, HUB_ORIGIN)
      assert.equal(init.redirect, 'error')
      assert.equal(init.headers['x-sso-client-id'], 'pfc')
      assert.equal(init.headers.Authorization, `Bearer ${config.clientSecret}`)
      if (options.outage) throw new Error('network')
      return { ok: true, json: async () => url.endsWith('/token') ? { session, expiresAt: now + 28000 } : url.endsWith('/introspect') ? currentInspection : { ok: true } }
    }, ...options,
  })
  const app = express()
  app.use(express.json())
  consumer.register(app)
  app.all('/private', async (req, res) => {
    try {
      if (!await consumer.authenticate(req, res)) return res.sendStatus(401)
      return res.json({ user: req.user, access: req.accessContext })
    } catch (err) { return res.sendStatus(err.status ?? 503) }
  })
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const request = (path, init = {}) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { redirect: 'manual', ...init })
  return { request, calls, setInspection: (v) => { currentInspection = v }, setRows: (v) => { currentRows = v } }
}

test('flags default off and enabled requires dedicated secrets', () => {
  assert.deepEqual(ssoConfig({}), { enabled: false })
  assert.throws(() => ssoConfig({ PFC_SSO_ENABLED: 'true' }))
})

test('intersection denies UID namespace/person/app/operator mismatch and upload escalation', () => {
  const valid = inspection()
  assert.equal(intersectSsoAccess(valid, rows, now).accessContext.canUploadRegAns.length, 1)
  for (const change of [
    { legacyIdentity: null }, { legacyIdentity: { namespace: 'firebase:other', uid: 'verified-uid' } },
    { expiresAt: now }, { grant: { ...valid.grant, scopes: [] } }, { grant: { ...valid.grant, context_type: 'plataforma' } }, { grant: { ...valid.grant, context_id: '654321' } }, { grant: { ...valid.grant, app_id: 'hub' } },
    { grant: { ...valid.grant, pessoa_id: 'other' } }, { grant: { ...valid.grant, reg_ans: '654321' } },
  ]) assert.throws(() => intersectSsoAccess({ ...valid, ...change }, rows, now))
  assert.throws(() => intersectSsoAccess(valid, [], now))
  assert.equal(intersectSsoAccess({ ...valid, grant: { ...valid.grant, role: 'admin', can_upload: false } }, rows, now).accessContext.isAdmin, false)
  assert.deepEqual(intersectSsoAccess(valid, [{ ...rows[0], can_upload: false }], now).accessContext.canUploadRegAns, [])
})

test('start/callback are multi-instance, PKCE bound, fixed callback and secure cookies', async (t) => {
  const first = await fixture(t)
  const second = await fixture(t)
  const start = await first.request('/api/auth/sso/start')
  assert.equal(start.status, 303)
  const target = new URL(start.headers.get('location'))
  assert.equal(target.origin, HUB_ORIGIN)
  assert.equal(target.pathname, '/auth/sso')
  assert.equal(target.searchParams.get('callback'), CALLBACK)
  const transactionCookie = start.headers.get('set-cookie')
  assert.match(transactionCookie, /Secure; HttpOnly; SameSite=Lax/)
  assert.doesNotMatch(transactionCookie, /Domain=/)
  const callback = await second.request(`/auth/sso/callback?code=${'c'.repeat(43)}&state=${target.searchParams.get('state')}`, { headers: { cookie: transactionCookie.split(';')[0] } })
  assert.equal(callback.headers.get('location'), '/')
  assert.match(callback.headers.get('set-cookie'), /__Host-pfc_sso=s{43}; Path=\/; Max-Age=28000; Secure; HttpOnly/)
  assert.equal(second.calls[0].body.callback, CALLBACK)
  const { createHash } = await import('node:crypto')
  assert.equal(createHash('sha256').update(second.calls[0].body.verifier).digest('base64url'), target.searchParams.get('challenge'))
  assert.equal(callback.headers.get('cache-control'), 'no-store')
  assert.equal(callback.headers.get('referrer-policy'), 'no-referrer')
})

test('tampered state, transaction, duplicate query and expiry fail before exchange', async (t) => {
  const f = await fixture(t)
  const start = await f.request('/api/auth/sso/start')
  const target = new URL(start.headers.get('location'))
  const tx = start.headers.get('set-cookie').split(';')[0]
  for (const [state, cookie] of [[ 'x'.repeat(43), tx ], [target.searchParams.get('state'), `${tx}x`]]) {
    const response = await f.request(`/auth/sso/callback?code=${'c'.repeat(43)}&state=${state}`, { headers: { cookie } })
    assert.equal(response.headers.get('location'), '/?sso=error')
  }
  const duplicate = await f.request(`/auth/sso/callback?code=${'c'.repeat(43)}&state=${target.searchParams.get('state')}&state=${target.searchParams.get('state')}`, { headers: { cookie: tx } })
  assert.equal(duplicate.headers.get('location'), '/?sso=error')
  assert.equal(f.calls.length, 0)
  const expired = await fixture(t, { now: () => now + 301 })
  assert.equal((await expired.request(`/auth/sso/callback?code=${'c'.repeat(43)}&state=${target.searchParams.get('state')}`, { headers: { cookie: tx } })).headers.get('location'), '/?sso=error')
  assert.equal(expired.calls.length, 0)
})

test('every private request revalidates central grant and uncached local ACL', async (t) => {
  const f = await fixture(t)
  const headers = { cookie: `__Host-pfc_sso=${session}` }
  assert.equal((await f.request('/private', { headers })).status, 200)
  f.setRows([])
  assert.equal((await f.request('/private', { headers })).status, 403)
  f.setRows(rows)
  f.setInspection({ ...inspection(), expiresAt: now })
  assert.equal((await f.request('/private', { headers })).status, 403)
  assert.equal(f.calls.length, 3)
})

test('cookie mutations require Origin and CSRF, ambiguous credentials rejected', async (t) => {
  const f = await fixture(t)
  const cookie = `__Host-pfc_sso=${session}`
  const bootstrap = await f.request('/api/auth/sso/session', { headers: { cookie } })
  const { csrf } = await bootstrap.json()
  for (const headers of [{ cookie }, { cookie, origin: 'https://evil.example', 'x-csrf-token': csrf }, { cookie, origin: PFC_ORIGIN, 'x-csrf-token': 'x'.repeat(43) }]) {
    assert.equal((await f.request('/private', { method: 'POST', headers })).status, 403)
  }
  assert.equal((await f.request('/private', { method: 'POST', headers: { cookie, origin: PFC_ORIGIN, 'x-csrf-token': csrf } })).status, 200)
  assert.equal((await f.request('/private', { headers: { cookie, authorization: 'Bearer firebase' } })).status, 401)
  assert.equal((await f.request('/private', { headers: { cookie: `${cookie}; ${cookie}` } })).status, 401)
  const logout = await f.request('/api/auth/sso/logout', { method: 'POST', headers: { cookie, origin: PFC_ORIGIN, 'x-csrf-token': csrf } })
  assert.equal(logout.status, 200)
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/)
  assert.equal(f.calls.at(-1).url, `${HUB_ORIGIN}/api/sso/logout/local`)
})

test('disabled paths and central outages fail closed', async (t) => {
  const disabled = await fixture(t, { config: { enabled: false } })
  assert.equal((await disabled.request('/api/auth/sso/start')).status, 404)
  assert.equal((await disabled.request('/private', { headers: { cookie: `__Host-pfc_sso=${session}` } })).status, 401)
  assert.equal(disabled.calls.length, 0)
  const outage = await fixture(t, { outage: true })
  assert.equal((await outage.request('/private', { headers: { cookie: `__Host-pfc_sso=${session}` } })).status, 503)
})

test('fixed export is scoped and unsafe identifiers are rejected', () => {
  const sql = 'SELECT reg_ans, valor FROM server_owned_view'
  assert.equal(scopeSsoExport(sql, {}), sql)
  assert.match(scopeSsoExport(sql, { sso: true, allowedRegAns: ['123456'] }), /WHERE CAST\(reg_ans AS STRING\) = '123456'$/)
  assert.throws(() => scopeSsoExport(sql, { sso: true, allowedRegAns: ["123456' OR TRUE"] }))
  assert.throws(() => scopeSsoExport(sql, { sso: true, allowedRegAns: [] }))
})

test('central rejection of replayed/expired code cannot issue a consumer session', async (t) => {
  const f = await fixture(t, { fetchImpl: async () => ({ ok: false, status: 401 }) })
  const start = await f.request('/api/auth/sso/start')
  const state = new URL(start.headers.get('location')).searchParams.get('state')
  const callback = await f.request(`/auth/sso/callback?code=${'c'.repeat(43)}&state=${state}`, { headers: { cookie: start.headers.get('set-cookie').split(';')[0] } })
  assert.equal(callback.headers.get('location'), '/?sso=error')
  assert.match(callback.headers.get('set-cookie'), /__Host-pfc_sso=; Path=\/; Max-Age=0/)
})

test('session bootstrap distinguishes absent cookie from an invalid or revoked session', async (t) => {
  const f = await fixture(t)
  const absent = await f.request('/api/auth/sso/session')
  assert.equal(absent.status, 401)
  assert.equal((await absent.json()).code, 'SSO_NO_SESSION')
  const invalid = await f.request('/api/auth/sso/session', { headers: { cookie: '__Host-pfc_sso=invalid' } })
  assert.equal(invalid.status, 401)
  assert.equal((await invalid.json()).code, undefined)
  const revoked = await fixture(t, { fetchImpl: async () => ({ ok: false, status: 401 }) })
  const rejected = await revoked.request('/api/auth/sso/session', { headers: { cookie: `__Host-pfc_sso=${session}` } })
  assert.equal(rejected.status, 401)
  assert.equal((await rejected.json()).code, undefined)
})

test('flag-off leaves legacy Firebase middleware reachable despite an old SSO cookie', async () => {
  const consumer = createSsoConsumer({ config: { enabled: false }, loadLocalAccess: () => assert.fail('SSO disabled') })
  assert.equal(await consumer.authenticate({ headers: { cookie: `__Host-pfc_sso=${session}`, authorization: 'Bearer legacy' } }, {}), false)
})
