import {
  ADMIN_WEIGHT_RULES,
  ASSIST_WEIGHT_RULES,
  COMERCIAL_WEIGHT_RULES,
  LIQUIDEZ_CORRENTE_WEIGHT_RULES,
  LIQUIDEZ_IMEDIATA_WEIGHT_RULES,
  PMPG_WEIGHT_RULES,
  PMRC_WEIGHT_RULES,
  RESULT_WEIGHT_RULES,
} from './metricFormulasModoUniodonto'

export { getUniodontoMetricSql, UNIODONTO_METRIC_SQL } from './metricFormulasModoUniodonto'

const WORKING_DAYS_PER_MONTH = 22
const WORKING_HOURS_PER_DAY = 8
const WORKING_DAYS_PER_WEEK = 5

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
    id: 'icu_operacional',
    label: 'Resultado real (%)',
    format: 'percent',
    trend: 'higher',
    description: 'REmU = (31 + 332129111 - 32 - 61 - (46 - 464 + 41 + 442129119 + 43 + 464)) / (31 + 332129111 - 32 - 61).',
  },
  {
    id: 'indice_despesas_assistenciais_pct',
    label: 'Indice despesas assistenciais (%)',
    format: 'percent',
    trend: 'higher',
    description: '(41 + 442129119) / (31 + 332129111 - 32).',
  },
  {
    id: 'indice_despesas_administrativas_pct',
    label: 'Indice despesas administrativas (%)',
    format: 'percent',
    trend: 'lower',
    description:
      '(46 - 464) / receita operacional (31 + 332129111 - 32). Para reg_ans 314315: (46 - 464 - 332189111) / receita operacional.',
  },
  {
    id: 'indice_despesas_comerciais_pct',
    label: 'Indice despesas comerciais (%)',
    format: 'percent',
    trend: 'higher',
    description: '(43 + 464) / (31 + 332129111 - 32).',
  },
  {
    id: 'despesa_adm_por_hora',
    label: 'Despesa administrativa por hora',
    format: 'currency',
    trend: 'lower',
    description: '46 / horas uteis no periodo.',
  },
  {
    id: 'despesa_adm_por_mes',
    label: 'Despesa administrativa por mes',
    format: 'currency',
    trend: 'lower',
    description: '46 / meses no periodo.',
  },
  {
    id: 'despesa_adm_por_dia',
    label: 'Despesa administrativa por dia',
    format: 'currency',
    trend: 'lower',
    description: '46 / dias uteis no periodo.',
  },
  {
    id: 'despesa_adm_por_semana',
    label: 'Despesa administrativa por semana',
    format: 'currency',
    trend: 'lower',
    description: '46 / semanas uteis no periodo.',
  },
  {
    id: 'despesa_adm_por_ano',
    label: 'Despesa administrativa por ano',
    format: 'currency',
    trend: 'lower',
    description: '46 / anos no periodo.',
  },
  {
    id: 'sinistralidade_hora',
    label: 'Sinistralidade (hora)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / horas uteis no periodo.',
  },
  {
    id: 'sinistralidade_dia',
    label: 'Sinistralidade (dia)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / dias uteis no periodo.',
  },
  {
    id: 'sinistralidade_semana',
    label: 'Sinistralidade (semana)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / semanas uteis no periodo.',
  },
  {
    id: 'sinistralidade_mes',
    label: 'Sinistralidade (mês)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / meses no periodo.',
  },
  {
    id: 'sinistralidade_ano',
    label: 'Sinistralidade (ano)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / anos no periodo.',
  },
  {
    id: 'receita_assistencial_hora',
    label: 'Receita assistencial (hora)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / horas uteis no periodo.',
  },
  {
    id: 'receita_assistencial_dia',
    label: 'Receita assistencial (dia)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / dias uteis no periodo.',
  },
  {
    id: 'receita_assistencial_semana',
    label: 'Receita assistencial (semana)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / semanas uteis no periodo.',
  },
  {
    id: 'receita_assistencial_mes',
    label: 'Receita assistencial (mês)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / meses no periodo.',
  },
  {
    id: 'receita_assistencial_ano',
    label: 'Receita assistencial (ano)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / anos no periodo.',
  },
  {
    id: 'repasse_prestador_hora',
    label: 'Repasse prestador (hora)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / (prestador * horas uteis no periodo).',
  },
  {
    id: 'repasse_prestador_dia',
    label: 'Repasse prestador (dia)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / (prestador * dias uteis no periodo).',
  },
  {
    id: 'repasse_prestador_semana',
    label: 'Repasse prestador (semana)',
    format: 'currency',
    trend: 'higher',
    description: '(41 + 442129119) / (prestador * semanas uteis no periodo).',
  },
  {
    id: 'repasse_prestador_mes',
    label: 'Repasse prestador (mês)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / (prestador * meses no periodo).',
  },
  {
    id: 'repasse_prestador_ano',
    label: 'Repasse prestador (ano)',
    format: 'currency',
    trend: 'lower',
    description: '(41 + 442129119) / (prestador * anos no periodo).',
  },
  {
    id: 'receita_prestador_hora',
    label: 'Receita por prestador (hora)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / (prestador * horas uteis no periodo).',
  },
  {
    id: 'receita_prestador_dia',
    label: 'Receita por prestador (dia)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / (prestador * dias uteis no periodo).',
  },
  {
    id: 'receita_prestador_semana',
    label: 'Receita por prestador (semana)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / (prestador * semanas uteis no periodo).',
  },
  {
    id: 'receita_prestador_mes',
    label: 'Receita por prestador (mês)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / (prestador * meses no periodo).',
  },
  {
    id: 'receita_prestador_ano',
    label: 'Receita por prestador (ano)',
    format: 'currency',
    trend: 'higher',
    description: '(31 + 332129111 - 32) / (prestador * anos no periodo).',
  },
  {
    id: 'custo_adm_prestador_hora',
    label: 'Custo administrativo por prestador (hora)',
    format: 'currency',
    trend: 'higher',
    description: '46 / prestadores.',
  },
  {
    id: 'custo_adm_prestador_dia',
    label: 'Custo administrativo por prestador (dia)',
    format: 'currency',
    trend: 'higher',
    description: '46 / prestadores.',
  },
  {
    id: 'custo_adm_prestador_semana',
    label: 'Custo administrativo por prestador (semana)',
    format: 'currency',
    trend: 'higher',
    description: '46 / prestadores.',
  },
  {
    id: 'custo_adm_prestador_mes',
    label: 'Custo administrativo por prestador (mês)',
    format: 'currency',
    trend: 'higher',
    description: '46 / prestadores.',
  },
  {
    id: 'custo_adm_prestador_ano',
    label: 'Custo administrativo por prestador (ano)',
    format: 'currency',
    trend: 'higher',
    description: '46 / prestadores.',
  },
  {
    id: 'liquidez_corrente',
    label: 'Liquidez Corrente (LC)',
    format: 'decimal',
    trend: 'higher',
    description: '12 / 21.',
  },
  {
    id: 'pmcr',
    label: 'Prazo Médio de Recebimento de Contraprestações (PMRC)',
    format: 'days',
    trend: 'lower',
    description: '(1231 * dias do período) / 311121.',
  },
  {
    id: 'pmpe',
    label: 'Prazo Médio de Pagamento de Eventos (PMPG)',
    format: 'days',
    trend: 'lower',
    description: '(2111 * dias do período) / 41.',
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
    format: 'currency',
    trend: 'lower',
    description: '237 + 217.',
  },
  {
    id: 'provisoes_tributarias_civeis_trabalhistas',
    label: 'Provisões tributárias, cíveis e trabalhistas',
    format: 'currency',
    trend: 'lower',
    description: '216 + 236.',
  },
  {
    id: 'beneficiarios_crescimento_pct',
    label: 'Crescimento de beneficiários (%)',
    format: 'percent',
    trend: 'higher',
    description: 'Variação percentual dos beneficiários em relação ao período anterior.',
  },
]

