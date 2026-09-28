import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
const docker = readFileSync('Dockerfile', 'utf8')
const cloud = readFileSync('cloudbuild.yaml', 'utf8')
const files = ['dataServiceCore.js','metricFormulas.js','monetaryIndicators.js','regulatoryScore.js','uniodontoMetrics.js','metricFormulasModoUniodonto.js','uniodontoPerCapita.js']
assert.ok(docker.includes('ARG VITE_PFC_SSO_ENABLED=false'))
assert.ok(docker.includes('ENV VITE_PFC_SSO_ENABLED=$VITE_PFC_SSO_ENABLED'))
assert.ok(cloud.includes('_VITE_PFC_SSO_ENABLED: "false"'))
assert.ok(cloud.includes('_PFC_SSO_ENABLED: "false"'))
for (const secret of ['PFC_SSO_CLIENT_SECRET','PFC_SSO_COOKIE_KEY']) {
  assert.ok(!docker.includes(secret)); assert.ok(!cloud.includes(secret))
}
const dest = mkdtempSync(path.join(tmpdir(), 'pfc-packaging-'))
try {
  mkdirSync(path.join(dest,'src/lib'),{recursive:true})
  mkdirSync(path.join(dest,'server'))
  symlinkSync(path.resolve('node_modules'),path.join(dest,'node_modules'),'dir')
  writeFileSync(path.join(dest,'package.json'),'{"type":"module"}')
  for (const file of files) {
    assert.ok(docker.includes('/app/src/lib/'+file))
    copyFileSync('src/lib/'+file,path.join(dest,'src/lib',file))
  }
  copyFileSync('server/dataOperations.js',path.join(dest,'server/dataOperations.js'))
  const r=spawnSync(process.execPath,['--input-type=module','-e',"await import('./server/dataOperations.js')"],{cwd:dest,encoding:'utf8'})
  assert.equal(r.status,0,r.stderr)
  console.log('PASS isolated Node runtime import; seven exact engine dependencies; build flags OFF; no runtime secrets in build')
} finally { rmSync(dest,{recursive:true,force:true}) }
