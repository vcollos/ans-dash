# Dossiê Técnico – ANS Dashboard

## I. Diagnóstico Arquitetural
- **Stack atual:** React/Vite no frontend; Express + `pg` no backend; PostgreSQL com views `indicadores_curados` e materialized view `indicadores_metricas`.
- **Fluxo de dados:** importação via `scripts/import_parquet_dataset.py` ou `import_demonstracoes.py` para `demonstracoes_contabeis`; agregações e deltas em `db/views.sql`; materialização de métricas de `src/lib/metricFormulas.js` via `scripts/materialize_metrics.js`; frontend consulta `/api/query` com SQL montado no cliente (`src/lib/dataService.js`).
- **Infra:** serviço systemd/PM2 roda `npm run dev` (Vite + API juntos); upload middleware em `vite.config.js` grava arquivos em `public/data`.
- **Fragilidades principais:** `/api/query` executa SQL arbitrário sem auth; Vite dev server exposto em produção; datasets sensíveis em `public/data`; credenciais/IDs hardcoded (`DATABASE_URL`, Vector Store/Workflow); endpoint `/api/agent` ativo sem UI; upload não suportado no modo Postgres mas UI ainda exibe botão.

## II. Diagnóstico Analítico vs ANS
- **Implementado:** DM, DA, DC, DOP, IRF, LC, CT/PL, PMCR, PMPE, ROE, margem líquida em `metricFormulas.js`.
- **Gaps RN 518/DIOPS:** sinistralidade acumulada repete fórmula pontual; sinistralidade e DM_TRIM usam saldos finais/deltas restritos ao ano; ausência de COMB, PMPP, índices de despesas consolidados, RBC/margem de solvência efetiva, validação de notas metodológicas; percentis sem estratificação por porte/modalidade.
- **Gaps RN 574 (provisões):** provisões tratadas como soma única; sem PESL, PEONA, PPCNG, PPNG-RVNE, PRL; cobertura compara apenas AG/PT.
- **Gaps RN 472 (plano de contas):** tabela `plano_de_contas` não usada para validar natureza/agrupamentos ou alimentar dashboards.
- **Governança RN 518/630:** sem PPA-DIOPS, trilha de auditoria, alerts de risco (LC<1, cobertura<1, CT/PL>1), nem ficha regulatória exportável.

## III. Evolução Estatística e ML (pontos de acoplamento)
- **Concentração (Pareto/Gini/power-law):** nova view `indicadores_concentracao` agregando sinistros/contraprestações por operadora e por grupo; endpoint `/api/stats/concentracao`; gráficos Pareto 80/20 e log-log no frontend.
- **Regressões:** job Python (`scripts/modeling/fit_regressions.py`) lê `indicadores_metricas`, ajusta regressão linear/robusta/log-log para DM e provisões; salva coeficientes em `model_regressao`; endpoint `/api/models/regressao` retorna previsão/explicabilidade.
- **Previsões:** forecasts trimestrais (ARIMA/ETS/Prophet ou regressão bayesiana) para DM e provisões gravados em `forecast_metricas` com IC; consumo em cards/trends com bandas.
- **Stress testing:** função SQL parametrizada para recomputar COMB/LC/CT-PL/DM sob choques (ex.: +10% 41, -5% 311, +5% 32); UI com sliders.
- **Anomalias:** Isolation Forest/z-score robusto sobre DM, PMPE, PMCR, provisões; tabela `indicadores_alertas` com flags por período; badges no dashboard.
- **Odonto aplicado:** Gini/Pareto por contrato/cooperado; outliers de custo médio de evento; segmentação por porte/modalidade/uniodonto; uso de grupos de contas odontológicas quando disponíveis.

## IV. Evolução do Dashboard
- **Novas visualizações:** Pareto e log-log (escala log-log) para sinistros/contraprestações; heatmaps regulatórios (LC, cobertura, COMB, DM) com thresholds; histograma de cauda pesada com expoente α; stress tester interativo.
- **Cartão regulatório:** reintroduzir `RegulatoryScorecard` em `src/App.jsx`; percentis estratificados por porte/modalidade; mostrar n de pares e faixas (Q1/Med/Q3).
- **UX/legibilidade:** exibir fonte ativa (Postgres vs arquivo); esconder upload em modo DB; ficha DIOPS exportável com fórmulas e referências normativas.

## V. Arquitetura Futura
- **Camadas:** (1) Ingestão/qualidade aplicando RN 472/574 (Airflow/DBT ou scripts Python); (2) Modelo de dados normalizado (`fato_contabil`, `dim_operadora`, `dim_conta`, `fat_provisoes`); (3) Serviço de indicadores ANS (Node/Go) com endpoints específicos, SQL parametrizado; (4) Motor de provisões/solvência (PESL/PEONA/PPCNG/PPNG-RVNE/RBC/stress); (5) Serviço de ML/estatística offline escrevendo previsões/alertas; (6) Frontend estático servindo APIs dedicadas; (7) Segurança: auth/token ou OIDC, rate limiting, logging estruturado, secrets via env, assets servidos por Nginx/CloudFront.

## VI. Plano de Implementação
1. **Contenção imediata:** revogar segredos; bloquear/desativar `/api/query` público; servir build estático (`npm run build && vite preview` ou Nginx) e rodar API isolada; remover datasets de `public/`.
2. **Conformidade ANS básica:** aplicar RN 472 no ETL (natureza/agrupamentos do plano de contas); corrigir fórmulas DM/DA/DC/PMCR/PMPE/ROE/LC; adicionar COMB e cobertura de provisões granular; re-materializar `indicadores_metricas`.
3. **Provisões RN 574:** modelar PESL, PEONA, PPCNG, PPNG-RVNE, PRL e RBC; calcular cobertura por subconta e exposição a risco; publicar em API/dash.
4. **Governança RN 518/630:** PPA-DIOPS (auditoria de consistência), alerts (LC<1, cobertura<1, CT/PL>1), ficha regulatória por período; reativar cartão regulatório com percentis por porte/modalidade.
5. **Estatística avançada:** criar view de concentração + endpoint e gráficos Pareto/log-log; heatmaps; stress tester de contas 41/311/32.
6. **ML/previsão:** jobs de forecast/alertas; endpoints de previsões; UI com bandas de confiança e badges de anomalia.
7. **Operação/CI:** testes mínimos (SQL smoke + e2e de API), pipeline de build/deploy, métricas e tracing; limpar código morto e alinhar documentação/UX de upload.
