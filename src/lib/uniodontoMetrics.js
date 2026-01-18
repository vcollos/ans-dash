const safePercentSql = (numerator, denominator) => `
CASE
  WHEN (${denominator}) IS NULL OR (${denominator}) = 0 THEN NULL
  ELSE ((${numerator}) / (${denominator})) * 100
END
`

const safeRatioSql = (numerator, denominator) => `
CASE
  WHEN (${denominator}) IS NULL OR (${denominator}) = 0 THEN NULL
  ELSE ((${numerator}) / (${denominator}))
END
`

const receitaOperacionalSql =
  'COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_outras_receitas_operacionais, 0)'
const impostosSql = 'COALESCE(vr_conta_61, 0)'
const receitaTotalSql = `(${receitaOperacionalSql}) - ${impostosSql}`
const despesasAdministrativasSql = 'COALESCE(vr_desp_administrativas, 0)'
const despesasAssistenciaisSql = 'COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_outras_desp_oper, 0)'
const despesasComerciaisSql =
  'COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_desp_comerciais_promocoes, 0)'
const resultadoIndiceSql =
  'COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_desp_comerciais_promocoes, 0)'
const periodMonthsSql = 'COALESCE(trimestre, 0) * 3'
const periodHoursSql = `(${periodMonthsSql}) * 220`
const periodDaysSql = `(${periodMonthsSql}) * 30`
const periodWeeksSql = `(${periodMonthsSql}) * 4.5`
const prestadoresSql = 'COALESCE(qt_prestadores, 0)'
const beneficiariosSql = 'COALESCE(qt_beneficiarios, 0)'
const prevBeneficiariosSql = 'COALESCE(prev_qt_beneficiarios, 0)'
const beneficiariosCrescimentoSql = safePercentSql(
  `${beneficiariosSql} - ${prevBeneficiariosSql}`,
  prevBeneficiariosSql,
)
const despesasAdministrativasHoraSql = safeRatioSql(despesasAdministrativasSql, periodHoursSql)
const despesasAdministrativasDiaSql = safeRatioSql(despesasAdministrativasSql, periodDaysSql)
const despesasAdministrativasSemanaSql = safeRatioSql(despesasAdministrativasSql, periodWeeksSql)
const custoPrestadorSql = safeRatioSql(despesasAssistenciaisSql, prestadoresSql)
const receitaPrestadorSql = safeRatioSql(receitaOperacionalSql, prestadoresSql)
const repassePrestadorSql = `(${custoPrestadorSql}) - (${receitaPrestadorSql})`
const liquidezImediataSql = safeRatioSql(
  'COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)',
  'COALESCE(vr_passivo_circulante, 0)',
)
const emprestimosParcelamentosSql = safeRatioSql(
  'ABS(COALESCE(vr_conta_237, 0)) + ABS(COALESCE(vr_conta_271, 0))',
  'ABS(COALESCE(vr_ativos_garantidores, 0))',
)
const provisoesTributariasCiveisTrabalhistasSql =
  'COALESCE(vr_conta_216, 0) + COALESCE(vr_conta_236, 0)'

const indiceDespesasAdministrativasSql = safePercentSql(despesasAdministrativasSql, receitaTotalSql)
const indiceDespesasAssistenciaisSql = safePercentSql(despesasAssistenciaisSql, receitaOperacionalSql)
const indiceDespesasComerciaisSql = safePercentSql(despesasComerciaisSql, receitaOperacionalSql)
const indiceResultadoSql = safePercentSql(resultadoIndiceSql, receitaOperacionalSql)

const ADMIN_WEIGHT_RULES = [
  { max: 26.99, weight: 10 },
  { max: 28.99, weight: 9 },
  { max: 30.99, weight: 8 },
  { max: 32.99, weight: 7 },
  { max: 34.99, weight: 6 },
  { max: 35.99, weight: 5 },
  { max: 37.99, weight: 4 },
  { max: 39.99, weight: 3 },
  { max: 41.99, weight: 2 },
  { max: 43.99, weight: 1 },
  { max: null, weight: 0 },
]

