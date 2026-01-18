Relatório de Horas – ANS Dashboard
Período reportado: desenvolvimento concluído até 14/02/2025 
Distribuição Geral das 227h já executadas

Categoria
Horas
Descrição geral
Planejamento
50h
Definição de escopo, arquitetura de dados (bronze/prata/ouro), indicadores e estratégias de segurança.
Reuniões
32h
Alinhamentos com Uniodontos, workshops regulatórios e checkpoints técnicos com TI/contabilidade.
Desenvolvimento
145h
Implementação ponta a ponta: ingestão ANS, pipelines bronze-prata-ouro, viewtables, fórmulas, testes e UI.
Total entregue
227h





Tabela de horas e valores (R$150/h)
Módulo
Principais entregas
Horas
Valor
Planejamento regulatório e arquitetura de dados
Mapeamento RN 518/472/574/630, dicionário e desenho bronze/prata/ouro (documentacao/*.md)
50h
R$ 7.500,00
Reuniões e governança
Kickoffs/BI/contabilidade/TI, decisões de hospedagem e segurança
32h
R$ 4.800,00
Ingestão de dados ANS
Scripts de importação CSV/Parquet e organização de public/data/
20h
R$ 3.000,00
Camada Bronze
Staging/tipagem/normalização inicial dos demonstrativos
18h
R$ 2.700,00
Camada Prata
Normalização, dimensões auxiliares e filtros consistentes (dataService, views)
16h
R$ 2.400,00
Camada Ouro
Consolidação de métricas e agregações prontas para visualização
12h
R$ 1.800,00
Materialização e viewtables
scripts/materialize_metrics.js, views prontas para consultas repetidas
10h
R$ 1.500,00
Fórmulas de indicadores
Tradução das fórmulas ANS para SQL/metricFormulas e arredondamentos
18h
R$ 2.700,00
Reconciliação com números ANS
Comparação dashboard x valores oficiais e registro de desvios
12h
R$ 1.800,00
Testes de consultas e API
Exercícios via /api/query, validação de filtros e cenários extremos
8h
R$ 1.200,00
Agrupamentos/comparações
Ranking, pares, séries históricas e segmentações no frontend
12h
R$ 1.800,00
Ajustes visuais e gráficos
Escalas/cores/tooltips, revisão responsiva e componentes atualizados
8h
R$ 1.200,00
Otimizações de API e operação
Revisão do Express/proxy, logs/limites, scripts start-dashboard.sh/systemd
11h
R$ 1.650,00
Total
Horas executadas
227h
R$ 34.050,00



1. Planejamento – 50h
Análise documental e regulatória (18h)

Leitura cruzada da RN 518, RN 472, RN 574, RN 630 e manuais (documentacao/*.md) para mapear todos os indicadores exigidos pela ANS.
Mapeamento dos indicadores utilizados no painel (documentacao/diagnostico-ans-dashboard.md) e comparação com as fórmulas oficiais.

Desenho da arquitetura de dados bronze/prata/ouro (14h)

Definição das camadas de staging, normalização e métricas enriquecidas para garantir rastreabilidade do CSV/Parquet bruto até os indicadores exibidos.
Planejamento de versionamento das tabelas no PostgreSQL, tamanho dos datasets em public/data/ e estratégias de materialização (viewtables e materialize_metrics.js).

Planejamento de indicadores e validação cruzada (10h)

Priorização dos KPIs revisados com as áreas de negócio, garantindo cobertura de solvência, provisões e desempenho econômico-financeiro conforme a ANS cobra.
Definição do dicionário de dados e da matriz de testes comparando os números calculados internamente com os números auditáveis pela ANS.

Planejamento de segurança, deploy e governança (8h)

Avaliação do uso atual de npm run dev, exposição do endpoint /api/query e definição de plano para backend endurecido (vide riscos 1 e 4 do diagnóstico).
Preparação do roteiro de implantação (PM2/systemd), rotação de segredos (ecosystem.config.cjs, server/index.js) e checklist de governança.


2. Reuniões – 32h
Kickoffs e alinhamentos estratégicos com Uniodontos (8h)

Apresentação do escopo, validação da necessidade de alimentar dados contábeis mensais e discussão sobre segregação por base (ANS x Uniodontos).

Workshops regulatórios e contábeis (10h)

Sessões conjuntas com contabilidade e compliance para traduzir normas ANS em variáveis SQL, inclusive esclarecimentos sobre indicadores de solvência e provisões técnicas.
Levantamento dos formatos de arquivos publicados pela ANS e definição de responsabilidades sobre atualização.

Revisões quinzenais com diretoria e BI (8h)

Demonstrações do dashboard em ambiente npm run dev, coleta de feedback sobre UX, filtros e priorização dos gráficos.
Revisão de aderência dos cálculos (diferenças ainda abertas foram catalogadas para ajustes de fórmula).

Coordenação técnica com TI/infra (6h)

Definição de hospedagem, base PostgreSQL compartilhada e restrições de acesso à API/proxy SQL.
Discussões sobre trilha de segurança (VPN, firewall, autenticação futura) com base nos riscos descritos no diagnóstico.


3. Desenvolvimento – 145h
Ingestão dos dados contábeis ANS (20h)

Download automatizado da base aberta (CSV/Parquet) e conferência de integridade; scripts em scripts/*.py adaptados para lidar com datasets >1GB.
Organização do storage temporário (public/data/) e preparo do db/export_indicadores.sql para bootstrap do PostgreSQL.

Camada Bronze – staging e saneamento (18h)

Carregamento bruto dos demonstrativos em tabelas staging, com aplicação de tipagem e padronização de cabeçalhos.
Tratamento de encoding e normalização de datas/trimestres para suportar filtros múltiplos (anos, trimestres, registro ANS).

Camada Prata – normalização e enriquecimento (16h)

Unificação de chaves (registro ANS, CNPJ, UF), criação de dimensões auxiliares e correção de discrepâncias com as tabelas referenciais.
Implementação dos filtros dinâmicos usados em src/lib/dataService.js garantindo consistência para filters.regAns, filters.anos e filters.trimestres.

Camada Ouro – indicadores consolidados (12h)

Construção de tabelas métricas com agregações trimestrais/anuais, aplicação de regras de negócio (por exemplo, exclusão de registros incompletos).
Preparação dos dados para visualizações (ranking, séries históricas e cards de destaque).

Materialização de viewtables e pipelines (10h)

Escrita de viewtables consumidas pelo frontend e automação via scripts/materialize_metrics.js para garantir desempenho em consultas repetitivas.
Ajustes na leitura síncrona do db/export_indicadores.sql para garantir que a API suba com as views já consolidadas.

Fórmulas dos indicadores e lógica de cálculo (18h)

Tradução dos manuais ANS para SQL: fórmulas de sinistralidade, margem operacional, capital regulatório, provisões etc.
Implementação de arredondamentos, tratamento de divisões por zero e alinhamento dos nomes exibidos no dashboard.

Reconciliação com números ANS (12h)

Comparação entre resultados do dashboard e valores oficiais, identificando diferenças e ajustes necessários.
Registro dos desvios no diagnóstico para rastreabilidade futura e evidenciação dos pontos críticos.

Testes de consultas e validação funcional (8h)

Exercícios de consulta via /api/query, filtros combinados e cenários extremos a fim de antecipar abusos e checar performance.
Mock de uploads para confirmar mensagens de erro do card “Atualizar arquivo base” em modo PostgreSQL (gap nº6).

Agrupamentos, comparações e segmentações (12h)

Configuração dos agrupamentos por operadora, porte e região; implementação das comparações históricas no frontend.
Ajustes de ordenação e paginação para garantir experiência fluida com filtros complexos.

Ajustes visuais e gráficos (8h)

Correção de escalas, cores e tooltips nos gráficos principais; revisão do layout responsive.
Avaliação da viabilidade de reintroduzir componentes como Trend/Scatter (identificados como código morto).

Otimizações de API e performance operacional (11h)

Revisão do proxy Express (server/index.js), implementação de logs, limites básicos e mensagens de erro mais claras.
Preparação de scripts start-dashboard.sh/systemd e testes de execução conjunta npm run dev para suportar a operação atual.


Próximos passos estimados – 200h (a executar)
Frentes futuras
Horas
Detalhamento
Planejamento evolutivo
60h
Arquitetura para bases segregadas (ANS x Uniodontos), desenho do fluxo mensal, revisão de segurança e definição de SLAs de hospedagem/observabilidade.
Reuniões e governança
30h
Workshops com cada Uniodonto regional, alinhamentos jurídicos sobre LGPD e sessões com TI para escolher provedores de identidade e stack de hospedagem.
Desenvolvimento e implantação incremental
110h


Construção dos pipelines paralelos, sincronização mensal automática, controles de acesso, hardening do backend e adequações de hospedagem/monitoramento.
Total estimado
200h



Escopo detalhado dos 200h planejados
Base segregada e sincronizada: criar pipelines que suportem múltiplos tenants (ANS e cada Uniodonto) compartilhando as mesmas views, com isolamento lógico e rotinas mensais de ingestão.
Alimentação mensal automatizada: desenvolver agente/scheduler que puxe as entregas contábeis, valide schema e atualize as camadas bronze/prata/ouro sem intervenção manual.
Controle de acesso e segurança: substituir o endpoint /api/query por APIs específicas, incluir autenticação/autorização, secrets externos e camadas de firewall/VPN conforme riscos 1 a 5.
Governança e auditoria de dados: implementar trilhas de auditoria, versionamento de datasets e alertas para divergências com números oficiais.
Hospedagem e observabilidade: migrar do npm run dev permanente para um pipeline com build (npm run build), servir dist/ via Nginx ou similar, e subir o backend Express endurecido (PM2/systemd).
Experiência do usuário e agente regulatório: decidir sobre a ativação do componente AgentAssistant, desenhar limites de consumo e integrar com processos de governança antes do lançamento oficial.



Este relatório consolida o esforço já realizado (227h) e antecipa o investimento adicional de 200h necessário para entregar as adequações descritas no diagnóstico técnico.

