# Fórmulas do Modo Uniodonto

Proprietário: Vitor Collos

# Indicadores do Modo Uniodonto

Este arquivo descreve os indicadores exclusivos do Modo Uniodonto e as formulas usadas no dashboard.
As expressoes refletem exatamente o que esta em `src/lib/uniodontoMetrics.js`.

## 1. Definicoes base (Variáveis)

- receita_operacional = (`vr_contraprestacoes (31)` + `vr_outras_receitas_operacionais (332129111)`) - `vr_tributos_diretos (32)`
- receita_total = `receita_operacional` - `vr_conta_61 (61 impostos/participacoes)`
- despesas_administrativas = `vr_desp_administrativas (46)` - `vr_desp_comerciais_promocoes (464)`
- despesas_assistenciais = `vr_eventos_liquidos (41)` + `vr_outras_desp_oper (442129119)`
- despesas_comerciais = `vr_desp_comerciais (43)` + `vr_desp_comerciais_promocoes (464)`
- resultado_operacional = `receita_total` - `despesas_administrativas` - `despesas_assistenciais` - `despesas_comerciais`
- resultado_modo_uniodonto_base = `resultado_operacional`
- prestadores = `qt_prestadores`
- beneficiarios = `qt_beneficiarios`
- beneficiarios_prev = `prev_qt_beneficiarios`
- meses_no_periodo = `trimestre * 3` (periodo acumulativo)
- dias_uteis_no_periodo = `meses_no_periodo * 22`
- horas_uteis_no_periodo = `dias_uteis_no_periodo * 8`
- semanas_uteis_no_periodo = `dias_uteis_no_periodo / 5`

## 2. Indicadores Operacionais (kpis)

**Indicador DAmU** (Despesa Administrativa Modo Uniodonto) = `despesas_administrativas` / `receita_operacional` * `100`
Regra especial reg_ans 314315: `(46 - 464 - 332189111) / receita_operacional * 100`

**Indicador DMmU** (Sinistralidade Modo Uniodonto) = `despesas_assistenciais` / `receita_operacional` * `100`

**Indicador DCmU** (Despesa Comercial Modo Uniodonto) = `despesas_comerciais` / `receita_operacional` * `100`

**Indicador REmU** (Resultado Modo Uniodonto) = `resultado_operacional` / `receita_total` * `100`

## 3. KPIs

ranking_operacional = `peso_assistencial + peso_administrativo + peso_comercial + peso_resultado + peso_liquidez_imediata + peso_liquidez_corrente + peso_pmrc + peso_pmpg`

icu_score = `0.55 * peso_assistencial + 0.35 * peso_administrativo + 0.05 * peso_comercial + 0.05 * peso_resultado`

beneficiarios_crescimento_pct = `((beneficiarios - beneficiarios_prev) / beneficiarios_prev) * 100`

icu_operacional = `resultado_modo_uniodonto_base / receita_total * 100`

indice_resultado_pct = `resultado_modo_uniodonto_base / receita_total * 100`

despesa_adm_por_ano = `despesas_administrativas / (meses_no_periodo / 12)`

despesa_adm_por_mes = `despesas_administrativas / meses_no_periodo`

despesa_adm_por_semana = `despesas_administrativas / semanas_uteis_no_periodo`

despesa_adm_por_dia = `despesas_administrativas / dias_uteis_no_periodo`

despesa_adm_por_hora = `despesas_administrativas / horas_uteis_no_periodo`

sinistralidade_ano = `(41 + 442129119) / (meses_no_periodo / 12)`

sinistralidade_mes = `(41 + 442129119) / meses_no_periodo`

sinistralidade_semana = `(41 + 442129119) / semanas_uteis_no_periodo`

sinistralidade_dia = `(41 + 442129119) / dias_uteis_no_periodo`

sinistralidade_hora = `(41 + 442129119) / horas_uteis_no_periodo`

receita_assistencial_ano = `(31 + 332129111 - 32) / (meses_no_periodo / 12)`

receita_assistencial_mes = `(31 + 332129111 - 32) / meses_no_periodo`

receita_assistencial_semana = `(31 + 332129111 - 32) / semanas_uteis_no_periodo`

receita_assistencial_dia = `(31 + 332129111 - 32) / dias_uteis_no_periodo`

receita_assistencial_hora = `(31 + 332129111 - 32) / horas_uteis_no_periodo`

repasse_prestador_ano = `despesas_assistenciais / (prestadores * (meses_no_periodo / 12))`