const ASSIST_WEIGHT_RULES = [
  { max: 46.99, weight: 0 },
  { max: 47.99, weight: 1 },
  { max: 49.99, weight: 2 },
  { max: 51.99, weight: 3 },
  { max: 54.99, weight: 4 },
  { max: 55.99, weight: 5 },
  { max: 57.99, weight: 6 },
  { max: 59.99, weight: 7 },
  { max: 61.99, weight: 8 },
  { max: 63.99, weight: 9 },
  { max: null, weight: 10 },
]

const COMERCIAL_WEIGHT_RULES = [
  { max: 0, weight: 0 },
  { max: 0.49, weight: 1 },
  { max: 0.99, weight: 2 },
  { max: 2.99, weight: 3 },
  { max: 4.99, weight: 4 },
  { max: 5.99, weight: 5 },
  { max: 7.99, weight: 6 },
  { max: 9.99, weight: 7 },
  { max: 11.99, weight: 8 },
  { max: 13.99, weight: 9 },
  { max: null, weight: 10 },
]

const RESULT_WEIGHT_RULES = [
  { max: -7.5, weight: -15 },
  { max: -5.0, weight: -12 },
  { max: -2.5, weight: -9 },
  { max: -1.0, weight: -6 },
  { max: -0.000001, weight: -3 },
  { max: 0.99, weight: 0 },
  { max: 2.49, weight: 3 },
  { max: 4.99, weight: 6 },
  { max: 7.49, weight: 9 },
  { max: 9.99, weight: 12 },
  { max: null, weight: 15 },
]

const buildWeightSql = (valueExpr, rules) => {
  const lines = ['CASE', `  WHEN (${valueExpr}) IS NULL THEN NULL`]
  rules.forEach((rule) => {
    if (rule.max === null || rule.max === undefined) {
      lines.push(`  ELSE ${rule.weight}`)
    } else {
      lines.push(`  WHEN (${valueExpr}) <= ${rule.max} THEN ${rule.weight}`)
    }
  })
  lines.push('END')
  return lines.join('\n')
}

const pesoDespesasAdministrativasSql = buildWeightSql(indiceDespesasAdministrativasSql, ADMIN_WEIGHT_RULES)
const pesoDespesasAssistenciaisSql = buildWeightSql(indiceDespesasAssistenciaisSql, ASSIST_WEIGHT_RULES)
const pesoDespesasComerciaisSql = buildWeightSql(indiceDespesasComerciaisSql, COMERCIAL_WEIGHT_RULES)
const pesoResultadoSql = buildWeightSql(indiceResultadoSql, RESULT_WEIGHT_RULES)
const rankingOperacionalSql = `
CASE
  WHEN (${pesoDespesasAssistenciaisSql}) IS NULL
    OR (${pesoDespesasAdministrativasSql}) IS NULL
    OR (${pesoDespesasComerciaisSql}) IS NULL
    OR (${pesoResultadoSql}) IS NULL THEN NULL
  ELSE (${pesoDespesasAssistenciaisSql})
    + (${pesoDespesasAdministrativasSql})
    + (${pesoDespesasComerciaisSql})
    + (${pesoResultadoSql})
END
`.trim()
const icuOperacionalSql = `(${receitaTotalSql}) - ${despesasAdministrativasSql} - ${despesasAssistenciaisSql} - ${despesasComerciaisSql}`
const icuScoreSql = `
CASE
  WHEN (${pesoDespesasAssistenciaisSql}) IS NULL
    OR (${pesoDespesasAdministrativasSql}) IS NULL
    OR (${pesoDespesasComerciaisSql}) IS NULL
    OR (${pesoResultadoSql}) IS NULL THEN NULL
  ELSE ((${pesoDespesasAssistenciaisSql}) * 0.55)
    + ((${pesoDespesasAdministrativasSql}) * 0.35)
    + ((${pesoDespesasComerciaisSql}) * 0.05)
    + ((${pesoResultadoSql}) * 0.05)
END
`.trim()

