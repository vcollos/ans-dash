import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUploadDashboard, uploadDashboardCsv } from './adminUploadDashboard.js'

const report = {
  operators: [
    { regAns: '1', operatorName: 'Belém', totalUploads: 2, periodsSent: ['2026-03', '2026-06'], neverSubmitted: false },
    { regAns: '2', operatorName: 'Sem envios', totalUploads: 0, periodsSent: [], neverSubmitted: true },
  ],
  uploads: [
    { regAns: '1', uploadId: 'a', competencia: '2026-06', competencias: ['2026-03', '2026-06'], uploadedByEmail: 'remetente@example.test', responsavelEmail: 'responsavel@example.test' },
    { regAns: '1', uploadId: 'b', competencia: '2026-06' },
  ],
}

test('conta uploads distintos e todos os períodos de arquivo multiperíodo', () => {
  assert.equal(buildUploadDashboard(report)[0].selectedUploads.length, 2)
  assert.equal(buildUploadDashboard(report, { period: '2026-03' })[0].selectedUploads.length, 1)
  assert.equal(buildUploadDashboard(report, { period: '2026-06' })[0].selectedUploads.length, 2)
})

test('período sem uploads mostra todas sem envio mas nunca enviou mantém histórico', () => {
  assert.equal(buildUploadDashboard(report, { period: '2027-01', status: 'missing' }).length, 2)
  assert.deepEqual(buildUploadDashboard(report, { period: '2027-01', status: 'never' }).map((item) => item.regAns), ['2'])
  assert.equal(buildUploadDashboard(report, { period: '2027-01', status: 'sent' }).length, 0)
})

test('busca ignora acentos e encontra remetente sem confundir responsável', () => {
  assert.equal(buildUploadDashboard(report, { search: 'belem' }).length, 1)
  assert.equal(buildUploadDashboard(report, { search: 'remetente@example.test' }).length, 1)
  assert.equal(buildUploadDashboard(report, { operator: '2', search: 'belem' }).length, 0)
})

test('contatos são vínculos atuais cadastrados, não remetentes inferidos', () => {
  const items = buildUploadDashboard(report, {}, [
    { email: 'ativo@example.test', accessLinks: [{ regAns: '2', active: true }] },
    { email: 'inativo@example.test', accessLinks: [{ regAns: '2', active: false }] },
  ])
  assert.deepEqual(items[1].contacts, ['ativo@example.test'])
  assert.deepEqual(items[0].contacts, [])
})

test('CSV protege fórmulas, preserva aspas e exporta apenas lista filtrada', () => {
  const items = buildUploadDashboard(report, { status: 'never' })
  items[0].operatorName = '=HYPERLINK("x")'
  items[0].contacts = ['\t=1+1', '+123']
  const csv = uploadDashboardCsv(items, '2027-01')
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'))
  assert.ok(csv.includes('"\'\t=1+1, +123"'))
  assert.ok(csv.includes('"2027-01";"Sem envio";"0";"0"'))
  assert.ok(!csv.includes('Belém'))
})
