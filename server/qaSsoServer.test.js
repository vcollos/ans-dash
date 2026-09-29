import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createServer, request as httpRequest } from 'node:http'
import { createQaSsoApp, readQaConfiguration } from './qaSsoServer.js'
import { PFC_QA_ORIGIN, HUB_QA_ORIGIN } from './centralSso.js'
const account = { uid: 'qa-fixture-uid', pessoaId: 'qa-fixture-person', grantId: 'qa-fixture-grant', regAns: '123456' }
function fixtureConfig(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pfc-isolated-qa-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'assets'))
  fs.writeFileSync(path.join(root, 'index.html'), '<html>unit fixture for static serving only</html>')
  fs.writeFileSync(path.join(root, 'assets/app.js'), '/* unit fixture */')
  fs.writeFileSync(path.join(root, 'accounts.json'), JSON.stringify({ version: 1, accounts: [account] }))
  const env = {
    PFC_SSO_ENABLED: 'true', PFC_SSO_QA_ISOLATED: 'true', PFC_SSO_CLIENT_SECRET: 'q'.repeat(43), PFC_SSO_COOKIE_KEY: 'a'.repeat(64),
    PFC_QA_NETWORK_ISOLATED: 'true', PFC_QA_DATA_MODE: 'fixtures', PFC_QA_FIXTURES_PATH: path.join(root, 'accounts.json'), PFC_QA_DIST_DIR: root,
  }
  return { env, config: readQaConfiguration(env) }
}
async function serverFixture(t) {
  const { config } = fixtureConfig(t)
  const calls = []
  const dto = { pessoaId: account.pessoaId, expiresAt: Math.floor(Date.now() / 1000) + 3600,
    legacyIdentity: { namespace: 'firebase:bigdata-467917', uid: account.uid },
    grant: { grant_id: account.grantId, pessoa_id: account.pessoaId, app_id: 'pfc', context_type: 'reg_ans', context_id: account.regAns, reg_ans: account.regAns,
      can_upload: true, scopes: ['pfc.read', 'pfc.upload', 'pfc.indicadores.read.all'], role: 'admin' },
  }
  const app = createQaSsoApp({ config, fetchImpl: async (url, options) => {
    calls.push({ url, options })
    assert.equal(new URL(url).origin, HUB_QA_ORIGIN)
    assert.equal(options.redirect, 'error')
    return { ok: true, json: async () => url.endsWith('/token') ? { session: 's'.repeat(43), expiresAt: dto.expiresAt } : dto }
  } })
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  // Native fetch rewrites Host to the loopback URL; use HTTP for gateway simulation.
  const request = (url, options = {}) => new Promise((resolve, reject) => {
    const request = httpRequest(`http://127.0.0.1:${server.address().port}${url}`, {
      ...options, headers: { host: new URL(PFC_QA_ORIGIN).host, 'x-forwarded-proto': 'https', ...options.headers },
    }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => {
        const headers = new Headers()
        for (let i = 0; i < response.rawHeaders.length; i += 2) headers.append(response.rawHeaders[i], response.rawHeaders[i + 1])
        resolve(new Response(body, { status: response.statusCode, headers }))
      })
    })
    request.on('error', reject)
    request.end(options.body)
  })
  return { request, calls, dto }
}

test('isolated QA startup requires explicit mode/config and rejects external credentials or unsafe bind', (t) => {
  const { env, config } = fixtureConfig(t)
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.consumer.isolatedQa, true)
  for (const patch of [
    { PFC_SSO_QA_ISOLATED: 'false' }, { PFC_SSO_ENABLED: 'false' }, { PFC_QA_NETWORK_ISOLATED: 'false' },
    { PFC_QA_DATA_MODE: 'bigquery' }, { PFC_QA_BIND: '0.0.0.0' }, { GOOGLE_APPLICATION_CREDENTIALS: '/forbidden' },
    { BQ_PROJECT_ID: 'production' }, { FIREBASE_SERVICE_ACCOUNT: 'forbidden' }, { UHUB_API_TOKEN: 'forbidden' },
    { PFC_QA_FIXTURES_PATH: 'relative' }, { PFC_QA_DIST_DIR: 'relative' }, { PFC_QA_PORT: '443' },
  ]) assert.throws(() => readQaConfiguration({ ...env, ...patch }))
})

