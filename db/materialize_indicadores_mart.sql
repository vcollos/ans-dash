-- Gerado automaticamente a partir das formulas em src/lib/metricFormulas.js e src/lib/metricFormulasModoUniodonto.js
-- Placeholders:
--   {{SOURCE_TABLE}} => tabela/view base (ex: `bigdata-467917.dash_ans.indicadores_curados_snapshot`)
--   {{ANS_TABLE}} => tabela destino ANS (ex: `bigdata-467917.dash_ans.indicadores_mart_ans`)
--   {{UNIODONTO_TABLE}} => tabela destino Uniodonto (ex: `bigdata-467917.dash_ans.indicadores_mart_uniodonto`)
--   {{PARTITION_EXPR}} => campo de particao (default: periodo_raw)
--   {{CLUSTER_FIELDS}} => campos de cluster (default: periodo_id,reg_ans,modalidade,uniodonto)

CREATE OR REPLACE TABLE {{UNIODONTO_TABLE}}
PARTITION BY {{PARTITION_EXPR}}
CLUSTER BY {{CLUSTER_FIELDS}}
AS
SELECT
  base.*,
  (COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0) AS receita_operacional,
  ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0) AS receita_total_uniodonto,
  COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0) AS despesas_administrativas,
  COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0) AS despesas_assistenciais,
  COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0) AS despesas_comerciais,
  CASE
      WHEN (COALESCE(prev_qt_beneficiarios, 0)) IS NULL OR (COALESCE(prev_qt_beneficiarios, 0)) = 0 THEN NULL
      ELSE ((COALESCE(qt_beneficiarios, 0) - COALESCE(prev_qt_beneficiarios, 0)) / (COALESCE(prev_qt_beneficiarios, 0))) * 100
    END AS beneficiarios_crescimento_pct,
  CASE
      WHEN (((COALESCE(trimestre, 0) * 3) * 22) * 8) IS NULL OR (((COALESCE(trimestre, 0) * 3) * 22) * 8) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) / (((COALESCE(trimestre, 0) * 3) * 22) * 8))
    END AS despesa_adm_por_hora,
  CASE
      WHEN ((COALESCE(trimestre, 0) * 3) * 22) IS NULL OR ((COALESCE(trimestre, 0) * 3) * 22) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) / ((COALESCE(trimestre, 0) * 3) * 22))
    END AS despesa_adm_por_dia,
  CASE
      WHEN (((COALESCE(trimestre, 0) * 3) * 22) / 5) IS NULL OR (((COALESCE(trimestre, 0) * 3) * 22) / 5) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) / (((COALESCE(trimestre, 0) * 3) * 22) / 5))
    END AS despesa_adm_por_semana,
  CASE
      WHEN (COALESCE(trimestre, 0) * 3) IS NULL OR (COALESCE(trimestre, 0) * 3) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) / (COALESCE(trimestre, 0) * 3))
    END AS despesa_adm_por_mes,
  CASE
      WHEN ((COALESCE(trimestre, 0) * 3) / 12) IS NULL OR ((COALESCE(trimestre, 0) * 3) / 12) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) / ((COALESCE(trimestre, 0) * 3) / 12))
    END AS despesa_adm_por_ano,
  CASE
      WHEN (((COALESCE(trimestre, 0) * 3) * 22) * 8) IS NULL OR (((COALESCE(trimestre, 0) * 3) * 22) * 8) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / (((COALESCE(trimestre, 0) * 3) * 22) * 8))
    END AS sinistralidade_hora,
  CASE
      WHEN ((COALESCE(trimestre, 0) * 3) * 22) IS NULL OR ((COALESCE(trimestre, 0) * 3) * 22) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(trimestre, 0) * 3) * 22))
    END AS sinistralidade_dia,
  CASE
      WHEN (((COALESCE(trimestre, 0) * 3) * 22) / 5) IS NULL OR (((COALESCE(trimestre, 0) * 3) * 22) / 5) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / (((COALESCE(trimestre, 0) * 3) * 22) / 5))
    END AS sinistralidade_semana,
  CASE
      WHEN (COALESCE(trimestre, 0) * 3) IS NULL OR (COALESCE(trimestre, 0) * 3) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / (COALESCE(trimestre, 0) * 3))
    END AS sinistralidade_mes,
  CASE
      WHEN ((COALESCE(trimestre, 0) * 3) / 12) IS NULL OR ((COALESCE(trimestre, 0) * 3) / 12) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(trimestre, 0) * 3) / 12))
    END AS sinistralidade_ano,
  CASE
      WHEN (((COALESCE(trimestre, 0) * 3) * 22) * 8) IS NULL OR (((COALESCE(trimestre, 0) * 3) * 22) * 8) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / (((COALESCE(trimestre, 0) * 3) * 22) * 8))
    END AS receita_assistencial_hora,
  CASE
      WHEN ((COALESCE(trimestre, 0) * 3) * 22) IS NULL OR ((COALESCE(trimestre, 0) * 3) * 22) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / ((COALESCE(trimestre, 0) * 3) * 22))
    END AS receita_assistencial_dia,
  CASE
      WHEN (((COALESCE(trimestre, 0) * 3) * 22) / 5) IS NULL OR (((COALESCE(trimestre, 0) * 3) * 22) / 5) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / (((COALESCE(trimestre, 0) * 3) * 22) / 5))
    END AS receita_assistencial_semana,
  CASE
      WHEN (COALESCE(trimestre, 0) * 3) IS NULL OR (COALESCE(trimestre, 0) * 3) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / (COALESCE(trimestre, 0) * 3))
    END AS receita_assistencial_mes,
  CASE
      WHEN ((COALESCE(trimestre, 0) * 3) / 12) IS NULL OR ((COALESCE(trimestre, 0) * 3) / 12) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / ((COALESCE(trimestre, 0) * 3) / 12))
    END AS receita_assistencial_ano,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) * 8)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) * 8)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) * 8)))
    END AS repasse_prestador_hora,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) * 22)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) * 22)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) * 22)))
    END AS repasse_prestador_dia,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) / 5)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) / 5)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) / 5)))
    END AS repasse_prestador_semana,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * (COALESCE(trimestre, 0) * 3)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * (COALESCE(trimestre, 0) * 3)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(qt_prestadores, 0)) * (COALESCE(trimestre, 0) * 3)))
    END AS repasse_prestador_mes,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) / 12)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) / 12)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) / 12)))
    END AS repasse_prestador_ano,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) * 8)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) * 8)) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) * 8)))
    END AS receita_prestador_hora,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) * 22)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) * 22)) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) * 22)))
    END AS receita_prestador_dia,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) / 5)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) / 5)) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / ((COALESCE(qt_prestadores, 0)) * (((COALESCE(trimestre, 0) * 3) * 22) / 5)))
    END AS receita_prestador_semana,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * (COALESCE(trimestre, 0) * 3)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * (COALESCE(trimestre, 0) * 3)) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / ((COALESCE(qt_prestadores, 0)) * (COALESCE(trimestre, 0) * 3)))
    END AS receita_prestador_mes,
  CASE
      WHEN ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) / 12)) IS NULL OR ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) / 12)) = 0 THEN NULL
      ELSE (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) / ((COALESCE(qt_prestadores, 0)) * ((COALESCE(trimestre, 0) * 3) / 12)))
    END AS receita_prestador_ano,
  CASE
      WHEN (COALESCE(qt_prestadores, 0)) IS NULL OR (COALESCE(qt_prestadores, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0)) / (COALESCE(qt_prestadores, 0)))
    END AS custo_adm_prestador_hora,
  CASE
      WHEN (COALESCE(qt_prestadores, 0)) IS NULL OR (COALESCE(qt_prestadores, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0)) / (COALESCE(qt_prestadores, 0)))
    END AS custo_adm_prestador_dia,
  CASE
      WHEN (COALESCE(qt_prestadores, 0)) IS NULL OR (COALESCE(qt_prestadores, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0)) / (COALESCE(qt_prestadores, 0)))
    END AS custo_adm_prestador_semana,
  CASE
      WHEN (COALESCE(qt_prestadores, 0)) IS NULL OR (COALESCE(qt_prestadores, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0)) / (COALESCE(qt_prestadores, 0)))
    END AS custo_adm_prestador_mes,
  CASE
      WHEN (COALESCE(qt_prestadores, 0)) IS NULL OR (COALESCE(qt_prestadores, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0)) / (COALESCE(qt_prestadores, 0)))
    END AS custo_adm_prestador_ano,
  CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END AS liquidez_corrente,
  CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END AS pmcr,
  CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END AS pmpe,
  CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END AS liquidez_imediata,
  ABS(COALESCE(vr_conta_237, 0)) + ABS(COALESCE(vr_conta_217, 0)) AS emprestimos_parcelamentos,
  COALESCE(vr_conta_216, 0) + COALESCE(vr_conta_236, 0) AS provisoes_tributarias_civeis_trabalhistas,
  CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END AS indice_despesas_administrativas_pct,
  CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END AS indice_despesas_assistenciais_pct,
  CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END AS indice_despesas_comerciais_pct,
  CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END AS indice_resultado_pct,
  CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 26.99 THEN 10
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 28.99 THEN 9
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 30.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 32.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 34.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 35.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 37.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 39.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 41.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 43.99 THEN 1
      ELSE 0
    END AS peso_despesas_administrativas,
  CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 46.99 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 47.99 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 49.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 51.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 54.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 55.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 57.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 59.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 61.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 63.99 THEN 9
      ELSE 10
    END AS peso_despesas_assistenciais,
  CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.49 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 2.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 4.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 5.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 7.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 9.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 11.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 13.99 THEN 9
      ELSE 10
    END AS peso_despesas_comerciais,
  CASE
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -7.5 THEN -15
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -5 THEN -12
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -2.5 THEN -9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -1 THEN -6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -0.01 THEN -3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 0.99 THEN 0
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 2.49 THEN 3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 4.99 THEN 6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 7.49 THEN 9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 9.99 THEN 12
      ELSE 15
    END AS peso_resultado,
  CASE
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.999999999 THEN -10
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 1 THEN 0
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 1.5 THEN 3
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 2 THEN 6
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 2.5 THEN 9
      ELSE 10
    END AS peso_liquidez_corrente,
  CASE
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.2 THEN 0
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.4 THEN 4
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.6 THEN 5
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.8 THEN 6
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 1 THEN 7
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 1.5 THEN 8
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 2.49 THEN 9
      ELSE 10
    END AS peso_liquidez_imediata,
  CASE
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) <= 39 THEN 10
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) <= 49 THEN 8
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) <= 59 THEN 6
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) <= 60 THEN 4
      ELSE 0
    END AS peso_pmpg,
  CASE
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) <= 39 THEN 10
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) <= 49 THEN 8
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) <= 59 THEN 6
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) <= 60 THEN 4
      ELSE 0
    END AS peso_pmrc,
  CASE
      WHEN (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 46.99 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 47.99 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 49.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 51.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 54.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 55.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 57.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 59.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 61.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 63.99 THEN 9
      ELSE 10
    END) IS NULL
        OR (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 26.99 THEN 10
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 28.99 THEN 9
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 30.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 32.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 34.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 35.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 37.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 39.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 41.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 43.99 THEN 1
      ELSE 0
    END) IS NULL
        OR (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.49 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 2.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 4.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 5.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 7.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 9.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 11.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 13.99 THEN 9
      ELSE 10
    END) IS NULL
        OR (CASE
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -7.5 THEN -15
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -5 THEN -12
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -2.5 THEN -9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -1 THEN -6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -0.01 THEN -3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 0.99 THEN 0
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 2.49 THEN 3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 4.99 THEN 6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 7.49 THEN 9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 9.99 THEN 12
      ELSE 15
    END) IS NULL THEN NULL
      ELSE (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 46.99 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 47.99 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 49.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 51.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 54.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 55.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 57.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 59.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 61.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 63.99 THEN 9
      ELSE 10
    END)
        + (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 26.99 THEN 10
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 28.99 THEN 9
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 30.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 32.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 34.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 35.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 37.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 39.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 41.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 43.99 THEN 1
      ELSE 0
    END)
        + (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.49 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 2.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 4.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 5.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 7.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 9.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 11.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 13.99 THEN 9
      ELSE 10
    END)
        + (CASE
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -7.5 THEN -15
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -5 THEN -12
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -2.5 THEN -9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -1 THEN -6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -0.01 THEN -3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 0.99 THEN 0
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 2.49 THEN 3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 4.99 THEN 6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 7.49 THEN 9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 9.99 THEN 12
      ELSE 15
    END)
        + COALESCE((CASE
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.999999999 THEN -10
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 1 THEN 0
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 1.5 THEN 3
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 2 THEN 6
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativo_circulante, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 2.5 THEN 9
      ELSE 10
    END), 0)
        + COALESCE((CASE
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.2 THEN 0
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.4 THEN 4
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.6 THEN 5
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 0.8 THEN 6
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 1 THEN 7
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 1.5 THEN 8
      WHEN (
    CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END
    ) <= 2.49 THEN 9
      ELSE 10
    END), 0)
        + COALESCE((CASE
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) <= 39 THEN 10
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) <= 49 THEN 8
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) <= 59 THEN 6
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END
    ) <= 60 THEN 4
      ELSE 0
    END), 0)
        + COALESCE((CASE
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) <= 39 THEN 10
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) <= 49 THEN 8
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) <= 59 THEN 6
      WHEN (
    CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END
    ) <= 60 THEN 4
      ELSE 0
    END), 0)
    END AS ranking_operacional,
  CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END AS icu_operacional,
  CASE
      WHEN (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 46.99 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 47.99 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 49.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 51.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 54.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 55.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 57.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 59.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 61.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 63.99 THEN 9
      ELSE 10
    END) IS NULL
        OR (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 26.99 THEN 10
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 28.99 THEN 9
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 30.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 32.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 34.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 35.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 37.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 39.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 41.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 43.99 THEN 1
      ELSE 0
    END) IS NULL
        OR (CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.49 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 2.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 4.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 5.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 7.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 9.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 11.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 13.99 THEN 9
      ELSE 10
    END) IS NULL
        OR (CASE
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -7.5 THEN -15
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -5 THEN -12
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -2.5 THEN -9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -1 THEN -6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -0.01 THEN -3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 0.99 THEN 0
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 2.49 THEN 3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 4.99 THEN 6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 7.49 THEN 9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 9.99 THEN 12
      ELSE 15
    END) IS NULL THEN NULL
      ELSE ((CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 46.99 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 47.99 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 49.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 51.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 54.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 55.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 57.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 59.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 61.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 63.99 THEN 9
      ELSE 10
    END) * 0.55)
        + ((CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 26.99 THEN 10
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 28.99 THEN 9
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 30.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 32.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 34.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 35.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 37.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 39.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 41.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((CASE
      WHEN CAST(reg_ans AS STRING) = '314315'
        THEN (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) - COALESCE(vr_conta_332189111, 0)
      ELSE (COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0))
    END) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 43.99 THEN 1
      ELSE 0
    END) * 0.35)
        + ((CASE
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0 THEN 0
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.49 THEN 1
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 0.99 THEN 2
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 2.99 THEN 3
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 4.99 THEN 4
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 5.99 THEN 5
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 7.99 THEN 6
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 9.99 THEN 7
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 11.99 THEN 8
      WHEN (
    CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)) / ((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0))) * 100
    END
    ) <= 13.99 THEN 9
      ELSE 10
    END) * 0.05)
        + ((CASE
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) IS NULL THEN NULL
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -7.5 THEN -15
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -5 THEN -12
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -2.5 THEN -9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -1 THEN -6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= -0.01 THEN -3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 0.99 THEN 0
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 2.49 THEN 3
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 4.99 THEN 6
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 7.49 THEN 9
      WHEN (
    CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) = 0 THEN NULL
      ELSE (((((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0)) - ((COALESCE(vr_desp_administrativas, 0) - COALESCE(vr_conta_464, 0)) + (COALESCE(vr_eventos_liquidos, 0) + COALESCE(vr_conta_442129119, 0)) + (COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_conta_464, 0)))) / (((COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0)) - COALESCE(vr_conta_32, 0)) - COALESCE(vr_conta_61, 0))) * 100
    END
    ) <= 9.99 THEN 12
      ELSE 15
    END) * 0.05)
    END AS icu_score
