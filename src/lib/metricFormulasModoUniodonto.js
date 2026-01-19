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

const safeDaysSql = (numerator, denominator, daysExpr) => `
CASE
  WHEN (${daysExpr}) IS NULL OR (${daysExpr}) = 0 THEN NULL
  WHEN (${denominator}) IS NULL OR (${denominator}) = 0 THEN NULL
  ELSE ((${numerator}) * (${daysExpr})) / (${denominator})
END
`

const contraprestacoesSql = 'COALESCE(vr_contraprestacoes, 0)'
const outrasReceitasOperacionaisSql = 'COALESCE(vr_conta_332129111, 0)'
const tributosDiretosSql = 'COALESCE(vr_conta_32, 0)'
const receitaOperacionalSql = `(${contraprestacoesSql} + ${outrasReceitasOperacionaisSql}) - ${tributosDiretosSql}`
const impostosSql = 'COALESCE(vr_conta_61, 0)'
const receitaTotalSql = `(${receitaOperacionalSql}) - ${impostosSql}`
const despesasAdministrativasSql =
  'COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)'
const despesasAdministrativasConta46Sql = 'COALESCE(vr_desp_administrativas, 0)'
const despesasAssistenciaisSql =
  'COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)'
const despesasComerciaisSql = 'COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)'
const despesasModoUniodontoSql = `(${despesasAdministrativasSql}) + (${despesasAssistenciaisSql}) + (${despesasComerciaisSql})`
const resultadoModoUniodontoSql = `(${receitaTotalSql}) - (${despesasModoUniodontoSql})`
const resultadoIndiceSql = resultadoModoUniodontoSql
const despesasAdministrativasIndiceSql = `
CASE
  WHEN CAST(reg_ans AS STRING) = '314315'
    THEN (${despesasAdministrativasSql}) - COALESCE(vr_conta_332189111, 0)
  ELSE (${despesasAdministrativasSql})
END
`.trim()
const periodMonthsSql = 'COALESCE(trimestre, 0) * 3'
const periodDaysSql = 'CAST(trimestre AS FLOAT64) * 90'
const WORKING_DAYS_PER_MONTH = 22
const WORKING_HOURS_PER_DAY = 8
const WORKING_DAYS_PER_WEEK = 5
const periodWorkingDaysSql = `(${periodMonthsSql}) * ${WORKING_DAYS_PER_MONTH}`
const periodWorkingHoursSql = `(${periodWorkingDaysSql}) * ${WORKING_HOURS_PER_DAY}`
const periodWorkingWeeksSql = `(${periodWorkingDaysSql}) / ${WORKING_DAYS_PER_WEEK}`
const periodYearsSql = `(${periodMonthsSql}) / 12`
const prestadoresSql = 'COALESCE(qt_prestadores, 0)'
const beneficiariosSql = 'COALESCE(qt_beneficiarios, 0)'
const prevBeneficiariosSql = 'COALESCE(prev_qt_beneficiarios, 0)'
const beneficiariosCrescimentoSql = safePercentSql(
  `${beneficiariosSql} - ${prevBeneficiariosSql}`,
  prevBeneficiariosSql,
)
const despesasAdministrativasHoraSql = safeRatioSql(despesasAdministrativasSql, periodWorkingHoursSql)
const despesasAdministrativasDiaSql = safeRatioSql(despesasAdministrativasSql, periodWorkingDaysSql)
const despesasAdministrativasSemanaSql = safeRatioSql(despesasAdministrativasSql, periodWorkingWeeksSql)
const despesasAdministrativasMesSql = safeRatioSql(despesasAdministrativasSql, periodMonthsSql)
const despesasAdministrativasAnoSql = safeRatioSql(despesasAdministrativasSql, periodYearsSql)
const sinistralidadeHoraSql = safeRatioSql(despesasAssistenciaisSql, periodWorkingHoursSql)
const sinistralidadeDiaSql = safeRatioSql(despesasAssistenciaisSql, periodWorkingDaysSql)
const sinistralidadeSemanaSql = safeRatioSql(despesasAssistenciaisSql, periodWorkingWeeksSql)
const sinistralidadeMesSql = safeRatioSql(despesasAssistenciaisSql, periodMonthsSql)
const sinistralidadeAnoSql = safeRatioSql(despesasAssistenciaisSql, periodYearsSql)
const receitaAssistencialHoraSql = safeRatioSql(receitaOperacionalSql, periodWorkingHoursSql)
const receitaAssistencialDiaSql = safeRatioSql(receitaOperacionalSql, periodWorkingDaysSql)
const receitaAssistencialSemanaSql = safeRatioSql(receitaOperacionalSql, periodWorkingWeeksSql)
const receitaAssistencialMesSql = safeRatioSql(receitaOperacionalSql, periodMonthsSql)
const receitaAssistencialAnoSql = safeRatioSql(receitaOperacionalSql, periodYearsSql)
const repassePrestadorHoraSql = safeRatioSql(
  despesasAssistenciaisSql,
  `(${prestadoresSql}) * (${periodWorkingHoursSql})`,
)
const repassePrestadorDiaSql = safeRatioSql(
  despesasAssistenciaisSql,
  `(${prestadoresSql}) * (${periodWorkingDaysSql})`,
)
const repassePrestadorSemanaSql = safeRatioSql(
  despesasAssistenciaisSql,
  `(${prestadoresSql}) * (${periodWorkingWeeksSql})`,
)
const repassePrestadorMesSql = safeRatioSql(
  despesasAssistenciaisSql,
  `(${prestadoresSql}) * (${periodMonthsSql})`,
)
const repassePrestadorAnoSql = safeRatioSql(
  despesasAssistenciaisSql,
  `(${prestadoresSql}) * (${periodYearsSql})`,
)
const receitaPrestadorHoraSql = safeRatioSql(
  receitaOperacionalSql,
  `(${prestadoresSql}) * (${periodWorkingHoursSql})`,
)
const receitaPrestadorDiaSql = safeRatioSql(
  receitaOperacionalSql,
  `(${prestadoresSql}) * (${periodWorkingDaysSql})`,
)
const receitaPrestadorSemanaSql = safeRatioSql(
  receitaOperacionalSql,
  `(${prestadoresSql}) * (${periodWorkingWeeksSql})`,
)
const receitaPrestadorMesSql = safeRatioSql(receitaOperacionalSql, `(${prestadoresSql}) * (${periodMonthsSql})`)
const receitaPrestadorAnoSql = safeRatioSql(receitaOperacionalSql, `(${prestadoresSql}) * (${periodYearsSql})`)
const custoAdmPrestadorBaseSql = safeRatioSql(despesasAdministrativasConta46Sql, prestadoresSql)
const custoAdmPrestadorHoraSql = custoAdmPrestadorBaseSql
const custoAdmPrestadorDiaSql = custoAdmPrestadorBaseSql
const custoAdmPrestadorSemanaSql = custoAdmPrestadorBaseSql
const custoAdmPrestadorMesSql = custoAdmPrestadorBaseSql
const custoAdmPrestadorAnoSql = custoAdmPrestadorBaseSql
const liquidezCorrenteSql = safeRatioSql(
  'COALESCE(vr_ativo_circulante, 0)',
  'COALESCE(vr_passivo_circulante, 0)',
)
const pmcrSql = safeDaysSql(
  'COALESCE(vr_creditos_operacoes_saude, 0)',
  'COALESCE(vr_contraprestacoes_pre, 0)',
  periodDaysSql,
)
const pmpeSql = safeDaysSql(
  'COALESCE(vr_eventos_a_liquidar, 0)',
  'COALESCE(vr_eventos_liquidos, 0)',
  periodDaysSql,
)
const liquidezImediataSql = safeRatioSql(
  'COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)',
  'COALESCE(vr_passivo_circulante, 0)',
)
const emprestimosParcelamentosSql = 'ABS(COALESCE(vr_conta_237, 0)) + ABS(COALESCE(vr_conta_217, 0))'
const provisoesTributariasCiveisTrabalhistasSql =
  'COALESCE(vr_conta_216, 0) + COALESCE(vr_conta_236, 0)'