export const UNIODONTO_INDICATOR_GROUPS = [
  {
    id: 'score',
    label: 'Score e ranking',
    description: 'Pontuação consolidada dos pesos operacionais.',
    items: ['ranking_operacional', 'icu_score'],
  },
  {
    id: 'despesas',
    label: 'Índice de Eficiência Operacional',
    description:
      'Participação das despesas assistenciais, administrativas e comerciais + resultado. Referência mínima: DA 35%, DM 55%, DC 5%, RE 5%.',
    items: [
      'indice_despesas_assistenciais_pct',
      'indice_despesas_administrativas_pct',
      'indice_despesas_comerciais_pct',
      'icu_operacional',
    ],
  },
  {
    id: 'liquidez',
    label: 'Liquidez e risco',
    description: 'Liquidez, prazos médios, empréstimos e provisões.',
    items: [
      'liquidez_imediata',
      'liquidez_corrente',
      'pmcr',
      'pmpe',
      'emprestimos_parcelamentos',
      'provisoes_tributarias_civeis_trabalhistas',
    ],
  },
  {
    id: 'receitas_assistenciais',
    label: 'Receitas assistenciais',
    description: 'Receita assistencial por ano, mes, semana, dia e hora.',
    items: [
      'receita_assistencial_ano',
      'receita_assistencial_mes',
      'receita_assistencial_semana',
      'receita_assistencial_dia',
      'receita_assistencial_hora',
    ],
  },
  {
    id: 'eficiencia',
    label: 'Despesas administrativas',
    description: 'Despesa administrativa diluída por ano, mes, semana, dia e hora.',
    items: [
      'despesa_adm_por_ano',
      'despesa_adm_por_mes',
      'despesa_adm_por_semana',
      'despesa_adm_por_dia',
      'despesa_adm_por_hora',
    ],
  },
  {
    id: 'assistenciais',
    label: 'Despesas assistenciais',
    description: 'Sinistralidade por ano, mes, semana, dia e hora.',
    items: [
      'sinistralidade_ano',
      'sinistralidade_mes',
      'sinistralidade_semana',
      'sinistralidade_dia',
      'sinistralidade_hora',
    ],
  },
  {
    id: 'prestadores',
    label: 'Prestadores e repasse',
    description: 'Repasse, receita e custo ADM por prestador (ano/mes/semana/dia/hora uteis).',
    items: [
      'repasse_prestador_ano',
      'repasse_prestador_mes',
      'repasse_prestador_semana',
      'repasse_prestador_dia',
      'repasse_prestador_hora',
      'receita_prestador_ano',
      'receita_prestador_mes',
      'receita_prestador_semana',
      'receita_prestador_dia',
      'receita_prestador_hora',
      'custo_adm_prestador_ano',
      'custo_adm_prestador_mes',
      'custo_adm_prestador_semana',
      'custo_adm_prestador_dia',
      'custo_adm_prestador_hora',
    ],
  },
  {
    id: 'crescimento',
    label: 'Crescimento',
    description: 'Variação de beneficiários no período.',
    items: ['beneficiarios_crescimento_pct'],
  },
]