FROM {{SOURCE_TABLE}} base;

CREATE OR REPLACE TABLE {{ANS_TABLE}}
PARTITION BY {{PARTITION_EXPR}}
CLUSTER BY {{CLUSTER_FIELDS}}
AS
SELECT
  base.*,
  CASE
      WHEN qt_beneficiarios IS NULL OR qt_beneficiarios = 0 THEN NULL
      WHEN trimestre IS NULL OR trimestre = 0 THEN NULL
      ELSE (COALESCE(vr_eventos_liquidos, 0) / qt_beneficiarios) / (CAST(trimestre AS FLOAT64) * 3)
    END AS sinistro_per_capta,
  CASE
      WHEN qt_beneficiarios IS NULL OR qt_beneficiarios = 0 THEN NULL
      WHEN trimestre IS NULL OR trimestre = 0 THEN NULL
      ELSE (COALESCE(vr_contraprestacoes, 0) / qt_beneficiarios) / (CAST(trimestre AS FLOAT64) * 3)
    END AS ticket_medio,
  CASE
      WHEN (ABS(COALESCE(vr_eventos_liquidos, 0))) IS NULL OR (ABS(COALESCE(vr_eventos_liquidos, 0))) = 0 THEN NULL
      ELSE ((ABS(COALESCE(vr_contraprestacoes, 0))) / (ABS(COALESCE(vr_eventos_liquidos, 0))))
    END AS ticket_medio_relativo_sinistro,
  CASE
      WHEN vr_ativos_garantidores IS NULL OR vr_ativos_garantidores = 0 THEN NULL
      ELSE (ABS(COALESCE(vr_conta_217, 0)) + ABS(COALESCE(vr_conta_237, 0))) / ABS(vr_ativos_garantidores)
    END AS emprestimos_parcelamentos,
  CASE
      WHEN (vr_contraprestacoes) IS NULL OR (vr_contraprestacoes) = 0 THEN NULL
      ELSE ((resultado_liquido) / (vr_contraprestacoes)) * 100
    END AS margem_lucro_pct,
  CASE
      WHEN vr_patrimonio_liquido IS NULL OR vr_patrimonio_liquido = 0 THEN NULL
      WHEN vr_patrimonio_liquido < 0 THEN (-ABS(resultado_liquido) / ABS(vr_patrimonio_liquido)) * 100
      ELSE (resultado_liquido / vr_patrimonio_liquido) * 100
    END AS retorno_pl_pct,
  CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) / ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0)))) * 100
    END AS sinistralidade_pct,
  CASE
      WHEN (
    SUM((COALESCE(delta_vr_contraprestacoes, 0) - COALESCE(delta_vr_provisoes_tecnicas, 0)) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0)))
      OVER (PARTITION BY reg_ans, ano ORDER BY trimestre ROWS UNBOUNDED PRECEDING)
    ) IS NULL OR (
    SUM((COALESCE(delta_vr_contraprestacoes, 0) - COALESCE(delta_vr_provisoes_tecnicas, 0)) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0)))
      OVER (PARTITION BY reg_ans, ano ORDER BY trimestre ROWS UNBOUNDED PRECEDING)
    ) = 0 THEN NULL
      ELSE ((
    SUM(COALESCE(delta_vr_eventos_liquidos, 0) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0)))
      OVER (PARTITION BY reg_ans, ano ORDER BY trimestre ROWS UNBOUNDED PRECEDING)
    ) / (
    SUM((COALESCE(delta_vr_contraprestacoes, 0) - COALESCE(delta_vr_provisoes_tecnicas, 0)) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0)))
      OVER (PARTITION BY reg_ans, ano ORDER BY trimestre ROWS UNBOUNDED PRECEDING)
    )) * 100
    END AS sinistralidade_acumulada_pct,
  CASE
      WHEN ((COALESCE(delta_vr_contraprestacoes, 0) - COALESCE(delta_vr_provisoes_tecnicas, 0)) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0))) IS NULL OR ((COALESCE(delta_vr_contraprestacoes, 0) - COALESCE(delta_vr_provisoes_tecnicas, 0)) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0))) = 0 THEN NULL
      ELSE ((COALESCE(delta_vr_eventos_liquidos, 0) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0))) / ((COALESCE(delta_vr_contraprestacoes, 0) - COALESCE(delta_vr_provisoes_tecnicas, 0)) + ABS(COALESCE(delta_vr_corresponsabilidade_cedida, 0)))) * 100
    END AS sinistralidade_trimestral_pct,
  CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_administrativas, 0)) / ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0)))) * 100
    END AS despesas_adm_pct,
  CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) = 0 THEN NULL
      ELSE ((COALESCE(vr_desp_comerciais, 0)) / ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0)))) * 100
    END AS despesas_comerciais_pct,
  CASE
      WHEN (((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) + COALESCE(vr_outras_receitas_operacionais, 0)) IS NULL OR (((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) + COALESCE(vr_outras_receitas_operacionais, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_liquidos, 0) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0)) + COALESCE(vr_desp_comerciais, 0) + COALESCE(vr_desp_administrativas, 0) + COALESCE(vr_outras_desp_oper, 0)) / (((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) + COALESCE(vr_outras_receitas_operacionais, 0))) * 100
    END AS despesas_operacionais_pct,
  CASE
      WHEN ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) IS NULL OR ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))) = 0 THEN NULL
      ELSE ((
    COALESCE(vr_eventos_liquidos, 0)
      + ABS(COALESCE(vr_corresponsabilidade_cedida, 0))
      + COALESCE(vr_desp_comerciais, 0)
      + COALESCE(vr_desp_comerciais_promocoes, 0)
      + COALESCE(vr_desp_administrativas, 0)
      + COALESCE(vr_desp_tributos, 0)
      + COALESCE(vr_outras_desp_oper, 0)
      - COALESCE(vr_outras_receitas_operacionais, 0)
          ) / ((COALESCE(vr_contraprestacoes, 0) - COALESCE(vr_provisoes_tecnicas, 0)) + ABS(COALESCE(vr_corresponsabilidade_cedida, 0)))) * 100
    END AS combined_ratio_pct,
  CASE
      WHEN (vr_contraprestacoes_pre) IS NULL OR (vr_contraprestacoes_pre) = 0 THEN NULL
      ELSE (((COALESCE(vr_receitas_fin, 0) - COALESCE(vr_despesas_fin, 0))) / (vr_contraprestacoes_pre)) * 100
    END AS indice_resultado_financeiro_pct,
  CASE
      WHEN (vr_contraprestacoes_pre) IS NULL OR (vr_contraprestacoes_pre) = 0 THEN NULL
      ELSE ((vr_desp_tributos) / (vr_contraprestacoes_pre)) * 100
    END AS despesas_tributarias_pct,
  CASE
      WHEN (vr_passivo_circulante) IS NULL OR (vr_passivo_circulante) = 0 THEN NULL
      ELSE ((vr_ativo_circulante) / (vr_passivo_circulante))
    END AS liquidez_corrente,
  CASE
      WHEN (COALESCE(vr_passivo_circulante, 0)) IS NULL OR (COALESCE(vr_passivo_circulante, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_conta_1213, 0) + COALESCE(vr_conta_1214, 0) + COALESCE(vr_conta_122, 0)) / (COALESCE(vr_passivo_circulante, 0)))
    END AS liquidez_imediata,
  CASE
      WHEN vr_patrimonio_liquido IS NULL OR vr_patrimonio_liquido = 0 THEN NULL
      WHEN vr_patrimonio_liquido < 0 THEN NULL
      ELSE (COALESCE(vr_passivo_circulante, 0) + COALESCE(vr_passivo_nao_circulante, 0)) / vr_patrimonio_liquido
    END AS capital_terceiros_sobre_pl,
  CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_contraprestacoes_pre, 0)) IS NULL OR (COALESCE(vr_contraprestacoes_pre, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_creditos_operacoes_saude, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_contraprestacoes_pre, 0))
    END AS pmcr,
  CASE
      WHEN (CAST(trimestre AS FLOAT64) * 90) IS NULL OR (CAST(trimestre AS FLOAT64) * 90) = 0 THEN NULL
      WHEN (COALESCE(vr_eventos_liquidos, 0)) IS NULL OR (COALESCE(vr_eventos_liquidos, 0)) = 0 THEN NULL
      ELSE ((COALESCE(vr_eventos_a_liquidar, 0)) * (CAST(trimestre AS FLOAT64) * 90)) / (COALESCE(vr_eventos_liquidos, 0))
    END AS pmpe,
  CASE
      WHEN (ABS(COALESCE(vr_provisoes_tecnicas, 0))) IS NULL OR (ABS(COALESCE(vr_provisoes_tecnicas, 0))) = 0 THEN NULL
      ELSE ((COALESCE(vr_ativos_garantidores, 0)) / (ABS(COALESCE(vr_provisoes_tecnicas, 0))))
    END AS cobertura_provisoes,
  CASE
      WHEN (vr_contraprestacoes) IS NULL OR (vr_contraprestacoes) = 0 THEN NULL
      ELSE ((
    COALESCE(vr_contraprestacoes, 0)
      - COALESCE(vr_provisoes_tecnicas, 0)
      - COALESCE(vr_eventos_liquidos, 0)
      + COALESCE(vr_outras_receitas_operacionais, 0)
      - COALESCE(vr_desp_comerciais, 0)
      - COALESCE(vr_desp_administrativas, 0)
      - COALESCE(vr_outras_desp_oper, 0)
      + (COALESCE(vr_receitas_fin, 0) - COALESCE(vr_despesas_fin, 0))
          ) / (vr_contraprestacoes)) * 100
    END AS resultado_operacional_margem_pct
FROM {{SOURCE_TABLE}} base;