test('QA allowlist rejects legacy auth, all write routes and free SQL before any handler', async (t) => {
  const f = await serverFixture(t)
  for (const [method, url] of [
    ['POST', '/api/query'], ['POST', '/api/import/operadora-demonstracoes'], ['POST', '/api/auth/password-reset'],
    ['POST', '/api/auth/profile/complete'], ['POST', '/api/admin/accounts/create'], ['GET', '/api/admin/accounts'],
    ['DELETE', '/api/admin/accounts/uid'], ['GET', '/api/onboarding/operators'], ['PUT', '/api/data/operation'],
    ['GET', '/unknown-route'], ['POST', '/'],
  ]) assert.equal((await f.request(url, { method })).status, 403, method + ' ' + url)
  assert.equal((await f.request('/api/health', { headers: { authorization: 'Bearer legacy' } })).status, 403)
  assert.equal((await f.request('/api/health', { headers: { host: 'pfc.uniodonto.coop.br' } })).status, 403)
  assert.equal((await f.request('/api/health', { headers: { 'x-forwarded-proto': 'http' } })).status, 403)
  assert.equal(f.calls.length, 0)
  const health = await f.request('/api/health')
  assert.equal((await health.json()).dataMode, 'fixtures')
  assert.match(health.headers.get('content-security-policy'), /connect-src 'self'/)
  assert.equal((await f.request('/assets/app.js')).status, 200)
})

test('QA uses fixed private origins, exact fixture principal, real SSO transport and synthetic named operations', async (t) => {
  const f = await serverFixture(t)
  const start = await f.request('/api/auth/sso/start')
  const target = new URL(start.headers.get('location'))
  assert.equal(target.origin, HUB_QA_ORIGIN)
  assert.equal(target.searchParams.get('callback'), PFC_QA_ORIGIN + '/auth/sso/callback')
  const tx = start.headers.get('set-cookie').split(';')[0]
  const callback = await f.request('/auth/sso/callback', { method: 'POST', headers: {
    cookie: tx, origin: PFC_QA_ORIGIN, 'Content-Type': 'application/json',
  }, body: JSON.stringify({ code: 'c'.repeat(43), state: target.searchParams.get('state') }) })
  assert.equal(callback.status, 200)
  const cookie = callback.headers.getSetCookie().find((value) => value.startsWith('__Host-pfc_sso=')).split(';')[0]
  const session = await (await f.request('/api/auth/sso/session', { headers: { cookie } })).json()
  const profile = await (await f.request('/api/auth/profile', { headers: { cookie } })).json()
  assert.equal(profile.qaFixture, true)
  assert.equal(profile.isAdmin, false)
  assert.deepEqual(profile.canUploadRegAns, [])
  assert.equal(profile.uid, account.uid)
  const operation = await f.request('/api/data/operation', { method: 'POST', headers: {
    cookie, origin: PFC_QA_ORIGIN, 'x-csrf-token': session.csrf, 'Content-Type': 'application/json',
  }, body: JSON.stringify({ operation: 'fetchDashboardBootstrap', args: [] }) })
  assert.equal(operation.status, 200)
  const output = await operation.json()
  assert.equal(output.qaFixture, true)
  assert.deepEqual(output.result.operatorNames, ['Sistema Uniodonto', 'QA — dados simulados'])
  assert.equal((await f.request('/api/data/operation', { method: 'POST', headers: { cookie } })).status, 403)
  f.dto.grant.grant_id = 'other-grant'
  assert.equal((await f.request('/api/auth/profile', { headers: { cookie } })).status, 403)
  f.dto.grant.grant_id = account.grantId
  f.dto.pessoaId = 'other-person'
  assert.equal((await f.request('/api/auth/profile', { headers: { cookie } })).status, 403)
})


test('main production entry refuses isolated QA before integration initialization', () => {
  const run = spawnSync(process.execPath, ['server/index.js'], {
    cwd: process.cwd(), env: { PATH: process.env.PATH, PFC_SSO_QA_ISOLATED: 'true' }, encoding: 'utf8',
  })
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /QA isolado exige server\/qaSsoServer.js/)
})