repasse_prestador_mes = `despesas_assistenciais / (prestadores * meses_no_periodo)`

repasse_prestador_semana = `despesas_assistenciais / (prestadores * semanas_uteis_no_periodo)`

repasse_prestador_dia = `despesas_assistenciais / (prestadores * dias_uteis_no_periodo)`

repasse_prestador_hora = `despesas_assistenciais / (prestadores * horas_uteis_no_periodo)`

receita_prestador_ano = `receita_operacional / (prestadores * (meses_no_periodo / 12))`

receita_prestador_mes = `receita_operacional / (prestadores * meses_no_periodo)`

receita_prestador_semana = `receita_operacional / (prestadores * semanas_uteis_no_periodo)`

receita_prestador_dia = `receita_operacional / (prestadores * dias_uteis_no_periodo)`

receita_prestador_hora = `receita_operacional / (prestadores * horas_uteis_no_periodo)`

custo_adm_prestador_ano = `vr_desp_administrativas (46) / prestadores`

custo_adm_prestador_mes = `vr_desp_administrativas (46) / prestadores`

custo_adm_prestador_semana = `vr_desp_administrativas (46) / prestadores`

custo_adm_prestador_dia = `vr_desp_administrativas (46) / prestadores`

custo_adm_prestador_hora = `vr_desp_administrativas (46) / prestadores`

liquidez_corrente = `vr_ativo_circulante (12) / vr_passivo_circulante (21)`

pmcr = `(vr_creditos_operacoes_saude (1231) * dias do período) / vr_contraprestacoes_pre (311121)`

pmpe = `(vr_eventos_a_liquidar (2111) * dias do período) / vr_eventos_liquidos (41)`

liquidez_imediata = `(vr_conta_1213 + vr_conta_1214 + vr_conta_122) / vr_passivo_circulante (21)`

emprestimos_parcelamentos = `abs(vr_conta_237) + abs(vr_conta_217)`

provisoes_tributarias_civeis_trabalhistas = `vr_conta_216 + vr_conta_236`

## 4. Regras de peso (Indicadores Operacionais)

### 4.1) indice_despesas_administrativas_pct (peso_administrativo)

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

### 4.2) indice_despesas_assistenciais_pct (peso_assistencial)

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

### 4.3) indice_despesas_comerciais_pct (peso_comercial)

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

### 4.4) indice_resultado_pct (peso_resultado)

- <= -7.50% -> -15
- -7.49% a -5.00% -> -12
- -4.99% a -2.50% -> -9
- -2.49% a -1.00% -> -6
- -0.99% a -0.01% -> -3
- 0.00% a 0.99% -> 0
- 1.00% a 2.49% -> 3
- 2.50% a 4.99% -> 6
- 5.00% a 7.49% -> 9
- 7.50% a 9.99% -> 12
- >= 10.00% -> 15

### 4.5) liquidez_corrente (peso_liquidez_corrente)

- < 1.00 -> -10
- 1.00 -> 0
- 1.01 a 1.50 -> 3
- 1.51 a 2.00 -> 6
- 2.01 a 2.50 -> 9
- >= 2.51 -> 10

### 4.6) pmpg (peso_pmpg)

- <= 39 -> 10
- 40 a 49 -> 8
- 50 a 59 -> 6
- 60 -> 4
- >= 61 -> 0

### 4.7) pmrc (peso_pmrc)

- <= 39 -> 10
- 40 a 49 -> 8
- 50 a 59 -> 6
- 60 -> 4
- >= 61 -> 0

### 4.8) liquidez_imediata (peso_liquidez_imediata)

- <= 0.20 -> 0
- 0.21 a 0.40 -> 4
- 0.41 a 0.60 -> 5
- 0.61 a 0.80 -> 6
- 0.81 a 1.00 -> 7
- 1.01 a 1.50 -> 8
- 1.51 a 2.49 -> 9
- >= 2.50 -> 10

Observacoes:

- Quando o denominador e 0 ou null, o indicador fica null
- Percentuais sao expressos em % (0 a 100).
- Remover os indicadores: **Sinistro mensal per capta (R$), Ticket médio mensal (R$), Empréstimos e parcelamentos** do dashboard RN518 (eles vão para o Modo Uniodonto)
- Os períodos são acumulativos, ou seja t1 = 3 meses; t2 = 6 meses, t3 = 9 meses, t4 = 12 meses do ano
