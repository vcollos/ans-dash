const numberOrZero = (value) => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const hasAnyValue = (values = {}, keys = []) => keys.some((key) => values[key] !== null && values[key] !== undefined)

export const monetaryIndicators = [
  {
    id: 'categoria_ativo',
    label: '1 – Ativo',
    column: 'categoria_ativo_total',
    indent: 0,
    dependencies: ['12_vr_ativo_circulante', '13_vr_ativo_nao_circulante'],
    derive: (values) => {
      if (!hasAnyValue(values, ['12_vr_ativo_circulante', '13_vr_ativo_nao_circulante'])) {
        return null
      }
      return numberOrZero(values['12_vr_ativo_circulante']) + numberOrZero(values['13_vr_ativo_nao_circulante'])
    },
  },
  {
    id: '12',
    label: '12 – Ativo circulante',
    column: '12_vr_ativo_circulante',
    sources: ['12_vr_ativo_circulante', 'vr_ativo_circulante'],
    indent: 1,
  },
  {
    id: '13',
    label: '13 – Ativo não circulante',
    column: '13_vr_ativo_nao_circulante',
    sources: ['13_vr_ativo_nao_circulante', 'vr_ativo_nao_circulante', 'vr_ativo_permanente'],
    indent: 1,
  },
  {
    id: 'categoria_passivo',
    label: '2 – Passivo',
    column: 'categoria_passivo_total',
    indent: 0,
    dependencies: ['21_vr_passivo_circulante', '23_vr_passivo_nao_circulante', '25_vr_patrimonio_liquido', '61_vr_ajustes_adicionais_ans'],
    derive: (values) => {
      if (
        !hasAnyValue(values, [
          '21_vr_passivo_circulante',
          '23_vr_passivo_nao_circulante',
          '25_vr_patrimonio_liquido',
          '61_vr_ajustes_adicionais_ans',
        ])
      ) {
        return null
      }
      return (
        numberOrZero(values['21_vr_passivo_circulante']) +
        numberOrZero(values['23_vr_passivo_nao_circulante']) +
        numberOrZero(values['25_vr_patrimonio_liquido']) +
        numberOrZero(values['61_vr_ajustes_adicionais_ans'])
      )
    },
  },
  {
    id: '21',
    label: '21 – Passivo circulante',
    column: '21_vr_passivo_circulante',
    sources: ['21_vr_passivo_circulante', 'vr_passivo_circulante'],
    indent: 1,
  },
  {
    id: '23',
    label: '23 – Passivo não circulante',
    column: '23_vr_passivo_nao_circulante',
    sources: ['23_vr_passivo_nao_circulante', 'vr_passivo_nao_circulante'],
    indent: 1,
  },
  {
    id: '25',
    label: '25 – Patrimônio líquido',
    column: '25_vr_patrimonio_liquido',
    sources: ['25_vr_patrimonio_liquido', 'vr_patrimonio_liquido'],
    indent: 1,
  },
  {
    id: '61',
    label: '61 – Impostos e participações sobre o lucro',
    column: '61_vr_ajustes_adicionais_ans',
    sources: ['61_vr_ajustes_adicionais_ans', 'vr_conta_61'],
    indent: 1,
  },
  {
    id: '3',
    label: '3 – Receitas Totais',
    column: '3_vr_receitas',
    sources: ['3_vr_receitas', 'vr_receitas'],
    indent: 0,
  },
  {
    id: '31',
    label: '31 – Ativos garantidores',
    column: '31_vr_ativos_garantidores',
    sources: ['31_vr_ativos_garantidores', 'vr_ativos_garantidores'],
    indent: 1,
  },
  {
    id: '311',
    label: '311 – Receitas de contraprestações',
    column: '311_vr_contraprestacoes',
    sources: ['311_vr_contraprestacoes', 'vr_contraprestacoes'],
    indent: 2,
  },
  {
    id: '3111',
    label: '3111 – Contraprestações efetivas',
    column: '3111_vr_contraprestacoes_efetivas',
    sources: ['3111_vr_contraprestacoes_efetivas', 'vr_contraprestacoes_efetivas'],
    indent: 3,
  },
  {
    id: '311121',
    label: '311121 – Receitas de contraprestações (pré)',
    column: '311121_vr_contraprestacoes_pre',
    sources: ['311121_vr_contraprestacoes_pre', 'vr_contraprestacoes_pre'],
    indent: 4,
  },
  {
    id: '3117',
    label: '3117 – Corresponsabilidade cedida',
    column: '3117_vr_corresponsabilidade_cedida',
    sources: ['3117_vr_corresponsabilidade_cedida', 'vr_corresponsabilidade_cedida'],
    indent: 3,
  },
  {
    id: '32',
    label: '32 – Provisões técnicas',
    column: '32_vr_provisoes_tecnicas',
    sources: ['32_vr_provisoes_tecnicas', 'vr_provisoes_tecnicas'],
    indent: 1,
  },
  {
    id: '33',
    label: '33 – Outras receitas operacionais',
    column: '33_vr_outras_receitas_operacionais',
    sources: ['33_vr_outras_receitas_operacionais', 'vr_outras_receitas_operacionais'],
    indent: 1,
  },
  {
    id: '35',
    label: '35 – Receitas financeiras',
    column: '35_vr_receitas_financeiras',
    sources: ['35_vr_receitas_financeiras', 'vr_receitas_fin'],
    indent: 1,
  },
  {
    id: '36',
    label: '36 – Receitas patrimoniais',
    column: '36_vr_receitas_patrimoniais',
    sources: ['36_vr_receitas_patrimoniais', 'vr_receitas_patrimoniais'],
    indent: 1,
  },
  {
    id: '4',
    label: '4 – Despesas Totais',
    column: '4_vr_despesas',
    sources: ['4_vr_despesas', 'vr_despesas'],
    indent: 0,
  },
  {
    id: 'categoria_resultado',
    label: 'Resultado das operações com planos de assistência à saúde',
    column: 'resultado_operacoes_assistencia_saude',
    indent: 0,
    dependencies: ['311_vr_contraprestacoes', '32_vr_provisoes_tecnicas', '41_vr_eventos_liquidos'],
    derive: (values) => {
      if (!hasAnyValue(values, ['311_vr_contraprestacoes', '32_vr_provisoes_tecnicas', '41_vr_eventos_liquidos'])) {
        return null
      }
      return (
        numberOrZero(values['311_vr_contraprestacoes']) -
        numberOrZero(values['32_vr_provisoes_tecnicas']) -
        numberOrZero(values['41_vr_eventos_liquidos'])
      )
    },
  },
  {
    id: 'resultado_bruto',
    label: 'Resultado bruto',
    column: 'resultado_bruto',
    indent: 1,
    dependencies: [
      'resultado_operacoes_assistencia_saude',
      '33_vr_outras_receitas_operacionais',
      '43_vr_desp_comerciais',
      '46_vr_desp_administrativas',
      '44_vr_outras_desp_oper',
    ],
    derive: (values) => {
      if (values.resultado_operacoes_assistencia_saude === null || values.resultado_operacoes_assistencia_saude === undefined) {
        return null
      }
      return (
        numberOrZero(values.resultado_operacoes_assistencia_saude) +
        numberOrZero(values['33_vr_outras_receitas_operacionais']) -
        numberOrZero(values['43_vr_desp_comerciais']) -
        numberOrZero(values['46_vr_desp_administrativas']) -
        numberOrZero(values['44_vr_outras_desp_oper'])
      )
    },
  },
  {
    id: 'resultado_financeiro',
    label: 'Resultado financeiro (35 - 45)',
    column: 'resultado_financeiro',
    sources: ['resultado_financeiro'],
    indent: 2,
  },
  {
    id: 'resultado_operacional',
    label: 'Resultado operacional',
    column: 'resultado_operacional',
    indent: 2,
    dependencies: ['resultado_bruto', 'resultado_financeiro', '35_vr_receitas_financeiras', '45_vr_despesas_financeiras'],
    derive: (values) => {
      if (values.resultado_bruto === null || values.resultado_bruto === undefined) {
        return null
      }
      const financeiro =
        values.resultado_financeiro !== null && values.resultado_financeiro !== undefined
          ? values.resultado_financeiro
          : hasAnyValue(values, ['35_vr_receitas_financeiras', '45_vr_despesas_financeiras'])
            ? numberOrZero(values['35_vr_receitas_financeiras']) - numberOrZero(values['45_vr_despesas_financeiras'])
            : null
      return financeiro === null
        ? null
        : numberOrZero(values.resultado_bruto) + numberOrZero(financeiro)
    },
  },
  {
    id: 'resultado_antes_impostos_participacoes',
    label: 'Resultado antes dos impostos e participações',
    column: 'resultado_antes_impostos_participacoes',
    indent: 2,
    dependencies: ['resultado_operacional', '47_vr_desp_tributos'],
    derive: (values) => {
      if (values.resultado_operacional === null || values.resultado_operacional === undefined) {
        return null
      }
      return numberOrZero(values.resultado_operacional) - numberOrZero(values['47_vr_desp_tributos'])
    },
  },
  {
    id: 'resultado_patrimonial',
    label: 'Resultado patrimonial',
    column: 'resultado_patrimonial',
    indent: 2,
    dependencies: ['36_vr_receitas_patrimoniais'],
    derive: (values) => {
      if (!hasAnyValue(values, ['36_vr_receitas_patrimoniais'])) {
        return null
      }
      return numberOrZero(values['36_vr_receitas_patrimoniais'])
    },
  },
  {
    id: 'resultado_liquido_final_ans',
    label: 'Resultado líquido final',
    column: 'resultado_liquido_final_ans',
    sources: ['resultado_liquido_final_ans'],
    indent: 0,
  },
  {
    id: 'resultado_liquido_em_uso',
    label: '69 – Apuração do resultado',
    column: 'resultado_liquido_em_uso',
    sources: ['resultado_liquido', 'resultado_liquido_em_uso'],
    indent: 1,
  },
]

