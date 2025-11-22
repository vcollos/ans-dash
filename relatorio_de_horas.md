# Relatório de Horas – ans-dashboard

_Período reportado: desenvolvimento concluído até 14/02/2025 (diagnóstico em `documentacao/diagnostico-ans-dashboard.md`)._

## Distribuição Geral das 227h já executadas

| Categoria        | Horas | Descrição geral                                                                                          |
|------------------|-------|-----------------------------------------------------------------------------------------------------------|
| Planejamento     | 50h   | Definição de escopo, arquitetura de dados (bronze/prata/ouro), indicadores e estratégias de segurança.    |
| Reuniões         | 32h   | Alinhamentos com Uniodontos, workshops regulatórios e checkpoints técnicos com TI/contabilidade.          |
| Desenvolvimento  | 145h  | Implementação ponta a ponta: ingestão ANS, pipelines bronze-prata-ouro, viewtables, fórmulas, testes e UI.|
| **Total entregue** | **227h** |                                                                                                                                   |

---

## 1. Planejamento – 50h

1. **Análise documental e regulatória (18h)**  
   - Leitura cruzada da RN 518, RN 472, RN 574, RN 630 e manuais (`documentacao/*.md`) para mapear todos os indicadores exigidos pela ANS.  
   - Mapeamento dos indicadores utilizados no painel (`documentacao/diagnostico-ans-dashboard.md`) e comparação com as fórmulas oficiais.

2. **Desenho da arquitetura de dados bronze/prata/ouro (14h)**  
   - Definição das camadas de staging, normalização e métricas enriquecidas para garantir rastreabilidade do CSV/Parquet bruto até os indicadores exibidos.  
   - Planejamento de versionamento das tabelas no PostgreSQL, tamanho dos datasets em `public/data/` e estratégias de materialização (`viewtables` e `materialize_metrics.js`).

3. **Planejamento de indicadores e validação cruzada (10h)**  
   - Priorização dos KPIs revisados com as áreas de negócio, garantindo cobertura de solvência, provisões e desempenho econômico-financeiro conforme a ANS cobra.  
   - Definição do dicionário de dados e da matriz de testes comparando os números calculados internamente com os números auditáveis pela ANS.

4. **Planejamento de segurança, deploy e governança (8h)**  
   - Avaliação do uso atual de `npm run dev`, exposição do endpoint `/api/query` e definição de plano para backend endurecido (vide riscos 1 e 4 do diagnóstico).  
   - Preparação do roteiro de implantação (PM2/systemd), rotação de segredos (`ecosystem.config.cjs`, `server/index.js`) e checklist de governança.

---

## 2. Reuniões – 32h

1. **Kickoffs e alinhamentos estratégicos com Uniodontos (8h)**  
   - Apresentação do escopo, validação da necessidade de alimentar dados contábeis mensais e discussão sobre segregação por base (ANS x Uniodontos).

2. **Workshops regulatórios e contábeis (10h)**  
   - Sessões conjuntas com contabilidade e compliance para traduzir normas ANS em variáveis SQL, inclusive esclarecimentos sobre indicadores de solvência e provisões técnicas.  
   - Levantamento dos formatos de arquivos publicados pela ANS e definição de responsabilidades sobre atualização.

3. **Revisões quinzenais com diretoria e BI (8h)**  
   - Demonstrações do dashboard em ambiente `npm run dev`, coleta de feedback sobre UX, filtros e priorização dos gráficos.  
   - Revisão de aderência dos cálculos (diferenças ainda abertas foram catalogadas para ajustes de fórmula).

4. **Coordenação técnica com TI/infra (6h)**  
   - Definição de hospedagem, base PostgreSQL compartilhada e restrições de acesso à API/proxy SQL.  
   - Discussões sobre trilha de segurança (VPN, firewall, autenticação futura) com base nos riscos descritos no diagnóstico.

---

## 3. Desenvolvimento – 145h

1. **Ingestão dos dados contábeis ANS (20h)**  
   - Download automatizado da base aberta (CSV/Parquet) e conferência de integridade; scripts em `scripts/*.py` adaptados para lidar com datasets >1GB.  
   - Organização do storage temporário (`public/data/`) e preparo do `db/export_indicadores.sql` para bootstrap do PostgreSQL.

2. **Camada Bronze – staging e saneamento (18h)**  
   - Carregamento bruto dos demonstrativos em tabelas staging, com aplicação de tipagem e padronização de cabeçalhos.  
   - Tratamento de encoding e normalização de datas/trimestres para suportar filtros múltiplos (anos, trimestres, registro ANS).

3. **Camada Prata – normalização e enriquecimento (16h)**  
   - Unificação de chaves (registro ANS, CNPJ, UF), criação de dimensões auxiliares e correção de discrepâncias com as tabelas referenciais.  
   - Implementação dos filtros dinâmicos usados em `src/lib/dataService.js` garantindo consistência para `filters.regAns`, `filters.anos` e `filters.trimestres`.

