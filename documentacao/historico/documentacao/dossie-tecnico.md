# Dossiê Técnico – ANS Dashboard

> Documento de visão/roadmap. Muitos itens descritos abaixo são propostas futuras e **não** estão implementados no código atual.

## I. Diagnóstico Arquitetural
- **Stack atual:** React/Vite no frontend; Express + BigQuery no backend; autenticação Firebase.
- **Fluxo de dados:** views/tabelas curadas no BigQuery; consultas via `/api/query` com allowlist; frontend monta filtros/queries em `src/lib/dataService.js`.
- **Infra:** Cloud Run com build estático; API e frontend no mesmo serviço.
- **Fragilidades principais:** dependência de configuração correta do allowlist (`BQ_ALLOWED_VIEWS`), custo de consultas amplas no BigQuery, necessidade de governança de credenciais.

## II. Diagnóstico Analítico vs ANS
- **Implementado:** DM, DA, DC, DOP, IRF, LC, CT/PL, PMCR, PMPE, ROE, margem líquida em `metricFormulas.js`.
- **Gaps RN 518/DIOPS:** sinistralidade acumulada repete fórmula pontual; sinistralidade e DM_TRIM usam saldos finais/deltas restritos ao ano; ausência de COMB, PMPP, índices de despesas consolidados, RBC/margem de solvência efetiva, validação de notas metodológicas; percentis sem estratificação por porte/modalidade.
- **Gaps RN 574 (provisões):** provisões tratadas como soma única; sem PESL, PEONA, PPCNG, PPNG-RVNE, PRL; cobertura compara apenas AG/PT.
- **Gaps RN 472 (plano de contas):** tabela `plano_de_contas` não usada para validar natureza/agrupamentos ou alimentar dashboards.
- **Governança RN 518/630:** sem PPA-DIOPS, trilha de auditoria, alerts de risco (LC<1, cobertura<1, CT/PL>1), nem ficha regulatória exportável.

## III. Evolução Estatística e ML (pontos de acoplamento)
- **Concentração (Pareto/Gini/power-law):** view agregada por operadora; endpoint `/api/stats/concentracao`; gráficos Pareto/log-log.
- **Regressões:** job offline para DM/provisões com regressão robusta; endpoint de consulta de coeficientes.
- **Previsões:** forecasts trimestrais para DM/provisões com bandas de confiança.
- **Stress testing:** função parametrizada para recomputar indicadores sob choques.
- **Anomalias:** Isolation Forest/z-score robusto com flags por período.

## IV. Evolução do Dashboard
- **Novas visualizações:** Pareto, heatmaps regulatórios, histograma de cauda pesada.
- **Cartão regulatório:** percentis estratificados por porte/modalidade; mostrar n de pares e faixas.
- **UX/legibilidade:** indicar fonte ativa (view/snapshot), ficha regulatória exportável com fórmulas e referências.

## V. Arquitetura Futura
- **Camadas:** (1) Ingestão/qualidade (DBT/Airflow); (2) Modelo de dados; (3) Serviço de indicadores com endpoints específicos; (4) Motor de provisões/solvência; (5) Serviço de ML/estatística offline; (6) Frontend estático; (7) Segurança e observabilidade.

## VI. Plano de Implementação
1. **Segurança imediata:** manter allowlist restrito; segredos via Secret Manager; logging estruturado.
2. **Conformidade ANS básica:** corrigir fórmulas DM/DA/DC/PMCR/PMPE/ROE/LC; adicionar COMB e cobertura de provisões granular.
3. **Provisões RN 574:** modelar PESL, PEONA, PPCNG, PPNG-RVNE, PRL e RBC.
4. **Governança RN 518/630:** PPA-DIOPS, alerts e ficha regulatória por período.
5. **Estatística avançada:** concentração, heatmaps, stress tester.
6. **ML/previsão:** jobs e endpoints de previsões/alertas.
7. **Operação/CI:** testes mínimos, pipeline de deploy e monitoração.
