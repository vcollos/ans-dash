const safePercent = (numerator, denominator) => `
CASE
  WHEN (${denominator}) IS NULL OR (${denominator}) = 0 THEN NULL
  ELSE ((${numerator}) / (${denominator})) * 100
END
`

const safeRatio = (numerator, denominator) => `
CASE
  WHEN (${denominator}) IS NULL OR (${denominator}) = 0 THEN NULL
  ELSE ((${numerator}) / (${denominator}))
END
`

const safeDays = (numerator, denominator, days) => `
CASE
  WHEN (${denominator}) IS NULL OR (${denominator}) = 0 THEN NULL
  ELSE ((${numerator}) * ${days}) / (${denominator})
END
`

const ansSinistroNumerator = 'COALESCE(vr_eventos_liquidos, 0) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))'
const ansSinistroDenominator = '(COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))'
const ansSinistroDeltaNumerator =
  'COALESCE(delta_vr_eventos_liquidos, 0) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0))'
const ansSinistroDeltaDenominator =
  '(COALESCE(delta_vr_contraprestacoes, 0) - COALESCE(delta_vr_provisoes_tecnicas, 0)) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0))'
const ansDopNumerator = `${ansSinistroNumerator} + COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_desp_administrativas, 0) + COALESCE(vr_outras_desp_oper, 0)`
const ansDopDenominator = `(${ansSinistroDenominator}) + COALESCE(vr_outras_receitas_operacionais, 0)`

