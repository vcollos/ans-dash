import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUploadReport, validateReportCompetencia } from './uploadReport.js'

const catalog = [{ regAns: '1', operatorName: 'Um' }, { regAns: '2', operatorName: 'Dois' }]
const upload = (overrides = {}) => ({
  regAns: '1', uploadId: 'a', competencia: '2026-01', uploadedAt: '2026-02-01T00:00:00Z',
  uploadedByEmail: 'remetente@example.com', responsavelEmail: 'responsavel@example.com', rowCount: 100,
  ...overrides,
})

test('mantém órfãos do catálogo, reenvios e quem nunca enviou; deduplica linhas por ID', () => {
  const first = upload()
  const report = buildUploadReport(catalog, [first, first, upload({ uploadId: 'b', uploadedAt: '2026-03-01T00:00:00Z' }),
    upload({ regAns: '3', operatorName: 'Três' })])
  assert.equal(report.summary.totalUploads, 3)
  assert.equal(report.summary.operators, 3)
  assert.equal(report.summary.neverSubmitted, 1)
  const row = report.rows.find((item) => item.regAns === '1')
  assert.equal(row.uploadCount, 2)
  assert.equal(row.upload.uploadId, 'b')
  assert.equal(row.upload.uploadedByEmail, 'remetente@example.com')
  assert.equal(row.upload.responsavelEmail, 'responsavel@example.com')
  assert.equal(report.operators.find((item) => item.regAns === '2').neverSubmitted, true)
})

test('não limita histórico a 12 períodos e conta upload multiperíodo uma vez', () => {
  const uploads = Array.from({ length: 13 }, (_, i) => upload({ competencia: `${2020 + i}-01` }))
  const report = buildUploadReport(catalog, uploads, '2040-02')
  assert.equal(report.periods.length, 14)
  assert.equal(report.summary.totalUploads, 1)
  assert.equal(report.operators.find((item) => item.regAns === '1').periodsSent.length, 13)
  assert.equal(report.rows.find((item) => item.regAns === '1' && item.competencia === '2040-02').status, 'pendente')
  assert.equal(report.operators.find((item) => item.regAns === '1').neverSubmitted, false)
})

test('catálogo sem uploads mantém operadoras nunca enviaram', () => {
  const report = buildUploadReport(catalog, [])
  assert.equal(report.summary.neverSubmitted, 2)
  assert.equal(report.rows.length, 2)
  assert.equal(report.uploads.length, 0)
})

test('valida competência opcional e rejeita arrays, objetos e meses inválidos', () => {
  assert.equal(validateReportCompetencia(undefined), null)
  assert.equal(validateReportCompetencia('2026-09'), '2026-09')
  for (const value of ['', '2026-00', '2026-13', ['2026-01'], {}, '2026-1']) {
    assert.throws(() => validateReportCompetencia(value), { statusCode: 400 })
  }
})

test('une snapshot e catálogo atual sem duplicar e preserva Brasil sem envio', () => {
  const current = [{ regAns: '314315', operatorName: 'Uniodonto do Brasil' }, { regAns: '1', operatorName: 'Um atual' }]
  const report = buildUploadReport([...catalog, ...current], [upload()])
  assert.equal(report.summary.operators, 3)
  assert.equal(report.summary.neverSubmitted, 2)
  assert.equal(report.operators.find((operator) => operator.regAns === '1').operatorName, 'Um atual')
  assert.equal(report.operators.find((operator) => operator.regAns === '314315').neverSubmitted, true)
})
