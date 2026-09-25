import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveMissingFormulaResults, stripTrailingBalanceteSummary } from './spreadsheetSanitizer.js'

test('resolves missing cached formula results including zero and chained references', () => {
  const sheet = {
    F33: { t: 'z', f: 'F34+F36', v: 0 },
    F34: { t: 'n', v: 81.85 },
    F36: { t: 'n', v: -81.85 },
    F62: { t: 'z', f: 'F63', v: 0 },
    F63: { t: 'n', v: 0 },
    F161: { t: 'z', f: 'F162', v: 0 },
    F162: { t: 'z', f: 'F63', v: 0 },
  }
  resolveMissingFormulaResults(sheet, 161)
  for (const address of ['F33', 'F62', 'F161']) {
    assert.equal(sheet[address].v, 0)
    assert.equal(sheet[address].t, 'n')
  }
})

test('rejects unsupported formulas instead of guessing a result', () => {
  assert.throws(
    () => resolveMissingFormulaResults({ F2: { t: 'z', f: 'SUM(F3:F4)', v: 0 } }),
    /Fórmula não suportada em F2/,
  )
})

test('does not require unrelated columns to use supported formulas', () => {
  const sheet = {
    C2: { t: 'z', f: 'SUM(C3:C4)', v: 0 },
    F2: { t: 'z', f: 'F3', v: 0 },
    F3: { t: 'n', v: 0 },
  }
  resolveMissingFormulaResults(sheet, 3, 'F')
  assert.equal(sheet.F2.v, 0)
  assert.equal(sheet.C2.t, 'z')
})

test('ignores a trailing repeated header and summaries but preserves invalid data rows', () => {
  const resolve = (value) => ({ Conta: 'cd_conta_contabil', Saldo: 'vl_saldo_final' })[value] ?? value
  const data = [
    { Conta: '214', Saldo: 0 },
    { Conta: '', Saldo: 5 },
    { Conta: '216', Saldo: 10 },
    { Conta: '', Saldo: 'Saldo' },
    { Conta: '', Saldo: 123 },
  ]
  assert.deepEqual(stripTrailingBalanceteSummary(data, resolve), data.slice(0, 3))
  assert.deepEqual(stripTrailingBalanceteSummary(data.slice(0, 2), resolve), data.slice(0, 2))
})
