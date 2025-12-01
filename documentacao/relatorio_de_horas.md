# Relatório de Horas – ans-dashboard (jan–fev/2025)

_Relatório para prestação de contas do desenvolvimento, planejamento e implantação do painel ANS/RN 518. Valor total: **R$40.000** (2× R$20.000 em 10/jan e 10/fev). Rate máximo praticado: **R$100/h** → **400h** totais. Todo o código-fonte será entregue e hospedado em VM da própria Uniodonto. Manutenções futuras poderão ser feitas pela equipe Uniodonto ou por nós a **R$150/h**, somente quando necessário e mediante aprovação prévia._

---

## Condições comerciais e entrega
- **Total do projeto:** R$40.000 (400h × R$100/h).  
- **Pagamento:** 2 parcelas de R$20.000 com vencimentos em 10/jan e 10/fev.  
- **Entrega:** código-fonte completo (frontend Vite/React, API Express, scripts de dados, views SQL) + implantação em VM da Uniodonto.  
- **Manutenção opcional:** R$150/h, apenas sob demanda e após aprovação.  
- **Escopo coberto:** ingestão ANS, camadas bronze/prata/ouro, views e materialized views, fórmulas dos indicadores, API `/api/query` e `/api/indicadores.csv`, frontend com filtros/gráficos, agente regulatório (ChatGPT) e preparação de deploy/segurança conforme `documentacao/DOCUMENTATION.md` e `documentacao/diagnostico-ans-dashboard.md`.

---

## Resumo de horas por frente (400h)

| Frente                                    | Horas | Descrição                                                                                                              |
|-------------------------------------------|-------|-------------------------------------------------------------------------------------------------------------------------|
| Planejamento & alinhamento regulatório    | 60h   | Escopo, leitura de RN 472/518/574/630, matriz de indicadores, critérios ANS e priorização com áreas de negócio.        |
| Estruturação & arquitetura (dados/infra)  | 80h   | Desenho bronze/prata/ouro, definição de views, índices, versionamento de datasets, estratégia de materialização.       |
| Programação backend & integrações         | 70h   | API Express (`/api/query`, `/api/indicadores.csv`), conexão Postgres, export SQL, upload middleware e logs.            |
| Programação frontend & UX                 | 65h   | Filtros, controllers (`useDashboardController`), `dataService`, componentes de UI e responsividade.                    |
| Testes, validação e homologação           | 55h   | Conferência dos indicadores vs. ANS, performance de consultas, cenários extremos, revisões funcionais com usuários.    |
| Documentação & governança                 | 30h   | Atualização de `DOCUMENTATION.md`, guias de operação, dicionário de métricas, instruções de deploy/systemd.           |
| Gestão, reuniões e coordenação            | 40h   | Kickoffs, workshops com Uniodontos, checkpoints técnicos/contábeis, alinhamentos com TI/infra e diretoria.             |
| **Total**                                 | **400h** |                                                                                                                         |

---

## Cronograma financeiro (jan–fev/2025)

| Parcela | Valor   | Data | Observação                                               |
|---------|---------|------|----------------------------------------------------------|
| 1/2     | R$20.000| 10/jan | Liberação após consolidação de arquitetura e plano de dados. |
| 2/2     | R$20.000| 10/fev | Liberação após entrega completa e handoff em VM Uniodonto.    |

---

## Detalhamento por módulo e entregas (mesmo total de 400h)

| Módulo / Entrega                                                                 | Horas | Detalhe                                                                                                                        |
|----------------------------------------------------------------------------------|-------|---------------------------------------------------------------------------------------------------------------------------------|
| Planejamento regulatório e escopo                                                | 40h   | Leitura das normas (RN 472/518/574/630, PPCNG), definição de KPIs ANS e critérios de cálculo.                                   |
| Modelagem bronze/prata/ouro e arquitetura de dados                               | 70h   | Estruturação das camadas no Postgres, chaves e dimensões, estratégia de versionamento de datasets grandes (`public/data`).      |
| Ingestão e saneamento ANS (scripts Python/Node)                                  | 45h   | Importação CSV/Parquet (DIOPS), tipagem, normalização de datas/trimestres, staging (`demonstracoes_contabeis_staging`).         |
| Views e materialized views de métricas                                           | 45h   | Criação de `indicadores_curados` e `indicadores_metricas`, índices e deltas temporais, preparação do `export_indicadores.sql`.   |
| API Express e exportadores                                                       | 40h   | Endpoints `/api/query`, `/api/indicadores.csv`, `/api/health`, upload middleware de dataset e logs de operação.                 |
| Frontend – filtros, estado e data service                                        | 50h   | `useDashboardController`, `dataService`, construção de queries parametrizadas e sincronização de filtros/periodicidades.        |
| Dashboards e visualizações (KPIs, ranking, séries, tabelas)                      | 45h   | Componentes Chart.js/Recharts, cards de KPI, ranking, tabelas detalhadas, comparações históricas e responsividade.              |
| Agente regulatório (ChatGPT)                                                     | 15h   | Fluxo `AgentAssistant`/`/api/agent`, integração com vector store/Workflow OpenAI e formatação de respostas.                     |
| Deploy, hospedagem e observabilidade                                             | 20h   | Scripts `start-dashboard.sh`/systemd, `npm run build/preview`, logs, preparação para VM dedicada da Uniodonto.                   |
| Segurança e governança                                                           | 15h   | Segregação de credenciais, avaliação de riscos (`/api/query`), recomendações de firewall/VPN, checklists de acesso.             |
| Documentação e handoff                                                           | 15h   | Atualização de `documentacao/DOCUMENTATION.md`, guia de operação, instruções de atualização e transferência de conhecimento.    |
| **Total**                                                                        | **400h** |                                                                                                                                 |

---

## Linha do tempo (10/jan → 10/fev)
- **Semana 1 (10–16/jan):** planejamento regulatório, escopo funcional, desenho da arquitetura de dados e infraestrutura.  
- **Semana 2 (17–23/jan):** ingestão inicial ANS, saneamento bronze, normalização prata e definição das views.  
- **Semana 3 (24–30/jan):** materialized views de métricas, fórmulas dos indicadores, API Express e exportação CSV.  
- **Semana 4 (31/jan–06/fev):** frontend (filtros, dashboards, KPIs, séries), ajustes de UX e responsividade.  
- **Semana 5 (07–10/fev):** testes integrados, homologação com usuários, documentação final e handoff/implantação em VM Uniodonto.

---

## Observações operacionais
- Estrutura principal conforme `documentacao/DOCUMENTATION.md`: Postgres com camadas bronze/prata/ouro, `indicadores_curados/indicadores_metricas`, API Express e frontend Vite/React.  
- Código-fonte completo será entregue; implantação prevista em VM da Uniodonto com pipeline `npm run build` + backend endurecido.  
- Manutenções futuras (quando necessário e aprovadas) serão cobradas a R$150/h, com estimativas apresentadas antes da execução.  
- O relatório segue a limitação de **R$100/h** para o desenvolvimento principal e vincula o valor total aos marcos de 10/jan e 10/fev.
