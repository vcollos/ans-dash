import test from 'node:test'
import assert from 'node:assert/strict'
import {
  UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_POST,
  UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_PRE,
  UNIODONTO_PER_CAPITA_REVENUE_BASE_CONTRAPRESTACAO,
  UNIODONTO_PER_CAPITA_REVENUE_BASE_RECEITA_PLANOS,
  buildPaymentModalityWhereClause,
  buildRevenueBaseExpression,
  resolveUniodontoPerCapitaPaymentModalityColumn,
  sanitizeUniodontoPerCapitaFilters,
} from './uniodontoPerCapita.js'

test('sanitizeUniodontoPerCapitaFilters aplica defaults', () => {
  const result = sanitizeUniodontoPerCapitaFilters({})
  assert.equal(result.paymentModality, 'todos')
  assert.equal(result.revenueBase, UNIODONTO_PER_CAPITA_REVENUE_BASE_CONTRAPRESTACAO)
})

test('sanitizeUniodontoPerCapitaFilters aceita aliases de valores', () => {
  const result = sanitizeUniodontoPerCapitaFilters({
    paymentModality: 'Pós-estabelecido',
    revenueBase: 'Receita Planos',
  })
  assert.equal(result.paymentModality, UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_POST)
  assert.equal(result.revenueBase, UNIODONTO_PER_CAPITA_REVENUE_BASE_RECEITA_PLANOS)
})

test('resolveUniodontoPerCapitaPaymentModalityColumn encontra primeira coluna disponível', () => {
  const resolved = resolveUniodontoPerCapitaPaymentModalityColumn([
    'foo',
    'modalidade_pagto',
    'modalidade_pagamento',
  ])
  assert.equal(resolved, 'modalidade_pagamento')
})

test('buildPaymentModalityWhereClause usa coluna dedicada quando disponível', () => {
  const clause = buildPaymentModalityWhereClause(UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_PRE, {
    availableColumns: ['modalidade_pagamento'],
  })
  assert.match(clause, /modalidade_pagamento/)
  assert.match(clause, /preestabelecido/)
})

test('buildPaymentModalityWhereClause usa fallback para preestabelecido sem coluna dedicada', () => {
  const clause = buildPaymentModalityWhereClause(UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_PRE, {
    availableColumns: [],
  })
  assert.equal(clause, 'ABS(COALESCE(vr_contraprestacoes_pre, 0)) > 0')
})

test('buildPaymentModalityWhereClause usa fallback para pós-estabelecido sem coluna dedicada', () => {
  const clause = buildPaymentModalityWhereClause(UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_POST, {
    availableColumns: [],
  })
  assert.match(clause, /vr_contraprestacoes/)
  assert.match(clause, /vr_contraprestacoes_pre/)
})

test('buildRevenueBaseExpression resolve expressão de contraprestação', () => {
  const clause = buildRevenueBaseExpression(UNIODONTO_PER_CAPITA_REVENUE_BASE_CONTRAPRESTACAO)
  assert.equal(clause, 'COALESCE(vr_contraprestacoes, 0)')
})

test('buildRevenueBaseExpression resolve expressão de receita de planos', () => {
  const clause = buildRevenueBaseExpression(UNIODONTO_PER_CAPITA_REVENUE_BASE_RECEITA_PLANOS)
  assert.match(clause, /vr_contraprestacoes/)
  assert.match(clause, /vr_conta_332129111/)
  assert.match(clause, /vr_conta_32/)
})
