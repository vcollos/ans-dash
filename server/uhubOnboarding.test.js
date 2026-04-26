import test from 'node:test'
import assert from 'node:assert/strict'
import {
  decideUhubMatch,
  isInactiveUhubPerson,
  normalizeEmailForUhub,
  normalizePhoneForUhub,
} from './uhubOnboarding.js'

test('normalizeEmailForUhub trims and lowercases valid emails', () => {
  assert.equal(normalizeEmailForUhub('  User@Example.COM '), 'user@example.com')
  assert.equal(normalizeEmailForUhub('sem-arroba'), null)
})

test('normalizePhoneForUhub converts Brazilian mobile and landline numbers to E.164 digits', () => {
  assert.equal(normalizePhoneForUhub('(11) 99999-8888'), '5511999998888')
  assert.equal(normalizePhoneForUhub('(11) 3333-4444'), '551133334444')
  assert.equal(normalizePhoneForUhub('+55 11 99999-8888'), '5511999998888')
  assert.equal(normalizePhoneForUhub('123'), null)
})

test('decideUhubMatch approves a single email match', () => {
  assert.deepEqual(decideUhubMatch({ emailResults: [{ pessoa_id: 'p1' }], phoneResults: [] }), {
    approved: true,
    reason: 'match_seguro',
    pessoaId: 'p1',
    matchBy: 'email',
    idsEmail: ['p1'],
    idsPhone: [],
  })
})

test('decideUhubMatch approves when both channels point to the same person', () => {
  const result = decideUhubMatch({
    emailResults: [{ pessoa_id: 'p1' }],
    phoneResults: [{ pessoa_id: 'p1' }],
  })
  assert.equal(result.approved, true)
  assert.equal(result.matchBy, 'ambos')
})

test('decideUhubMatch sends conflicts and ambiguous results to manual queue', () => {
  assert.equal(
    decideUhubMatch({
      emailResults: [{ pessoa_id: 'p1' }],
      phoneResults: [{ pessoa_id: 'p2' }],
    }).reason,
    'conflito_canais',
  )
  assert.equal(
    decideUhubMatch({
      emailResults: [{ pessoa_id: 'p1' }, { pessoa_id: 'p2' }],
      phoneResults: [],
    }).reason,
    'ambiguo',
  )
  assert.equal(decideUhubMatch({ emailResults: [], phoneResults: [] }).reason, 'sem_match')
})

test('isInactiveUhubPerson detects inactive or deleted records', () => {
  assert.equal(isInactiveUhubPerson({ status_cadastro: 'inativo' }), true)
  assert.equal(isInactiveUhubPerson({ deleted_at: '2026-01-01T00:00:00Z' }), true)
  assert.equal(isInactiveUhubPerson({ status_cadastro: 'ativo' }), false)
})

