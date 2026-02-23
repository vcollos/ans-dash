export const UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_ALL = 'todos'
export const UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_PRE = 'preestabelecido'
export const UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_POST = 'posestabelecido'

export const UNIODONTO_PER_CAPITA_REVENUE_BASE_CONTRAPRESTACAO = 'contraprestacao'
export const UNIODONTO_PER_CAPITA_REVENUE_BASE_RECEITA_PLANOS = 'receita_planos_odontologicos'

export const UNIODONTO_PER_CAPITA_DEFAULT_FILTERS = {
  paymentModality: UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_ALL,
  revenueBase: UNIODONTO_PER_CAPITA_REVENUE_BASE_CONTRAPRESTACAO,
}

export const UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_OPTIONS = [
  { value: UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_ALL, label: 'Todas' },
  { value: UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_PRE, label: 'Preestabelecido' },
  { value: UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_POST, label: 'Pós-estabelecido' },
]

export const UNIODONTO_PER_CAPITA_REVENUE_BASE_OPTIONS = [
  {
    value: UNIODONTO_PER_CAPITA_REVENUE_BASE_CONTRAPRESTACAO,
    label: 'Contraprestação',
    shortLabel: 'Contraprestações',
  },
  {
    value: UNIODONTO_PER_CAPITA_REVENUE_BASE_RECEITA_PLANOS,
    label: 'Receita de planos odontológicos',
    shortLabel: 'Receitas de planos',
  },
]

const PAYMENT_MODALITY_COLUMN_CANDIDATES = [
  'modalidade_pagamento',
  'modalidade_pgto',
  'modalidade_pagto',
  'tipo_modalidade_pagamento',
  'tp_modalidade_pagamento',
]

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

export function sanitizeUniodontoPerCapitaFilters(filters = {}) {
  const paymentRaw = normalizeText(filters.paymentModality)
  const revenueRaw = normalizeText(filters.revenueBase)

  let paymentModality = UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_ALL
  if (paymentRaw === 'preestabelecido' || paymentRaw === 'pre') {
    paymentModality = UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_PRE
  } else if (paymentRaw === 'posestabelecido' || paymentRaw === 'pos' || paymentRaw === 'post') {
    paymentModality = UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_POST
  }

  let revenueBase = UNIODONTO_PER_CAPITA_REVENUE_BASE_CONTRAPRESTACAO
  if (revenueRaw === 'receitaplanosodontologicos' || revenueRaw === 'receitaplanos') {
    revenueBase = UNIODONTO_PER_CAPITA_REVENUE_BASE_RECEITA_PLANOS
  }

  return {
    paymentModality,
    revenueBase,
  }
}

export function resolveUniodontoPerCapitaPaymentModalityColumn(availableColumns = []) {
  return PAYMENT_MODALITY_COLUMN_CANDIDATES.find((column) => availableColumns.includes(column)) ?? null
}

function normalizeSqlIdentifier(value) {
  return `\`${String(value).replace(/`/g, '\\`')}\``
}

export function buildPaymentModalityWhereClause(paymentModality, { availableColumns = [] } = {}) {
  const normalizedFilters = sanitizeUniodontoPerCapitaFilters({ paymentModality })
  if (normalizedFilters.paymentModality === UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_ALL) {
    return ''
  }

  const paymentColumn = resolveUniodontoPerCapitaPaymentModalityColumn(availableColumns)
  if (paymentColumn) {
    const normalizedColumnExpr = `REGEXP_REPLACE(NORMALIZE_AND_CASEFOLD(CAST(${normalizeSqlIdentifier(paymentColumn)} AS STRING), NFKD), r'[^a-z0-9]', '')`
    if (normalizedFilters.paymentModality === UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_PRE) {
      return `${normalizedColumnExpr} = 'preestabelecido'`
    }
    if (normalizedFilters.paymentModality === UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_POST) {
      return `${normalizedColumnExpr} = 'posestabelecido'`
    }
  }

  if (normalizedFilters.paymentModality === UNIODONTO_PER_CAPITA_PAYMENT_MODALITY_PRE) {
    return 'ABS(COALESCE(vr_contraprestacoes_pre, 0)) > 0'
  }

  return `
    (
      ABS(COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_contraprestacoes_pre, 0)) > 0
      OR (
        ABS(COALESCE(vr_contraprestacoes, 0)) > 0
        AND ABS(COALESCE(vr_contraprestacoes_pre, 0)) = 0
      )
    )
  `.trim()
}

export function resolveRevenueBaseOption(revenueBase) {
  const { revenueBase: resolved } = sanitizeUniodontoPerCapitaFilters({ revenueBase })
  return UNIODONTO_PER_CAPITA_REVENUE_BASE_OPTIONS.find((option) => option.value === resolved)
}

export function buildRevenueBaseExpression(revenueBase) {
  const { revenueBase: resolved } = sanitizeUniodontoPerCapitaFilters({ revenueBase })
  if (resolved === UNIODONTO_PER_CAPITA_REVENUE_BASE_RECEITA_PLANOS) {
    return `
      COALESCE(vr_contraprestacoes, 0)
      + COALESCE(vr_conta_332129111, 0)
      - COALESCE(vr_conta_32, 0)
    `.trim()
  }
  return 'COALESCE(vr_contraprestacoes, 0)'
}
