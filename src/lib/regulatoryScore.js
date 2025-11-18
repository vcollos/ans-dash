import { metricSql } from './metricFormulas'

export const NOTE_LABELS = {
  1: 'RUIM',
  2: 'REGULAR',
  3: 'BOA',
  4: 'ÓTIMA',
}

export const FINAL_CLASSIFICATION_THRESHOLDS = [
  { min: 3.5, label: 'ÓTIMA' },
  { min: 2.5, label: 'BOA' },
  { min: 1.8, label: 'REGULAR' },
  { min: 0, label: 'RUIM' },
]

export const REGULATORY_PERCENTILE_KEYS = ['p10', 'q1', 'median', 'q3', 'p90']
export const REGULATORY_PERCENTILES = {
  p10: 0.1,
  q1: 0.25,
  median: 0.5,
  q3: 0.75,
  p90: 0.9,
}

export const REGULATORY_INDICATORS = [
  {
    id: 'liquidez_corrente',
    label: 'Liquidez Corrente',
    format: 'ratio',
    unit: 'x',
    trend: 'higher',
    weight: 0.2,
  },
  {
    id: 'cobertura_provisoes',
    label: 'Cobertura de Provisões Técnicas',
    format: 'ratio',
    unit: 'x',
    trend: 'higher',
  },
  {
    id: 'pmpe',
    label: 'PMPE (dias)',
    format: 'days',
    unit: 'dias',
    trend: 'lower',
  },
  {
    id: 'pmcr',
    label: 'PMCR (dias)',
    format: 'days',
    unit: 'dias',
    trend: 'lower',
  },
  {
    id: 'margem_lucro_pct',
    label: 'Margem Líquida (%)',
    format: 'percent',
    unit: '%',
    trend: 'higher',
    weight: 0.15,
  },
  {
    id: 'sinistralidade_pct',
    label: 'Sinistralidade (%)',
    format: 'percent',
    unit: '%',
    trend: 'lower',
    weight: 0.15,
  },
  {
    id: 'resultado_operacional_margem_pct',
    label: 'Resultado Operacional (%)',
    format: 'percent',
    unit: '%',
    trend: 'higher',
    weight: 0.1,
  },
  {
    id: 'despesas_adm_pct',
    label: 'Despesas Administrativas (%)',
    format: 'percent',
    unit: '%',
    trend: 'lower',
    weight: 0.1,
  },
  {
    id: 'despesas_comerciais_pct',
    label: 'Despesas Comerciais (%)',
    format: 'percent',
    unit: '%',
    trend: 'lower',
    weight: 0.05,
  },
  {
    id: 'indice_resultado_financeiro_pct',
    label: 'Resultado Financeiro (%)',
    format: 'percent',
    unit: '%',
    trend: 'higher',
    weight: 0.05,
  },
]

export const REGULATORY_SOLVENCY_BLOCK = {
  id: 'solvency',
  label: 'Provisões / PMPE / PMCR',
  indicators: ['cobertura_provisoes', 'pmpe', 'pmcr'],
  weight: 0.2,
}

export const REGULATORY_BASE_TEXT =
  'Classificação baseada na metodologia ANS – RN 518/2022 (DM, DA, DC, PMPE, PMCR, IRF) e diretrizes prudenciais da RN 630/2025.'

const INDICATOR_MAP = Object.fromEntries(REGULATORY_INDICATORS.map((indicator) => [indicator.id, indicator]))

function clamp(value, min, max) {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return Math.min(Math.max(value, min), max)
}

export function getIndicatorSql(indicatorId) {
  return metricSql[indicatorId] ?? null
}

function getPercentileField(indicatorId, suffix) {
  return `${indicatorId}_${suffix}`
}

export function classifyIndicator(value, percentiles, trend) {
  if (value === null || value === undefined || percentiles?.q1 === undefined || percentiles?.median === undefined || percentiles?.q3 === undefined) {
    return { note: null, classification: 'SEM DADO' }
  }
  let note = null
  if (trend === 'lower') {
    if (value < percentiles.q1) note = 4
    else if (value < percentiles.median) note = 3
    else if (value < percentiles.q3) note = 2
    else note = 1
  } else {
    if (value >= percentiles.q3) note = 4
    else if (value >= percentiles.median) note = 3
    else if (value >= percentiles.q1) note = 2
    else note = 1
  }
  return { note, classification: NOTE_LABELS[note] }
}

function computeWeightedAverage(entries) {
  let totalWeight = 0
  let weightedSum = 0
  entries.forEach(({ note, weight }) => {
    if (note === null || note === undefined) return
    if (!weight || weight <= 0) return
    totalWeight += weight
    weightedSum += note * weight
  })
  if (totalWeight === 0) return null
  return weightedSum / totalWeight
}

function classifyFinalScore(score) {
  if (score === null || score === undefined) {
    return { label: 'SEM DADO', value: null }
  }
  const entry = FINAL_CLASSIFICATION_THRESHOLDS.find((threshold) => score >= threshold.min)
  return { label: entry?.label ?? 'RUIM', value: score }
}

export function evaluateRegulatoryScore(payload) {
  if (!payload?.operator) return null
  const operator = payload.operator
  const peerStats = payload.peers ?? {}
  const metrics = REGULATORY_INDICATORS.map((indicator) => {
    const valueRaw = operator[indicator.id]
    const percentiles = Object.fromEntries(
      REGULATORY_PERCENTILE_KEYS.map((key) => [key, peerStats[getPercentileField(indicator.id, key)] ?? null]),
    )
    const rating = classifyIndicator(valueRaw ?? null, percentiles, indicator.trend)
    return {
      ...indicator,
      value: valueRaw ?? null,
      percentiles,
      ...rating,
    }
  })
  const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]))
  const solvencyMetrics = REGULATORY_SOLVENCY_BLOCK.indicators
    .map((id) => byId[id])
    .filter(Boolean)
  const solvencyScore = computeWeightedAverage(
    solvencyMetrics.map((metric) => ({
      note: metric.note,
      weight: 1 / Math.max(solvencyMetrics.length, 1),
    })),
  )
  const solvencyNote = solvencyScore ? clamp(Math.round(solvencyScore), 1, 4) : null

  const overallScore = computeWeightedAverage([
    { note: byId.liquidez_corrente?.note, weight: 0.2 },
    { note: solvencyScore, weight: REGULATORY_SOLVENCY_BLOCK.weight },
    { note: byId.margem_lucro_pct?.note, weight: 0.15 },
    { note: byId.sinistralidade_pct?.note, weight: 0.15 },
    { note: byId.resultado_operacional_margem_pct?.note, weight: 0.1 },
    { note: byId.despesas_adm_pct?.note, weight: 0.1 },
    { note: byId.despesas_comerciais_pct?.note, weight: 0.05 },
    { note: byId.indice_resultado_financeiro_pct?.note, weight: 0.05 },
  ])

  return {
    operator: {
      name: operator.nome_operadora,
      period: operator.periodo ?? `${operator.ano ?? ''}T${operator.trimestre ?? ''}`,
      ano: operator.ano,
      trimestre: operator.trimestre,
    },
    peerCount: peerStats?.peer_total ?? 0,
    metrics,
    solvency: {
      label: REGULATORY_SOLVENCY_BLOCK.label,
      value: solvencyScore,
      note: solvencyNote,
      classification: solvencyNote ? NOTE_LABELS[solvencyNote] : 'SEM DADO',
    },
    finalScore: {
      value: overallScore,
      ...classifyFinalScore(overallScore),
    },
  }
}