export const UNIODONTO_NOTE_META = {
  ranking_operacional: {
    key: 'ranking_operacional',
    min: -25,
    max: 85,
  },
  icu_score: {
    key: 'icu_score',
    min: -0.75,
    max: 10.25,
  },
  indice_despesas_assistenciais_pct: {
    key: 'peso_despesas_assistenciais',
    min: 0,
    max: 10,
  },
  indice_despesas_administrativas_pct: {
    key: 'peso_despesas_administrativas',
    min: 0,
    max: 10,
  },
  indice_despesas_comerciais_pct: {
    key: 'peso_despesas_comerciais',
    min: 0,
    max: 10,
  },
  icu_operacional: {
    key: 'peso_resultado',
    min: -15,
    max: 15,
  },
  liquidez_corrente: {
    key: 'peso_liquidez_corrente',
    min: -10,
    max: 10,
  },
  liquidez_imediata: {
    key: 'peso_liquidez_imediata',
    min: 0,
    max: 10,
  },
  pmcr: {
    key: 'peso_pmrc',
    min: 0,
    max: 10,
  },
  pmpe: {
    key: 'peso_pmpg',
    min: 0,
    max: 10,
  },
}

export const UNIODONTO_RANKING_METRICS = UNIODONTO_INDICATORS

export const DEFAULT_UNIODONTO_RANKING_METRIC = 'ranking_operacional'

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
  const contraprestacoesPre = numberOrZero(row.vr_contraprestacoes_pre)
  const outrasReceitas = numberOrZero(row.vr_conta_332129111)
  const tributosDiretos = numberOrZero(row.vr_conta_32)
  const impostos = numberOrZero(row.vr_conta_61)
  const despesasAdministrativasConta46 = numberOrZero(row.vr_desp_administrativas)
  const despesasAdministrativas =
    despesasAdministrativasConta46 - numberOrZero(row.vr_conta_464)
  const despesasAssistenciais =
    numberOrZero(row.vr_eventos_liquidos) + numberOrZero(row.vr_conta_442129119)
  const despesasComerciais = numberOrZero(row.vr_desp_comerciais) + numberOrZero(row.vr_conta_464)
  const creditosOperacoesSaude = numberOrZero(row.vr_creditos_operacoes_saude)
  const eventosALiquidar = numberOrZero(row.vr_eventos_a_liquidar)
  const eventosLiquidos = numberOrZero(row.vr_eventos_liquidos)
  const beneficiarios = numberOrNull(row.qt_beneficiarios)
  const prevBeneficiarios = numberOrNull(
    row.prev_qt_beneficiarios ?? row?.previousPeriod?.qt_beneficiarios,
  )
  const prestadores = numberOrNull(row.qt_prestadores)
  const hasConta216 = row.vr_conta_216 !== null && row.vr_conta_216 !== undefined
  const hasConta236 = row.vr_conta_236 !== null && row.vr_conta_236 !== undefined
  const provisoesTribCivTrabAvailable = hasConta216 || hasConta236
  const ativoCirculante = numberOrNull(row.vr_ativo_circulante)
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
  const periodDays = resolvedTrimestre && resolvedTrimestre > 0 ? resolvedTrimestre * 90 : null
  const periodWorkingDays = periodMonths ? periodMonths * WORKING_DAYS_PER_MONTH : null
  const periodWorkingHours = periodWorkingDays ? periodWorkingDays * WORKING_HOURS_PER_DAY : null
  const periodWorkingWeeks = periodWorkingDays ? periodWorkingDays / WORKING_DAYS_PER_WEEK : null
  const periodYears = periodMonths ? periodMonths / 12 : null

  const receitaOperacional = contraprestacoes + outrasReceitas - tributosDiretos
  const receitaTotal = receitaOperacional - impostos
  const isRegAns314315 = String(row.reg_ans ?? '') === '314315'
  const despesasAdministrativasIndice = despesasAdministrativas - (isRegAns314315 ? numberOrZero(row.vr_conta_332189111) : 0)
  const indiceAdministrativo = safePercent(despesasAdministrativasIndice, receitaOperacional)
  const indiceAssistencial = safePercent(despesasAssistenciais, receitaOperacional)
  const indiceComercial = safePercent(despesasComerciais, receitaOperacional)
  const despesasTotaisUniodonto = despesasAdministrativas + despesasAssistenciais + despesasComerciais
  const resultadoModoUniodonto = safePercent(receitaTotal - despesasTotaisUniodonto, receitaTotal)
  const indiceResultado = resultadoModoUniodonto
  const liquidezCorrente =
    ativoCirculante === null || passivoCirculante === null ? null : safeRatio(ativoCirculante, passivoCirculante)
  const liquidezImediata = passivoCirculante === null ? null : safeRatio(liquidezImediataNumerator, passivoCirculante)
  const pmcr = periodDays ? safeRatio(creditosOperacoesSaude * periodDays, contraprestacoesPre) : null
  const pmpe = periodDays ? safeRatio(eventosALiquidar * periodDays, eventosLiquidos) : null

  const pesoAdministrativo = applyWeightRules(indiceAdministrativo, ADMIN_WEIGHT_RULES)
  const pesoAssistencial = applyWeightRules(indiceAssistencial, ASSIST_WEIGHT_RULES)
  const pesoComercial = applyWeightRules(indiceComercial, COMERCIAL_WEIGHT_RULES)
  const pesoResultado = applyWeightRules(indiceResultado, RESULT_WEIGHT_RULES)
  const pesoLiquidezCorrente = applyWeightRules(liquidezCorrente, LIQUIDEZ_CORRENTE_WEIGHT_RULES)
  const pesoLiquidezImediata = applyWeightRules(liquidezImediata, LIQUIDEZ_IMEDIATA_WEIGHT_RULES)
  const pesoPmrc = applyWeightRules(pmcr, PMRC_WEIGHT_RULES)
  const pesoPmpg = applyWeightRules(pmpe, PMPG_WEIGHT_RULES)

  const hasScoreWeights =
    pesoAdministrativo !== null &&
    pesoAssistencial !== null &&
    pesoComercial !== null &&
    pesoResultado !== null

  const icuScore = hasScoreWeights
    ? pesoAssistencial * 0.55 + pesoAdministrativo * 0.35 + pesoComercial * 0.05 + pesoResultado * 0.05
    : null
  const rankingOperacional = hasScoreWeights
    ? pesoAssistencial +
      pesoAdministrativo +
      pesoComercial +
      pesoResultado +
      (pesoLiquidezCorrente ?? 0) +
      (pesoLiquidezImediata ?? 0) +
      (pesoPmrc ?? 0) +
      (pesoPmpg ?? 0)
    : null

  const icuOperacional = resultadoModoUniodonto

  const beneficiariosCrescimento =
    beneficiarios === null || prevBeneficiarios === null
      ? null
      : safePercent(beneficiarios - prevBeneficiarios, prevBeneficiarios)
  const despesaAdmMes = periodMonths ? safeRatio(despesasAdministrativas, periodMonths) : null
  const despesaAdmAno = periodYears ? safeRatio(despesasAdministrativas, periodYears) : null
  const sinistralidadeHora =
    periodWorkingHours ? safeRatio(despesasAssistenciais, periodWorkingHours) : null
  const sinistralidadeDia =
    periodWorkingDays ? safeRatio(despesasAssistenciais, periodWorkingDays) : null
  const sinistralidadeSemana =
    periodWorkingWeeks ? safeRatio(despesasAssistenciais, periodWorkingWeeks) : null
  const sinistralidadeMes = periodMonths ? safeRatio(despesasAssistenciais, periodMonths) : null
  const sinistralidadeAno = periodYears ? safeRatio(despesasAssistenciais, periodYears) : null
  const receitaAssistencialHora =
    periodWorkingHours ? safeRatio(receitaOperacional, periodWorkingHours) : null
  const receitaAssistencialDia =
    periodWorkingDays ? safeRatio(receitaOperacional, periodWorkingDays) : null
  const receitaAssistencialSemana =
    periodWorkingWeeks ? safeRatio(receitaOperacional, periodWorkingWeeks) : null
  const receitaAssistencialMes = periodMonths ? safeRatio(receitaOperacional, periodMonths) : null
  const receitaAssistencialAno = periodYears ? safeRatio(receitaOperacional, periodYears) : null
  const despesaAdmHora = periodWorkingHours ? safeRatio(despesasAdministrativas, periodWorkingHours) : null
  const despesaAdmDia = periodWorkingDays ? safeRatio(despesasAdministrativas, periodWorkingDays) : null
  const despesaAdmSemana = periodWorkingWeeks ? safeRatio(despesasAdministrativas, periodWorkingWeeks) : null
  const repassePrestadorHora =
    prestadores === null || !periodWorkingHours
      ? null
      : safeRatio(despesasAssistenciais, prestadores * periodWorkingHours)
  const repassePrestadorDia =
    prestadores === null || !periodWorkingDays
      ? null
      : safeRatio(despesasAssistenciais, prestadores * periodWorkingDays)
  const repassePrestadorSemana =
    prestadores === null || !periodWorkingWeeks
      ? null
      : safeRatio(despesasAssistenciais, prestadores * periodWorkingWeeks)
  const repassePrestadorMes =
    prestadores === null || !periodMonths ? null : safeRatio(despesasAssistenciais, prestadores * periodMonths)
  const repassePrestadorAno =
    prestadores === null || !periodYears ? null : safeRatio(despesasAssistenciais, prestadores * periodYears)
  const receitaPrestadorHora =
    prestadores === null || !periodWorkingHours
      ? null
      : safeRatio(receitaOperacional, prestadores * periodWorkingHours)
  const receitaPrestadorDia =
    prestadores === null || !periodWorkingDays
      ? null
      : safeRatio(receitaOperacional, prestadores * periodWorkingDays)
  const receitaPrestadorSemana =
    prestadores === null || !periodWorkingWeeks
      ? null
      : safeRatio(receitaOperacional, prestadores * periodWorkingWeeks)
  const receitaPrestadorMes =
    prestadores === null || !periodMonths ? null : safeRatio(receitaOperacional, prestadores * periodMonths)
  const receitaPrestadorAno =
    prestadores === null || !periodYears ? null : safeRatio(receitaOperacional, prestadores * periodYears)
  const custoAdmPrestadorBase =
    prestadores === null ? null : safeRatio(despesasAdministrativasConta46, prestadores)
  const custoAdmPrestadorHora = custoAdmPrestadorBase
  const custoAdmPrestadorDia = custoAdmPrestadorBase
  const custoAdmPrestadorSemana = custoAdmPrestadorBase
  const custoAdmPrestadorMes = custoAdmPrestadorBase
  const custoAdmPrestadorAno = custoAdmPrestadorBase
  const emprestimosParcelamentos =
    Math.abs(numberOrZero(row.vr_conta_217)) + Math.abs(numberOrZero(row.vr_conta_237))
  const provisoesTribCivTrab = provisoesTribCivTrabAvailable
    ? numberOrZero(row.vr_conta_216) + numberOrZero(row.vr_conta_236)
    : null

  return {
    beneficiarios_crescimento_pct: beneficiariosCrescimento,
    indice_despesas_administrativas_pct: indiceAdministrativo,
    indice_despesas_assistenciais_pct: indiceAssistencial,
    indice_despesas_comerciais_pct: indiceComercial,
    indice_resultado_pct: indiceResultado,
    despesa_adm_por_mes: despesaAdmMes,
    despesa_adm_por_hora: despesaAdmHora,
    despesa_adm_por_dia: despesaAdmDia,
    despesa_adm_por_semana: despesaAdmSemana,
    despesa_adm_por_ano: despesaAdmAno,
    sinistralidade_hora: sinistralidadeHora,
    sinistralidade_dia: sinistralidadeDia,
    sinistralidade_semana: sinistralidadeSemana,
    sinistralidade_mes: sinistralidadeMes,
    sinistralidade_ano: sinistralidadeAno,
    receita_assistencial_hora: receitaAssistencialHora,
    receita_assistencial_dia: receitaAssistencialDia,
    receita_assistencial_semana: receitaAssistencialSemana,
    receita_assistencial_mes: receitaAssistencialMes,
    receita_assistencial_ano: receitaAssistencialAno,
    repasse_prestador_hora: repassePrestadorHora,
    repasse_prestador_dia: repassePrestadorDia,
    repasse_prestador_semana: repassePrestadorSemana,
    repasse_prestador_mes: repassePrestadorMes,
    repasse_prestador_ano: repassePrestadorAno,
    receita_prestador_hora: receitaPrestadorHora,
    receita_prestador_dia: receitaPrestadorDia,
    receita_prestador_semana: receitaPrestadorSemana,
    receita_prestador_mes: receitaPrestadorMes,
    receita_prestador_ano: receitaPrestadorAno,
    custo_adm_prestador_hora: custoAdmPrestadorHora,
    custo_adm_prestador_dia: custoAdmPrestadorDia,
    custo_adm_prestador_semana: custoAdmPrestadorSemana,
    custo_adm_prestador_mes: custoAdmPrestadorMes,
    custo_adm_prestador_ano: custoAdmPrestadorAno,
    liquidez_corrente: liquidezCorrente,
    pmcr,
    pmpe,
    liquidez_imediata: liquidezImediata,
    emprestimos_parcelamentos: emprestimosParcelamentos,
    provisoes_tributarias_civeis_trabalhistas: provisoesTribCivTrab,
    peso_despesas_administrativas: pesoAdministrativo,
    peso_despesas_assistenciais: pesoAssistencial,
    peso_despesas_comerciais: pesoComercial,
    peso_resultado: pesoResultado,
    peso_liquidez_corrente: pesoLiquidezCorrente,
    peso_liquidez_imediata: pesoLiquidezImediata,
    peso_pmrc: pesoPmrc,
    peso_pmpg: pesoPmpg,
    ranking_operacional: rankingOperacional,
    icu_score: icuScore,
    icu_operacional: icuOperacional,
  }
}