export const UNIODONTO_INDICATORS = [
  {
    id: 'ranking_operacional',
    label: 'Ranking operacional',
    format: 'score',
    trend: 'higher',
    description: 'Soma dos pesos (assistencial + administrativo + comercial + resultado).',
  },
  {
    id: 'icu_score',
    label: 'Score ICU (Uniodonto)',
    format: 'score',
    trend: 'higher',
    description: 'Score ponderado (55% assistencial, 35% administrativo, 5% comercial, 5% resultado).',
  },
  {
    id: 'receita_total_uniodonto',
    label: 'Receita total (Uniodonto)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111) - 32 (contraprestacoes + outras receitas - impostos).',
  },
  {
    id: 'beneficiarios_crescimento_pct',
    label: 'Crescimento de beneficiários (%)',
    format: 'percent',
    trend: 'higher',
    description: 'Variação percentual dos beneficiários em relação ao período anterior.',
  },
  {
    id: 'indice_despesas_assistenciais_pct',
    label: 'Indice despesas assistenciais (%)',
    format: 'percent',
    trend: 'higher',
    description: '(41 + 442129119) / (31 + 332129111).',
  },
  {
    id: 'indice_despesas_administrativas_pct',
    label: 'Indice despesas administrativas (%)',
    format: 'percent',
    trend: 'lower',
    description: '46 / Receita total.',
  },
  {
    id: 'indice_despesas_comerciais_pct',
    label: 'Indice despesas comerciais (%)',
    format: 'percent',
    trend: 'higher',
    description: '(43 + 464) / (31 + 332129111).',
  },
  {
    id: 'indice_resultado_pct',
    label: 'Indice de resultado (%)',
    format: 'percent',
    trend: 'higher',
    description: '(46 - 464) / (31 + 332129111).',
  },
  {
    id: 'icu_operacional',
    label: 'ICU operacional',
    format: 'currency',
    trend: 'higher',
    description: 'Ingressos - despesas administrativas - sinistralidade - despesas comerciais.',
  },
  {
    id: 'despesa_adm_por_hora',
    label: 'Despesa administrativa por hora',
    format: 'currency',
    trend: 'lower',
    description: '46 / 220H.',
  },
  {
    id: 'despesa_adm_por_dia',
    label: 'Despesa administrativa por dia',
    format: 'currency',
    trend: 'lower',
    description: '46 / 30D.',
  },
  {
    id: 'despesa_adm_por_semana',
    label: 'Despesa administrativa por semana',
    format: 'currency',
    trend: 'lower',
    description: '46 / 4,5S.',
  },
  {
    id: 'icp_custo_prestador',
    label: 'ICP – Custo por prestador',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / prestador.',
  },
  {
    id: 'irp_receita_prestador',
    label: 'IRP – Receita média por prestador',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111) / prestador.',
  },
  {
    id: 'indice_repasse_prestador',
    label: 'Repasse prestador (ICP - IRP)',
    format: 'currency',
    trend: 'lower',
    description: 'ICP - IRP.',
  },
  {
    id: 'liquidez_imediata',
    label: 'Liquidez imediata',
    format: 'decimal',
    trend: 'higher',
    description: '(1213 + 1214 + 122) / 21.',
  },
  {
    id: 'emprestimos_parcelamentos',
    label: 'Empréstimos e parcelamentos',
    format: 'decimal',
    trend: 'lower',
    description: '(237 + 271) / 31 — razão sobre ativos garantidores.',
  },
  {
    id: 'provisoes_tributarias_civeis_trabalhistas',
    label: 'Provisões tributárias, cíveis e trabalhistas',
    format: 'currency',
    trend: 'lower',
    description: '216 + 236.',
  },
]

export const UNIODONTO_RANKING_METRICS = UNIODONTO_INDICATORS

export const DEFAULT_UNIODONTO_RANKING_METRIC = 'ranking_operacional'

export const UNIODONTO_METRIC_SQL = {
  receita_operacional: receitaOperacionalSql,
  receita_total_uniodonto: receitaTotalSql,
  despesas_administrativas: despesasAdministrativasSql,
  despesas_assistenciais: despesasAssistenciaisSql,
  despesas_comerciais: despesasComerciaisSql,
  beneficiarios_crescimento_pct: beneficiariosCrescimentoSql,
  despesa_adm_por_hora: despesasAdministrativasHoraSql,
  despesa_adm_por_dia: despesasAdministrativasDiaSql,
  despesa_adm_por_semana: despesasAdministrativasSemanaSql,
  icp_custo_prestador: custoPrestadorSql,
  irp_receita_prestador: receitaPrestadorSql,
  indice_repasse_prestador: repassePrestadorSql,
  liquidez_imediata: liquidezImediataSql,
  emprestimos_parcelamentos: emprestimosParcelamentosSql,
  provisoes_tributarias_civeis_trabalhistas: provisoesTributariasCiveisTrabalhistasSql,
  indice_despesas_administrativas_pct: indiceDespesasAdministrativasSql,
  indice_despesas_assistenciais_pct: indiceDespesasAssistenciaisSql,
  indice_despesas_comerciais_pct: indiceDespesasComerciaisSql,
  indice_resultado_pct: indiceResultadoSql,
  peso_despesas_administrativas: pesoDespesasAdministrativasSql,
  peso_despesas_assistenciais: pesoDespesasAssistenciaisSql,
  peso_despesas_comerciais: pesoDespesasComerciaisSql,
  peso_resultado: pesoResultadoSql,
  ranking_operacional: rankingOperacionalSql,
  icu_operacional: icuOperacionalSql,
  icu_score: icuScoreSql,
}

