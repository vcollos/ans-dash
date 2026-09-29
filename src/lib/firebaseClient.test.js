import { test } from 'node:test'
import { Buffer } from 'node:buffer'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Exercise module initialization with an SDK double: no network or Firebase app.
test('isolated QA initializes no Firebase SDK; both explicit flags are required', async () => {
  const source = await readFile(new URL('./firebaseClient.js', import.meta.url), 'utf8')
  for (const [sso, isolated, expected] of [['true', 'true', true], ['false', 'true', false], ['true', 'false', false], [undefined, undefined, false]]) {
    const env = { VITE_PFC_SSO_ENABLED: sso, VITE_PFC_SSO_QA_ISOLATED: isolated, VITE_FIREBASE_API_KEY: 'fake', VITE_FIREBASE_AUTH_DOMAIN: 'fake', VITE_FIREBASE_PROJECT_ID: 'fake', VITE_FIREBASE_APP_ID: 'fake' }
    const tested = source
      .replace("import { initializeApp, getApps } from 'firebase/app'", "export const calls = []; const getApps = () => { calls.push('getApps'); return [] }; const initializeApp = () => { calls.push('initializeApp'); return {} }")
      .replace("import { getAuth, GoogleAuthProvider } from 'firebase/auth'", "const getAuth = () => { calls.push('getAuth'); return {} }; class GoogleAuthProvider { constructor() { calls.push('GoogleAuthProvider') } }")
      .replaceAll('import.meta.env', JSON.stringify(env))
    const result = await import(`data:text/javascript;base64,${Buffer.from(tested).toString('base64')}`)
    assert.equal(result.SSO_QA_ISOLATED, expected)
    if (expected) {
      assert.deepEqual(result.calls, [])
      assert.equal(result.auth, null)
      assert.equal(result.app, null)
      assert.equal(result.googleProvider, null)
    } else {
      assert.deepEqual(result.calls, ['getApps', 'initializeApp', 'getAuth', 'GoogleAuthProvider'])
    }
  }
})