const indiceDespesasAdministrativasSql = safePercentSql(despesasAdministrativasIndiceSql, receitaOperacionalSql)
const indiceDespesasAssistenciaisSql = safePercentSql(despesasAssistenciaisSql, receitaOperacionalSql)
const indiceDespesasComerciaisSql = safePercentSql(despesasComerciaisSql, receitaOperacionalSql)
const indiceResultadoSql = safePercentSql(resultadoIndiceSql, receitaTotalSql)

export const ADMIN_WEIGHT_RULES = [
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

export const ASSIST_WEIGHT_RULES = [
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

export const COMERCIAL_WEIGHT_RULES = [
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

export const RESULT_WEIGHT_RULES = [
  { max: -7.5, weight: -15 },
  { max: -5.0, weight: -12 },
  { max: -2.5, weight: -9 },
  { max: -1.0, weight: -6 },
  { max: -0.01, weight: -3 },
  { max: 0.99, weight: 0 },
  { max: 2.49, weight: 3 },
  { max: 4.99, weight: 6 },
  { max: 7.49, weight: 9 },
  { max: 9.99, weight: 12 },
  { max: null, weight: 15 },
]

export const LIQUIDEZ_CORRENTE_WEIGHT_RULES = [
  { max: 0.999999999, weight: -10 },
  { max: 1.0, weight: 0 },
  { max: 1.5, weight: 3 },
  { max: 2.0, weight: 6 },
  { max: 2.5, weight: 9 },
  { max: null, weight: 10 },
]

export const LIQUIDEZ_IMEDIATA_WEIGHT_RULES = [
  { max: 0.2, weight: 0 },
  { max: 0.4, weight: 4 },
  { max: 0.6, weight: 5 },
  { max: 0.8, weight: 6 },
  { max: 1.0, weight: 7 },
  { max: 1.5, weight: 8 },
  { max: 2.49, weight: 9 },
  { max: null, weight: 10 },
]

export const PMPG_WEIGHT_RULES = [
  { max: 39, weight: 10 },
  { max: 49, weight: 8 },
  { max: 59, weight: 6 },
  { max: 60, weight: 4 },
  { max: null, weight: 0 },
]

export const PMRC_WEIGHT_RULES = [
  { max: 39, weight: 10 },
  { max: 49, weight: 8 },
  { max: 59, weight: 6 },
  { max: 60, weight: 4 },
  { max: null, weight: 0 },
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
const pesoLiquidezCorrenteSql = buildWeightSql(liquidezCorrenteSql, LIQUIDEZ_CORRENTE_WEIGHT_RULES)
const pesoLiquidezImediataSql = buildWeightSql(liquidezImediataSql, LIQUIDEZ_IMEDIATA_WEIGHT_RULES)
const pesoPmpgSql = buildWeightSql(pmpeSql, PMPG_WEIGHT_RULES)
const pesoPmrcSql = buildWeightSql(pmcrSql, PMRC_WEIGHT_RULES)
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
    + COALESCE((${pesoLiquidezCorrenteSql}), 0)
    + COALESCE((${pesoLiquidezImediataSql}), 0)
    + COALESCE((${pesoPmrcSql}), 0)
    + COALESCE((${pesoPmpgSql}), 0)
END
`.trim()
const icuOperacionalSql = safePercentSql(resultadoModoUniodontoSql, receitaTotalSql)
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
  despesa_adm_por_mes: despesasAdministrativasMesSql,
  despesa_adm_por_ano: despesasAdministrativasAnoSql,
  sinistralidade_hora: sinistralidadeHoraSql,
  sinistralidade_dia: sinistralidadeDiaSql,
  sinistralidade_semana: sinistralidadeSemanaSql,
  sinistralidade_mes: sinistralidadeMesSql,
  sinistralidade_ano: sinistralidadeAnoSql,
  receita_assistencial_hora: receitaAssistencialHoraSql,
  receita_assistencial_dia: receitaAssistencialDiaSql,
  receita_assistencial_semana: receitaAssistencialSemanaSql,
  receita_assistencial_mes: receitaAssistencialMesSql,
  receita_assistencial_ano: receitaAssistencialAnoSql,
  repasse_prestador_hora: repassePrestadorHoraSql,
  repasse_prestador_dia: repassePrestadorDiaSql,
  repasse_prestador_semana: repassePrestadorSemanaSql,
  repasse_prestador_mes: repassePrestadorMesSql,
  repasse_prestador_ano: repassePrestadorAnoSql,
  receita_prestador_hora: receitaPrestadorHoraSql,
  receita_prestador_dia: receitaPrestadorDiaSql,
  receita_prestador_semana: receitaPrestadorSemanaSql,
  receita_prestador_mes: receitaPrestadorMesSql,
  receita_prestador_ano: receitaPrestadorAnoSql,
  custo_adm_prestador_hora: custoAdmPrestadorHoraSql,
  custo_adm_prestador_dia: custoAdmPrestadorDiaSql,
  custo_adm_prestador_semana: custoAdmPrestadorSemanaSql,
  custo_adm_prestador_mes: custoAdmPrestadorMesSql,
  custo_adm_prestador_ano: custoAdmPrestadorAnoSql,
  liquidez_corrente: liquidezCorrenteSql,
  pmcr: pmcrSql,
  pmpe: pmpeSql,
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
  peso_liquidez_corrente: pesoLiquidezCorrenteSql,
  peso_liquidez_imediata: pesoLiquidezImediataSql,
  peso_pmpg: pesoPmpgSql,
  peso_pmrc: pesoPmrcSql,
  ranking_operacional: rankingOperacionalSql,
  icu_operacional: icuOperacionalSql,
  icu_score: icuScoreSql,
}

export function getUniodontoMetricSql(metricId) {
  return UNIODONTO_METRIC_SQL[metricId] ?? null
}