export function getUniodontoMetricSql(metricId) {
  return UNIODONTO_METRIC_SQL[metricId] ?? null
}

const numberOrZero = (value) => {
  if (value === null || value === undefined) return 0
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

const numberOrNull = (value) => {
  if (value === null || value === undefined) return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const safePercent = (numerator, denominator) => {
  if (!Number.isFinite(denominator) || denominator === 0) return null
  const value = (numerator / denominator) * 100
  return Number.isFinite(value) ? value : null
}

const safeRatio = (numerator, denominator) => {
  if (!Number.isFinite(denominator) || denominator === 0) return null
  const value = numerator / denominator
  return Number.isFinite(value) ? value : null
}

const applyWeightRules = (value, rules) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  for (const rule of rules) {
    if (rule.max === null || rule.max === undefined) return rule.weight
    if (value <= rule.max) return rule.weight
  }
  return null
}

export function computeUniodontoMetrics(row = {}) {
  const contraprestacoes = numberOrZero(row.vr_contraprestacoes)
  const outrasReceitas = numberOrZero(row.vr_outras_receitas_operacionais)
  const impostos = numberOrZero(row.vr_conta_61)
  const despesasAdministrativas = numberOrZero(row.vr_desp_administrativas)
  const despesasAssistenciais = numberOrZero(row.vr_eventos_liquidos) + numberOrZero(row.vr_outras_desp_oper)
  const despesasComerciais =
    numberOrZero(row.vr_desp_comerciais) + numberOrZero(row.vr_desp_comerciais_promocoes)
  const beneficiarios = numberOrNull(row.qt_beneficiarios)
  const prevBeneficiarios = numberOrNull(
    row.prev_qt_beneficiarios ?? row?.previousPeriod?.qt_beneficiarios,
  )
  const prestadores = numberOrNull(row.qt_prestadores)
  const ativosGarantidores = numberOrNull(row.vr_ativos_garantidores)
  const hasConta216 = row.vr_conta_216 !== null && row.vr_conta_216 !== undefined
  const hasConta236 = row.vr_conta_236 !== null && row.vr_conta_236 !== undefined
  const provisoesTribCivTrabAvailable = hasConta216 || hasConta236
  const liquidezImediataNumerator =
    numberOrZero(row.vr_conta_1213) + numberOrZero(row.vr_conta_1214) + numberOrZero(row.vr_conta_122)
  const passivoCirculante = numberOrNull(row.vr_passivo_circulante)
  const resolvedTrimestre = (() => {
    const fromTrimestre = numberOrNull(row.trimestre)
    if (fromTrimestre !== null) return fromTrimestre
    const periodoId = numberOrNull(row.periodo_id)
    if (periodoId !== null) {
      const trimmed = Math.abs(periodoId) % 10
      return Number.isFinite(trimmed) ? trimmed : null
    }
    if (typeof row.periodo === 'string') {
      const match = row.periodo.match(/T(\d+)/i)
      if (match) {
        const parsed = Number(match[1])
        return Number.isFinite(parsed) ? parsed : null
      }
    }
    return null
  })()
  const periodMonths = resolvedTrimestre && resolvedTrimestre > 0 ? resolvedTrimestre * 3 : null
  const periodHours = periodMonths ? periodMonths * 220 : null
  const periodDays = periodMonths ? periodMonths * 30 : null
  const periodWeeks = periodMonths ? periodMonths * 4.5 : null

  const receitaOperacional = contraprestacoes + outrasReceitas
  const receitaTotal = receitaOperacional - impostos
  const indiceAdministrativo = safePercent(despesasAdministrativas, receitaTotal)
  const indiceAssistencial = safePercent(despesasAssistenciais, receitaOperacional)
  const indiceComercial = safePercent(despesasComerciais, receitaOperacional)
  const indiceResultado = safePercent(despesasAdministrativas - numberOrZero(row.vr_desp_comerciais_promocoes), receitaOperacional)

  const pesoAdministrativo = applyWeightRules(indiceAdministrativo, ADMIN_WEIGHT_RULES)
  const pesoAssistencial = applyWeightRules(indiceAssistencial, ASSIST_WEIGHT_RULES)
  const pesoComercial = applyWeightRules(indiceComercial, COMERCIAL_WEIGHT_RULES)
  const pesoResultado = applyWeightRules(indiceResultado, RESULT_WEIGHT_RULES)

  const hasAllWeights =
    pesoAdministrativo !== null &&
    pesoAssistencial !== null &&
    pesoComercial !== null &&
    pesoResultado !== null

  const icuScore = hasAllWeights
    ? pesoAssistencial * 0.55 + pesoAdministrativo * 0.35 + pesoComercial * 0.05 + pesoResultado * 0.05
    : null
  const rankingOperacional = hasAllWeights
    ? pesoAssistencial + pesoAdministrativo + pesoComercial + pesoResultado
    : null

  const icuOperacional =
    receitaTotal - despesasAdministrativas - despesasAssistenciais - despesasComerciais

  const beneficiariosCrescimento =
    beneficiarios === null || prevBeneficiarios === null
      ? null
      : safePercent(beneficiarios - prevBeneficiarios, prevBeneficiarios)
  const despesaAdmHora = periodHours ? safeRatio(despesasAdministrativas, periodHours) : null
  const despesaAdmDia = periodDays ? safeRatio(despesasAdministrativas, periodDays) : null
  const despesaAdmSemana = periodWeeks ? safeRatio(despesasAdministrativas, periodWeeks) : null
  const icpCustoPrestador =
    prestadores === null ? null : safeRatio(despesasAssistenciais, prestadores)
  const irpReceitaPrestador =
    prestadores === null ? null : safeRatio(receitaOperacional, prestadores)
  const repassePrestador =
    icpCustoPrestador === null || irpReceitaPrestador === null ? null : icpCustoPrestador - irpReceitaPrestador
  const liquidezImediata = passivoCirculante === null ? null : safeRatio(liquidezImediataNumerator, passivoCirculante)
  const emprestimosParcelamentos =
    ativosGarantidores === null
      ? null
      : safeRatio(
          Math.abs(numberOrZero(row.vr_conta_271)) + Math.abs(numberOrZero(row.vr_conta_237)),
          Math.abs(ativosGarantidores),
        )
  const provisoesTribCivTrab = provisoesTribCivTrabAvailable
    ? numberOrZero(row.vr_conta_216) + numberOrZero(row.vr_conta_236)
    : null

  return {
    receita_total_uniodonto: receitaTotal,
    beneficiarios_crescimento_pct: beneficiariosCrescimento,
    indice_despesas_administrativas_pct: indiceAdministrativo,
    indice_despesas_assistenciais_pct: indiceAssistencial,
    indice_despesas_comerciais_pct: indiceComercial,
    indice_resultado_pct: indiceResultado,
    despesa_adm_por_hora: despesaAdmHora,
    despesa_adm_por_dia: despesaAdmDia,
    despesa_adm_por_semana: despesaAdmSemana,
    icp_custo_prestador: icpCustoPrestador,
    irp_receita_prestador: irpReceitaPrestador,
    indice_repasse_prestador: repassePrestador,
    liquidez_imediata: liquidezImediata,
    emprestimos_parcelamentos: emprestimosParcelamentos,
    provisoes_tributarias_civeis_trabalhistas: provisoesTribCivTrab,
    peso_despesas_administrativas: pesoAdministrativo,
    peso_despesas_assistenciais: pesoAssistencial,
    peso_despesas_comerciais: pesoComercial,
    peso_resultado: pesoResultado,
    ranking_operacional: rankingOperacional,
    icu_score: icuScore,
    icu_operacional: icuOperacional,
  }
}
