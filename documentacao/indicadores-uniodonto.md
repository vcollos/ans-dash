# Indicadores do Modo Uniodonto

Este arquivo descreve os indicadores exclusivos do Modo Uniodonto e as formulas usadas no dashboard.
As expressoes refletem exatamente o que esta em `src/lib/uniodontoMetrics.js`.

## 1) Definicoes base

- receita_operacional = `vr_contraprestacoes (311)` + `vr_outras_receitas_operacionais (33)`
- receita_total = receita_operacional - `vr_conta_61 (61 impostos/participacoes)`
- despesas_administrativas = `vr_desp_administrativas (46)`
- despesas_assistenciais = `vr_eventos_liquidos (41)` + `vr_outras_desp_oper (44)`
- despesas_comerciais = `vr_desp_comerciais (43)` + `vr_desp_comerciais_promocoes (464119113)`
- resultado_indice_base = `vr_desp_administrativas (46)` - `vr_desp_comerciais_promocoes (464119113)`
- prestadores = `qt_prestadores`
- beneficiarios = `qt_beneficiarios`
- beneficiarios_prev = `prev_qt_beneficiarios`
- meses_no_periodo = `trimestre * 3` (periodo acumulativo)

Observacoes:
- Quando o denominador e 0 ou null, o indicador fica null.
- Percentuais sao expressos em % (0 a 100).

## 2) Indicadores (formulas)

- ranking_operacional
  - Soma dos pesos: `peso_assistencial + peso_administrativo + peso_comercial + peso_resultado`.
- icu_score
  - `0.55 * peso_assistencial + 0.35 * peso_administrativo + 0.05 * peso_comercial + 0.05 * peso_resultado`.
- receita_total_uniodonto
  - `receita_total`.
- beneficiarios_crescimento_pct
  - `((beneficiarios - beneficiarios_prev) / beneficiarios_prev) * 100`.
- indice_despesas_assistenciais_pct
  - `(despesas_assistenciais / receita_operacional) * 100`.
- indice_despesas_administrativas_pct
  - `(despesas_administrativas / receita_total) * 100`.
- indice_despesas_comerciais_pct
  - `(despesas_comerciais / receita_operacional) * 100`.
- indice_resultado_pct
  - `(resultado_indice_base / receita_operacional) * 100`.
- icu_operacional
  - `receita_total - despesas_administrativas - despesas_assistenciais - despesas_comerciais`.
- despesa_adm_por_hora
  - `despesas_administrativas / (220 * meses_no_periodo)`.
- despesa_adm_por_dia
  - `despesas_administrativas / (30 * meses_no_periodo)`.
- despesa_adm_por_semana
  - `despesas_administrativas / (4.5 * meses_no_periodo)`.
- icp_custo_prestador
  - `despesas_assistenciais / prestadores`.
- irp_receita_prestador
  - `receita_operacional / prestadores`.
- indice_repasse_prestador
  - `icp_custo_prestador - irp_receita_prestador`.
- liquidez_imediata
  - `(vr_conta_1213 + vr_conta_1214 + vr_conta_122) / vr_passivo_circulante (21)`.
- emprestimos_parcelamentos
  - `(abs(vr_conta_237) + abs(vr_conta_271)) / abs(vr_ativos_garantidores (31))`.
- provisoes_tributarias_civeis_trabalhistas
  - `vr_conta_216 + vr_conta_236`.

## 3) Regras de peso (score)

### 3.1) indice_despesas_administrativas_pct (peso_administrativo)

- <= 26.99% -> 10
- 27.00% a 28.99% -> 9
- 29.00% a 30.99% -> 8
- 31.00% a 32.99% -> 7
- 33.00% a 34.99% -> 6
- 35.00% a 35.99% -> 5
- 36.00% a 37.99% -> 4
- 38.00% a 39.99% -> 3
- 40.00% a 41.99% -> 2
- 42.00% a 43.99% -> 1
- >= 44.00% -> 0

### 3.2) indice_despesas_assistenciais_pct (peso_assistencial)

- <= 46.99% -> 0
- 47.00% a 47.99% -> 1
- 48.00% a 49.99% -> 2
- 50.00% a 51.99% -> 3
- 52.00% a 54.99% -> 4
- 55.00% a 55.99% -> 5
- 56.00% a 57.99% -> 6
- 58.00% a 59.99% -> 7
- 60.00% a 61.99% -> 8
- 62.00% a 63.99% -> 9
- >= 64.00% -> 10

### 3.3) indice_despesas_comerciais_pct (peso_comercial)

- 0.00% -> 0
- 0.00% a 0.49% -> 1
- 0.50% a 0.99% -> 2
- 1.00% a 2.99% -> 3
- 3.00% a 4.99% -> 4
- 5.00% a 5.99% -> 5
- 6.00% a 7.99% -> 6
- 8.00% a 9.99% -> 7
- 10.00% a 11.99% -> 8
- 12.00% a 13.99% -> 9
- >= 14.00% -> 10

### 3.4) indice_resultado_pct (peso_resultado)

- <= -7.50% -> -15
- -5.00% a -7.49% -> -12
- -2.50% a -4.99% -> -9
- -1.00% a -2.49% -> -6
- -0.99% a -0.01% -> -3
- 0.00% a 0.99% -> 0
- 1.00% a 2.49% -> 3
- 2.50% a 4.99% -> 6
- 5.00% a 7.49% -> 9
- 7.50% a 9.99% -> 12
- >= 10.00% -> 15