export const metricFormulas = [
  {
    id: 'margem_lucro_pct',
    code: 'MLL',
    label: 'Margem de Lucro Líquida (MLL)',
    description: 'resultado_liquido / 311_vr_contraprestacoes',
    format: 'percent',
    sql: safePercent('resultado_liquido', 'vr_contraprestacoes'),
    showInCatalog: true,
    showInCards: true,
    trend: 'higher',
  },
  {
    id: 'retorno_pl_pct',
    code: 'ROE',
    label: 'Retorno sobre PL (ROE)',
    description: 'resultado_liquido / 25_vr_patrimonio_liquido',
    format: 'percent',
    sql: safePercent('resultado_liquido', 'vr_patrimonio_liquido'),
    showInCatalog: true,
    showInCards: true,
    trend: 'higher',
  },
{
  id: 'sinistralidade_pct',
  code: 'DM',
  label: 'Sinistralidade (DM)',
  description: '(41 + ABS(3117)) / (31 - 321 + ABS(3117)) — Fórmula oficial ANS (RN 518)',
  format: 'percent',
  sql: safePercent(ansSinistroNumerator, ansSinistroDenominator),
  showInCatalog: true,
  showInCards: true,
  trend: 'lower',
},
  {
    id: 'sinistralidade_acumulada_pct',
    code: 'DM_ACUM',
    label: 'Sinistralidade acumulada (DM_ACUM)',
    description: 'Cálculo acumulado no ano conforme metodologia ANS (RN 518).',
    format: 'percent',
    sql: safePercent(ansSinistroNumerator, ansSinistroDenominator),
    showInCatalog: true,
    showInCards: false,
    trend: 'lower',
  },
  {
    id: 'sinistralidade_trimestral_pct',
    code: 'DM_TRIM',
    label: 'Sinistralidade do trimestre (DM_TRIM)',
    description: 'Fluxo trimestral obtido pelas variações das contas 41, 311, 32 e 3117.',
    format: 'percent',
    sql: safePercent(ansSinistroDeltaNumerator, ansSinistroDeltaDenominator),
    showInCatalog: true,
    showInCards: false,
    trend: 'lower',
  },
  {
    id: 'despesas_adm_pct',
    code: 'DA',
    label: 'Despesas Administrativas (DA)',
    description: '46_vr_desp_administrativas / (31 - 32 + |3117|) — base ANS.',
    format: 'percent',
    sql: safePercent('COALESCE(vr_desp_administrativas, 0)', ansSinistroDenominator),
    showInCatalog: true,
    showInCards: true,
    trend: 'lower',
  },
  {
    id: 'despesas_comerciais_pct',
    code: 'DC',
    label: 'Despesas Comerciais (DC)',
    description: '43_vr_desp_comerciais / (31 - 32 + |3117|) — base ANS.',
    format: 'percent',
    sql: safePercent('COALESCE(vr_desp_comerciais, 0)', ansSinistroDenominator),
    showInCatalog: true,
    showInCards: true,
    trend: 'lower',
  },
  {
    id: 'despesas_operacionais_pct',
    code: 'DOP',
    label: 'Despesas Operacionais (DOP)',
    description:
      '(41 + |3117| + 43 + 46 + 44) / [(31 - 32 + |3117|) + 33] — fórmula ANS (RN 518)',
    format: 'percent',
    sql: safePercent(ansDopNumerator, ansDopDenominator),
    showInCatalog: true,
    showInCards: true,
    trend: 'lower',
  },
  {
    id: 'indice_resultado_financeiro_pct',
    code: 'IRF',
    label: 'Resultado Financeiro (IRF)',
    description: '(35_vr_receitas_fin - 45_vr_despesas_fin) / 311121_vr_contraprestacoes_pre',
    format: 'percent',
    sql: safePercent('(COALESCE(vr_receitas_fin, 0) - COALESCE(vr_despesas_fin, 0))', 'vr_contraprestacoes_pre'),
    showInCatalog: true,
    showInCards: true,
    trend: 'higher',
  },
  {
    id: 'despesas_tributarias_pct',
    code: 'DT',
    label: 'Despesas Tributárias (%)',
    description: '47_vr_desp_tributos / 311121_vr_contraprestacoes_pre',
    format: 'percent',
    sql: safePercent('vr_desp_tributos', 'vr_contraprestacoes_pre'),
    showInCatalog: false,
    showInCards: false,
  },
  {
    id: 'liquidez_corrente',
    code: 'LC',
    label: 'Liquidez Corrente (LC)',
    description: '12_vr_ativo_circulante / 21_vr_passivo_circulante',
    format: 'decimal',
    sql: safeRatio('vr_ativo_circulante', 'vr_passivo_circulante'),
    showInCatalog: true,
    showInCards: true,
    trend: 'higher',
  },
  {
    id: 'capital_terceiros_sobre_pl',
    code: 'CT/PL',
    label: 'Capital de Terceiros / PL (CT/CP)',
    description: '(21_vr_passivo_circulante + 23_vr_passivo_nao_circulante) / 25_vr_patrimonio_liquido',
    format: 'decimal',
    sql: safeRatio('COALESCE(vr_passivo_circulante, 0) + COALESCE(vr_passivo_nao_circulante, 0)', 'vr_patrimonio_liquido'),
    showInCatalog: true,
    showInCards: true,
    trend: 'lower',
  },
  {
    id: 'pmcr',
    code: 'PPMCR',
    label: 'Prazo Médio de Contraprestações (PMCR)',
    description: '(1231_vr_creditos_operacoes_saude * 90) / 311121_vr_contraprestacoes_pre',
    format: 'days',
    sql: safeDays('COALESCE(vr_creditos_operacoes_saude, 0)', 'COALESCE(vr_contraprestacoes_pre, 0)', 90),
    showInCatalog: true,
    showInCards: true,
    trend: 'lower',
  },
  {
    id: 'pmpe',
    code: 'PPME',
    label: 'Prazo Médio de Pagamento de Eventos (PMPE)',
    description: '(2111_vr_eventos_a_liquidar * 90) / 41_vr_eventos_liquidos',
    format: 'days',
    sql: safeDays('COALESCE(vr_eventos_a_liquidar, 0)', 'COALESCE(vr_eventos_liquidos, 0)', 90),
    showInCatalog: true,
    showInCards: true,
    trend: 'lower',
  },
  {
    id: 'cobertura_provisoes',
    code: 'AG/PT',
    label: 'Cobertura de Provisões Técnicas',
    description: '31_vr_ativos_garantidores / |32_vr_provisoes_tecnicas|',
    format: 'decimal',
    sql: safeRatio('COALESCE(vr_ativos_garantidores, 0)', 'ABS(COALESCE(vr_provisoes_tecnicas, 0))'),
    showInCatalog: false,
    showInCards: false,
    trend: 'higher',
  },
  {
    id: 'resultado_operacional_margem_pct',
    code: 'RO',
    label: 'Resultado Operacional / Contraprestações',
    description: '((311 - 32 - 41 + 33 - 43 - 46 - 44) + (35 - 45)) / 311 — margem operacional',
    format: 'percent',
    sql: safePercent(
      `
COALESCE(vr_contraprestacoes, 0)
  - COALESCE(vr_provisoes_tecnicas, 0)
  - COALESCE(vr_eventos_liquidos, 0)
  + COALESCE(vr_outras_receitas_operacionais, 0)
  - COALESCE(vr_desp_comerciais, 0)
  - COALESCE(vr_desp_administrativas, 0)
  - COALESCE(vr_outras_desp_oper, 0)
  + (COALESCE(vr_receitas_fin, 0) - COALESCE(vr_despesas_fin, 0))
      `,
      'vr_contraprestacoes',
    ),
    showInCatalog: false,
    showInCards: false,
    trend: 'higher',
  },
]

export const metricSql = Object.fromEntries(metricFormulas.map((formula) => [formula.id, formula.sql]))

export function getCatalogMetrics() {
  return metricFormulas.filter((formula) => formula.showInCatalog !== false).map(({ id, label, description, format }) => ({
    id,
    label,
    description,
    format,
  }))
}
