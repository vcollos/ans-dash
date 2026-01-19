WITH prestadores AS (
  SELECT
    CAST(reg_ans AS STRING) AS reg_ans_join,
    COUNT(DISTINCT ID_ESTABELECIMENTO_SAUDE) AS qt_prestadores_proprios
  FROM prestadores_ativos_uniodonto_origem
  WHERE origem = 'PRÓPRIA'
    AND COMPETENCIA = (
      SELECT MAX(COMPETENCIA)
      FROM prestadores_ativos_uniodonto_origem
    )
  GROUP BY reg_ans_join
)
SELECT
  nome_operadora,
  modalidade,
  CASE
    WHEN uniodonto IS TRUE THEN 'SIM'
  WHEN uniodonto IS FALSE THEN 'NÃO'
  ELSE ''
  END AS uniodonto,
  qt_beneficiarios AS qt_beneficiarios_periodo,
  COALESCE(qt_prestadores, prestadores.qt_prestadores_proprios) AS qt_prestadores_periodo,
  CASE
    WHEN ativa IS TRUE THEN 'SIM'
    WHEN ativa IS FALSE THEN 'NÃO'
    ELSE ''
  END AS ativa,
  COALESCE(porte, '') AS porte,
  reg_ans,
  ano,
  trimestre,
  vr_receitas AS `3_vr_receitas`,
  vr_despesas AS `4_vr_despesas`,
  vr_contraprestacoes AS `311_vr_contraprestacoes`,
  vr_contraprestacoes_efetivas AS `3111_vr_contraprestacoes_efetivas`,
  vr_contraprestacoes_pre AS `311121_vr_contraprestacoes_pre`,
  vr_corresponsabilidade_cedida AS `3117_vr_corresponsabilidade_cedida`,
  vr_creditos_operacoes_saude AS `1231_vr_creditos_operacoes_saude`,
  vr_eventos_liquidos AS `41_vr_eventos_liquidos`,
  vr_eventos_a_liquidar AS `2111_vr_eventos_a_liquidar`,
  vr_desp_comerciais AS `43_vr_desp_comerciais`,
  vr_desp_comerciais_promocoes AS `464119113_vr_desp_comerciais_promocoes`,
  vr_desp_administrativas AS `46_vr_desp_administrativas`,
  vr_outras_desp_oper AS `44_vr_outras_desp_oper`,
  vr_desp_tributos AS `47_vr_desp_tributos`,
  vr_receitas_fin AS `35_vr_receitas_fin`,
  vr_receitas_patrimoniais AS `36_vr_receitas_patrimoniais`,
  vr_despesas_fin AS `45_vr_despesas_fin`,
  vr_outras_receitas_operacionais AS `33_vr_outras_receitas_operacionais`,
  vr_ativo_circulante AS `12_vr_ativo_circulante`,
  vr_conta_1213 AS `1213_vr_conta_1213`,
  vr_conta_1214 AS `1214_vr_conta_1214`,
  vr_conta_122 AS `122_vr_conta_122`,
  vr_ativo_permanente AS `13_vr_ativo_permanente`,
  vr_passivo_circulante AS `21_vr_passivo_circulante`,
  vr_passivo_nao_circulante AS `23_vr_passivo_nao_circulante`,
  vr_patrimonio_liquido AS `25_vr_patrimonio_liquido`,
  vr_ativos_garantidores AS `31_vr_ativos_garantidores`,
  vr_provisoes_tecnicas AS `32_vr_provisoes_tecnicas`,
  vr_conta_216 AS `216_vr_conta_216`,
  vr_conta_217 AS `217_vr_conta_217`,
  vr_conta_236 AS `236_vr_conta_236`,
  vr_conta_237 AS `237_vr_conta_237`,
  vr_pl_ajustado AS `2521_vr_pl_ajustado`,
  vr_margem_solvencia_exigida AS `2522_vr_margem_solvencia_exigida`,
  vr_conta_61 AS `61_vr_conta_61`
FROM {{DATASET_VIEW}}
LEFT JOIN prestadores
  ON CAST(reg_ans AS STRING) = prestadores.reg_ans_join;