export const monetaryIndicatorTree = [
  {
    id: 'group_ativo',
    column: 'categoria_ativo_total',
    label: '1 – Ativo',
    children: [
      { id: '12', column: '12_vr_ativo_circulante' },
      { id: '13', column: '13_vr_ativo_nao_circulante' },
    ],
  },
  {
    id: 'group_passivo',
    column: 'categoria_passivo_total',
    label: '2 – Passivo',
    children: [
      { id: '21', column: '21_vr_passivo_circulante' },
      { id: '23', column: '23_vr_passivo_nao_circulante' },
      { id: '25', column: '25_vr_patrimonio_liquido' },
    ],
  },
  {
    id: 'group_receita',
    column: '3_vr_receitas',
    label: '3 – Receitas Totais',
    children: [
      {
        id: '31',
        column: '31_vr_ativos_garantidores',
        children: [
          {
            id: '311',
            column: '311_vr_contraprestacoes',
            children: [
              { id: '3111', column: '3111_vr_contraprestacoes_efetivas' },
              { id: '311121', column: '311121_vr_contraprestacoes_pre' },
            ],
          },
          { id: '3117', column: '3117_vr_corresponsabilidade_cedida' },
        ],
      },
      { id: '32', column: '32_vr_provisoes_tecnicas' },
      { id: '33', column: '33_vr_outras_receitas_operacionais' },
      { id: '35', column: '35_vr_receitas_financeiras' },
      { id: '36', column: '36_vr_receitas_patrimoniais' },
      { id: 'resultado_financeiro_node', column: 'resultado_financeiro' },
    ],
  },
  {
    id: 'group_despesa',
    column: '4_vr_despesas',
    label: '4 – Despesas Totais',
    children: [
      { id: '43', column: '43_vr_desp_comerciais' },
      { id: '46', column: '46_vr_desp_administrativas' },
      { id: '44', column: '44_vr_outras_desp_oper' },
      { id: '45', column: '45_vr_despesas_financeiras' },
      { id: '47', column: '47_vr_desp_tributos' },
    ],
  },
  {
    id: 'group_classe6',
    column: 'categoria_resultado',
    label: '6 – Resultado das operações com planos de assistência à saúde',
    children: [
      { id: '61_node', column: '61_vr_ajustes_adicionais_ans' },
      { id: 'resultado_liquido_em_uso', column: 'resultado_liquido_em_uso' },
    ],
  },
  {
    id: 'group_resultado',
    column: 'resultado_liquido_final_ans',
    label: 'Resultado líquido final',
    children: [
      { id: 'resultado_bruto', column: 'resultado_bruto' },
      { id: 'resultado_operacional', column: 'resultado_operacional' },
      { id: 'resultado_antes_impostos', column: 'resultado_antes_impostos_participacoes' },
      { id: 'resultado_patrimonial', column: 'resultado_patrimonial' },
    ],
  },
]