4. **Camada Ouro – indicadores consolidados (12h)**  
   - Construção de tabelas métricas com agregações trimestrais/anuais, aplicação de regras de negócio (por exemplo, exclusão de registros incompletos).  
   - Preparação dos dados para visualizações (ranking, séries históricas e cards de destaque).

5. **Materialização de viewtables e pipelines (10h)**  
   - Escrita de `viewtables` consumidas pelo frontend e automação via `scripts/materialize_metrics.js` para garantir desempenho em consultas repetitivas.  
   - Ajustes na leitura síncrona do `db/export_indicadores.sql` para garantir que a API suba com as views já consolidadas.

6. **Fórmulas dos indicadores e lógica de cálculo (18h)**  
   - Tradução dos manuais ANS para SQL: fórmulas de sinistralidade, margem operacional, capital regulatório, provisões etc.  
   - Implementação de arredondamentos, tratamento de divisões por zero e alinhamento dos nomes exibidos no dashboard.

7. **Reconciliação com números ANS (12h)**  
   - Comparação entre resultados do dashboard e valores oficiais, identificando diferenças e ajustes necessários.  
   - Registro dos desvios no diagnóstico para rastreabilidade futura e evidenciação dos pontos críticos.

8. **Testes de consultas e validação funcional (8h)**  
   - Exercícios de consulta via `/api/query`, filtros combinados e cenários extremos a fim de antecipar abusos e checar performance.  
   - Mock de uploads para confirmar mensagens de erro do card “Atualizar arquivo base” em modo PostgreSQL (gap nº6).

9. **Agrupamentos, comparações e segmentações (12h)**  
   - Configuração dos agrupamentos por operadora, porte e região; implementação das comparações históricas no frontend.  
   - Ajustes de ordenação e paginação para garantir experiência fluida com filtros complexos.

10. **Ajustes visuais e gráficos (8h)**  
    - Correção de escalas, cores e tooltips nos gráficos principais; revisão do layout responsive.  
    - Avaliação da viabilidade de reintroduzir componentes como Trend/Scatter (identificados como código morto).

11. **Otimizações de API e performance operacional (11h)**  
    - Revisão do proxy Express (`server/index.js`), implementação de logs, limites básicos e mensagens de erro mais claras.  
    - Preparação de scripts `start-dashboard.sh`/`systemd` e testes de execução conjunta `npm run dev` para suportar a operação atual.

---

## Próximos passos estimados – 200h (a executar)

| Frentes futuras                           | Horas | Detalhamento                                                                                                                                             |
|-------------------------------------------|-------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| Planejamento evolutivo                    | 60h   | Arquitetura para bases segregadas (ANS x Uniodontos), desenho do fluxo mensal, revisão de segurança e definição de SLAs de hospedagem/observabilidade.   |
| Reuniões e governança                     | 30h   | Workshops com cada Uniodonto regional, alinhamentos jurídicos sobre LGPD e sessões com TI para escolher provedores de identidade e stack de hospedagem.  |
| Desenvolvimento e implantação incremental | 110h  | Construção dos pipelines paralelos, sincronização mensal automática, controles de acesso, hardening do backend e adequações de hospedagem/monitoramento. |
| **Total estimado**                        | **200h** |                                                                                                                                                          |

### Escopo detalhado dos 200h planejados
- **Base segregada e sincronizada**: criar pipelines que suportem múltiplos tenants (ANS e cada Uniodonto) compartilhando as mesmas views, com isolamento lógico e rotinas mensais de ingestão.  
- **Alimentação mensal automatizada**: desenvolver agente/scheduler que puxe as entregas contábeis, valide schema e atualize as camadas bronze/prata/ouro sem intervenção manual.  
- **Controle de acesso e segurança**: substituir o endpoint `/api/query` por APIs específicas, incluir autenticação/autorização, secrets externos e camadas de firewall/VPN conforme riscos 1 a 5.  
- **Governança e auditoria de dados**: implementar trilhas de auditoria, versionamento de datasets e alertas para divergências com números oficiais.  
- **Hospedagem e observabilidade**: migrar do `npm run dev` permanente para um pipeline com build (`npm run build`), servir `dist/` via Nginx ou similar, e subir o backend Express endurecido (PM2/systemd).  
- **Experiência do usuário e agente regulatório**: decidir sobre a ativação do componente `AgentAssistant`, desenhar limites de consumo e integrar com processos de governança antes do lançamento oficial.

---

_Este relatório consolida o esforço já realizado (227h) e antecipa o investimento adicional de 200h necessário para entregar as adequações descritas no diagnóstico técnico._
