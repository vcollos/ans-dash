import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ssoRequestOptions, readSsoSession } from './ssoSession.js'

test('SSO mutation removes legacy credentials and sends CSRF with same-origin cookie', () => {
  const result = ssoRequestOptions({ method: 'POST', headers: { Authorization: 'Bearer legacy', 'X-Auth-Token': 'legacy', 'X-Dev-Auth-Bypass': '1' } }, { csrf: 'csrf-only' })
  assert.equal(result.credentials, 'same-origin')
  assert.equal(result.headers.get('authorization'), null)
  assert.equal(result.headers.get('x-auth-token'), null)
  assert.equal(result.headers.get('x-dev-auth-bypass'), null)
  assert.equal(result.headers.get('x-csrf-token'), 'csrf-only')
  assert.equal(ssoRequestOptions({}, { csrf: 'csrf-only' }).headers.get('x-csrf-token'), null)
})

test('bootstrap permits legacy only for absent SSO or disabled backend, never revoked session', async (t) => {
  const reply = (status, body) => t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body), { status }))
  reply(401, { code: 'SSO_NO_SESSION' })
  assert.equal((await readSsoSession()).status, 'legacy')
  reply(401, {})
  await assert.rejects(readSsoSession(), /expirou/)
  reply(403, {})
  await assert.rejects(readSsoSession(), /não foi autorizado/)
  reply(503, {})
  await assert.rejects(readSsoSession(), /indisponível/)
  reply(404, {})
  assert.equal((await readSsoSession()).status, 'legacy')
  reply(200, { user: { uid: 'opaque-guid', authSource: 'uhub-sso' }, csrf: 'csrf', expiresAt: Math.floor(Date.now() / 1000) + 60 })
  const session = await readSsoSession()
  assert.equal(session.status, 'active')
  assert.equal(session.user.email, undefined)
})