const auxiliaryColumnSources = {
  '12_vr_ativo_circulante': ['12_vr_ativo_circulante', 'vr_ativo_circulante'],
  '13_vr_ativo_nao_circulante': ['13_vr_ativo_nao_circulante', 'vr_ativo_nao_circulante', 'vr_ativo_permanente'],
  '21_vr_passivo_circulante': ['21_vr_passivo_circulante', 'vr_passivo_circulante'],
  '23_vr_passivo_nao_circulante': ['23_vr_passivo_nao_circulante', 'vr_passivo_nao_circulante'],
  '41_vr_eventos_liquidos': ['41_vr_eventos_liquidos', 'vr_eventos_liquidos'],
  '43_vr_desp_comerciais': ['43_vr_desp_comerciais', 'vr_desp_comerciais'],
  '44_vr_outras_desp_oper': ['44_vr_outras_desp_oper', 'vr_outras_desp_oper'],
  '45_vr_despesas_financeiras': ['45_vr_despesas_financeiras', 'vr_despesas_fin'],
  '47_vr_desp_tributos': ['47_vr_desp_tributos', 'vr_desp_tributos'],
  resultado_financeiro: ['resultado_financeiro'],
}

const columnSourceMap = {}
const columnSet = new Set()

const registerColumnSources = (column, sources) => {
  if (!column || columnSourceMap[column]) return
  columnSourceMap[column] = sources?.length ? sources : [column]
}

monetaryIndicators.forEach((indicator) => {
  if (indicator.column && !indicator.derive) {
    columnSet.add(indicator.column)
    registerColumnSources(indicator.column, indicator.sources)
  }
  ;(indicator.dependencies ?? []).forEach((dependency) => {
    columnSet.add(dependency)
    if (columnSourceMap[dependency]) return
    if (auxiliaryColumnSources[dependency]) {
      registerColumnSources(dependency, auxiliaryColumnSources[dependency])
    } else {
      registerColumnSources(dependency, [dependency])
    }
  })
})

Object.entries(auxiliaryColumnSources).forEach(([column, sources]) => registerColumnSources(column, sources))

export const monetaryIndicatorColumnMap = columnSourceMap
export const monetaryIndicatorPhysicalColumns = Array.from(columnSet)
export const monetaryIndicatorColumns = monetaryIndicators.filter((indicator) => indicator.column).map((indicator) => indicator.column)

export function applyDerivedMonetaryValues(values) {
  if (!values) return values
  monetaryIndicators.forEach((indicator) => {
    if (!indicator.column || typeof indicator.derive !== 'function') return
    const computed = indicator.derive(values)
    values[indicator.column] = computed
  })
  return values
}
