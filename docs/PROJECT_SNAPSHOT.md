# PROJECT_SNAPSHOT

Snapshot técnico gerado a partir do workspace atual em `2026-03-23`, na branch `codex/form-operadora-acl`.

Este documento foi escrito com base no código e nos artefatos atualmente presentes no workspace local. Onde algo não pôde ser comprovado diretamente no código, foi marcado como `NÃO IDENTIFICADO`.

## 1. VISÃO GERAL

### Descrição objetiva do projeto

Aplicação web em `Vite + React` com backend `Express` para análise de dados contábeis/regulatórios de operadoras odontológicas, consumindo dados do `BigQuery` e usando `Firebase Auth` para autenticação.

O frontend entrega:

- indicadores regulatórios da RN 518;
- modo alternativo `Uniodonto` com catálogo próprio de indicadores;
- ranking;
- séries históricas;
- resumo monetário;
- tabela detalhada;
- formulário de upload de demonstrações contábeis para tabela auxiliar.

O backend entrega:

- proxy de consulta controlada ao `BigQuery`;
- validação de `Firebase ID token`;
- ACL por operadora (`reg_ans`);
- exportação CSV;
- upload para tabela auxiliar no BigQuery;
- healthcheck;
- perfil de acesso do usuário.

### Objetivo do sistema

Permitir análise operacional/regulatória de operadoras odontológicas a partir de dados estruturados no BigQuery, com dois recortes principais:

- `RN 518`: indicadores regulatórios/financeiros;
- `Uniodonto`: indicadores operacionais próprios, pesos/score e comparações específicas.

O sistema também permite que uma operadora autorizada envie dados próprios para uma tabela auxiliar, sem sobrescrever a base oficial da ANS.

### Estado atual de versionamento

O workspace atual **não está limpo**. Há mudanças locais não commitadas.

`git branch --show-current`

```text
codex/form-operadora-acl
```

`git status --short` no momento do snapshot:

```text
 M README.md
 M agents.md
 M docker-compose.dev.yml
 M documentacao/DOCUMENTATION.md
 M env/.env.local.example
 M env/.env.local.server.example
 M scripts/dev-local.sh
 M scripts/reload-dev.sh
 M server/index.js
 M src/App.jsx
 D src/components/dashboard/SingularDataImportDialog.jsx
 M src/components/layout/AppHeader.jsx
 M src/lib/auth.js
 M vite.config.js
?? db/create_user_access_table.sql
?? documentacao/politica-operacional-sandbox.md
?? src/components/dashboard/OperadoraDataImportDialog.jsx
?? src/lib/accessProfile.js
```

Implicação prática: **um clone do último commit remoto não representa exatamente o estado atual do workspace**.

### Status atual

#### ✅ Funcionalidades prontas

- Autenticação via `Firebase Auth` com:
  - email/senha;
  - Google popup;
  - link por email.
- Validação backend de `ID token` com `firebase-admin`.
- Perfil de acesso do usuário em `/api/auth/profile`.
- ACL por operadora (`reg_ans`) aplicada no backend:
  - bloqueio de dashboard para usuário sem vínculo;
  - escopo de consulta em `/api/query`;
  - escopo de export CSV;
  - escopo de upload.
- Dashboard com 3 abas:
  - `Indicadores`;
  - `Ranking`;
  - `Gráficos históricos`.
- `Modo Uniodonto` ativo por padrão no frontend.
- Catálogo RN 518 com 22 fórmulas em `src/lib/metricFormulas.js`.
- Catálogo Uniodonto com 43 indicadores em `src/lib/uniodontoMetrics.js`.
- Ranking com:
  - colunas fixas;
  - ordenação;
  - paginação;
  - seletor de colunas visíveis;
  - navegação horizontal.
- Séries históricas:
  - indicadores RN 518;
  - score regulatório;
  - indicadores Uniodonto;
  - gráfico per capita de contraprestações/eventos.
- Resumo monetário hierárquico por árvore de contas.
- Tabela detalhada com layout responsivo.
- Endpoint CSV `/api/indicadores.csv`.
- Upload via formulário `OperadoraDataImportDialog` com:
  - download de template;
  - download de exemplo;
  - parse no cliente com `xlsx`;
  - envio para tabela auxiliar no BigQuery.
- Ambiente local com:
  - `npm run dev`;
  - `npm run dev:local`;
  - Docker dev via `docker-compose.dev.yml`.
- Build de produção via `Dockerfile` + `cloudbuild.yaml`.

#### ⚠️ Parcialmente prontas

- Fluxo de upload/ACL por operadora está implementado no workspace atual, mas ainda **não está consolidado em commit limpo**.
- Exportação de tabela no frontend existe em `src/components/dashboard/ExportMenu.jsx` e `src/lib/export.js`, mas **não está montada em `App.jsx`**.
- Painel de correlação Uniodonto existe em `src/components/dashboard/UniodontoCorrelationPanel.jsx`, mas **não está montado na UI atual**.
- Funções `fetchScatter`, `fetchTableColumns` e `getMetricsCatalog` existem em `src/lib/dataService.js`, mas **não há uso identificado na UI atual**.
- A topologia de datasets está parcialmente divergente entre:
  - exemplos locais (`dash_ans`);
  - defaults do backend (`dash_ans`);
  - `cloudbuild.yaml` (`BQ_DATASET=dash_ans`, com compatibilidade via views no `dash_ans`).

#### ❌ Quebradas / não implementadas

- Não existe pasta dedicada `services/`, `infra/` ou `types/`. Essas responsabilidades estão distribuídas; isso não quebra a aplicação, mas significa que essas camadas **não estão formalmente implementadas como módulos separados**.
- Não existe framework de migração nem mecanismo de seed automatizado.
- O arquivo legado `src/components/dashboard/SingularDataImportDialog.jsx` foi removido do workspace atual, mas a remoção ainda faz parte de um worktree não commitado.

## 2. ARQUITETURA REAL

### Stack real identificada

- Frontend: `React 19`, `Vite 7`, `Tailwind CSS`, `Radix UI`, `Recharts`, `TanStack React Table`.
- Backend: `Express 5`.
- Dados: `Google BigQuery`.
- Auth: `Firebase Auth` no cliente + `firebase-admin` no backend.
- Build/deploy:
  - `Dockerfile.dev` + `docker-compose.dev.yml` para dev;
  - `Dockerfile` + `cloudbuild.yaml` para produção em `Cloud Run`.

### Estrutura de pastas

Árvore do workspace atual, omitindo apenas `.git/`, `node_modules/` e arquivos `.DS_Store`. O diretório `dist/` aparece porque `npm run build` foi executado durante a validação deste snapshot.

```text
./
├── .cert/
│   └── bigdata-467917-firebase-adminsdk-fbsvc-e80e825190.json
├── db/
│   ├── create_user_access_table.sql
│   ├── export_indicadores.sql
│   └── materialize_indicadores_mart.sql
├── dist/
│   ├── assets/
│   │   ├── index-0hg6b6KU.js
│   │   ├── index-DSq3ZKid.css
│   │   └── xlsx-BvJTHLik.js
│   ├── index.html
│   └── vite.svg
├── docs/
│   └── PROJECT_SNAPSHOT.md
├── documentacao/
│   ├── modouniodonto/
│   │   ├── Fórmulas do Modo Uniodonto 2ec13fe6f4298071aff2e839c65bbdbf.md
│   │   ├── modo uniodonto.md
│   │   └── reuniÃo-modouniodonto.txt
│   ├── templates/
│   │   ├── demonstracoes_contabeis_mensal_uniodonto.exemplo.csv
│   │   └── demonstracoes_contabeis_mensal_uniodonto.template.csv
│   ├── contraprestacoes-eventos-per-capita-uniodonto.md
│   ├── diagnostico-ans-dashboard.md
│   ├── DOCUMENTATION.md
│   ├── dossie-tecnico.md
│   ├── Indicadores_RN-518-2022.md
│   ├── indicadores-uniodonto.md
│   ├── manual_governanca_rev05.md
│   ├── mnuta_anexo_I_PPA_diops.md
│   ├── operacao-atualizacao-dados.md
│   ├── politica-operacional-sandbox.md
│   ├── ppcng.md
│   ├── ranking-operadoras.md
│   ├── relatorio_de_horas.md
│   ├── RESOLUÇÃO NORMATIVA ANS Nº 630, DE 31 DE MARÇO DE 2025.md
│   ├── RN 472 - ANS.md
│   ├── rn574.md
│   ├── rn630.md
│   └── template-demonstracoes-contabeis-mensal-uniodonto.md
├── env/
│   ├── .env.local.example
│   └── .env.local.server.example
├── public/
│   └── vite.svg
├── scripts/
│   ├── create_bq_view.js
│   ├── dev-local.sh
│   ├── export_indicadores_bq.js
│   ├── init-local-env.sh
│   ├── materialize_bq_mart.js
│   ├── materialize_bq_snapshot.js
│   ├── materialize-bq-mart-local.sh
│   ├── reload-dev.sh
│   └── start-dashboard.sh
├── server/
│   └── index.js
├── src/
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginScreen.jsx
│   │   ├── dashboard/
│   │   │   ├── DataLoadingIndicator.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── ExportMenu.jsx
│   │   │   ├── IndicatorTrendChart.jsx
│   │   │   ├── KpiCards.jsx
│   │   │   ├── MonetarySummary.jsx
│   │   │   ├── OperadoraDataImportDialog.jsx
│   │   │   ├── RankingChart.jsx
│   │   │   ├── RankingPanel.jsx
│   │   │   ├── UniodontoCorrelationPanel.jsx
│   │   │   ├── UniodontoKpiCards.jsx
│   │   │   └── UniodontoPerCapitaChart.jsx
│   │   ├── filters/
│   │   │   ├── FiltersPanel.jsx
│   │   │   ├── MultiSelect.jsx
│   │   │   └── OperatorSearch.jsx
│   │   ├── layout/
│   │   │   └── AppHeader.jsx
│   │   └── ui/
│   │       ├── accordion.jsx
│   │       ├── badge.jsx
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── chart.jsx
│   │       ├── checkbox.jsx
│   │       ├── collapsible.jsx
│   │       ├── dialog.jsx
│   │       ├── input.jsx
│   │       ├── label.jsx
│   │       ├── popover.jsx
│   │       ├── progress.jsx
│   │       ├── scroll-area.jsx
│   │       ├── select.jsx
│   │       ├── separator.jsx
│   │       ├── skeleton.jsx
│   │       ├── switch.jsx
│   │       ├── tabs.jsx
│   │       ├── textarea.jsx
│   │       └── tooltip.jsx
│   ├── contexts/
│   │   ├── auth-context.js
│   │   ├── AuthProvider.jsx
│   │   └── useAuth.js
│   ├── hooks/
│   │   └── useDashboardController.js
│   ├── lib/
│   │   ├── accessProfile.js
│   │   ├── auth.js
│   │   ├── comparisonModes.js
│   │   ├── dataService.js
│   │   ├── export.js
│   │   ├── firebaseClient.js
│   │   ├── metricFormulas.js
│   │   ├── metricFormulasModoUniodonto.js
│   │   ├── monetaryIndicators.js
│   │   ├── regulatoryScore.js
│   │   ├── uniodontoMetrics.js
│   │   ├── uniodontoPerCapita.js
│   │   ├── uniodontoPerCapita.test.js
│   │   └── utils.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .dockerignore
├── .env.local
├── .env.local.server
├── .gitignore
├── agents.md
├── cloudbuild.yaml
├── components.json
├── docker-compose.dev.yml
├── Dockerfile
├── Dockerfile.dev
├── eslint.config.js
├── index.html
├── jsconfig.json
├── package-lock.json
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── vite.config.js
```

### Explicação das camadas

#### `components`

Local: `src/components/`

Responsabilidade real:

- `auth/`: tela de login.
- `dashboard/`: KPIs, ranking, tabela, resumo monetário, upload, histórico.
- `filters/`: busca de operadora e filtros de comparação.
- `layout/`: cabeçalho principal.
- `ui/`: wrappers `shadcn/radix` reutilizáveis.

Observação: vários componentes de dashboard têm responsabilidade de apresentação, mas alguns embutem lógica considerável de formatação e UX.

#### `services`

**Não existe pasta `services/` no projeto atual.**

A camada de serviços está distribuída principalmente em:

- `src/lib/dataService.js`: principal camada de acesso a dados do frontend;
- `src/lib/auth.js`: transporte autenticado;
- `src/lib/accessProfile.js`: leitura de perfil de acesso;
- `server/index.js`: lógica de backend, auth, query proxy e upload.

#### `infra`

**Não existe pasta `infra/` no projeto atual.**

Responsabilidades de infraestrutura estão espalhadas em:

- `server/index.js`: runtime do backend;
- `scripts/*.js|*.sh`: operações BigQuery, bootstrap local e recarga;
- `Dockerfile`, `Dockerfile.dev`, `docker-compose.dev.yml`: containerização;
- `cloudbuild.yaml`: build/deploy de produção;
- `env/*.example`: templates de configuração.

#### `hooks`

Local: `src/hooks/useDashboardController.js`

Responsabilidade real:

- estado global da tela principal;
- bootstrap de dados;
- lazy loading por aba;
- troca entre modo RN 518 e modo Uniodonto;
- seleção de operadora e período;
- orquestração de queries;
- comparação com pares;
- séries históricas;
- resumo monetário;
- score regulatório.

#### `utils`

**Não existe pasta `utils/`; existe `src/lib/utils.js`.**

Funções principais:

- `cn()` para merge de classes;
- formatação numérica/percentual/integer;
- coerção numérica (`toNumber`);
- cor de variação em resumo monetário.

Além disso, outros utilitários/domínios ficam em `src/lib/`:

- `comparisonModes.js`;
- `monetaryIndicators.js`;
- `regulatoryScore.js`;
- `metricFormulas.js`;
- `metricFormulasModoUniodonto.js`;
- `uniodontoMetrics.js`;
- `uniodontoPerCapita.js`.

#### `types`

**Não existe pasta `types/`.**

- O projeto é `JavaScript` puro.
- Não há `TypeScript`.
- Os contratos são implícitos em:
  - payloads JSON do backend;
  - funções do `dataService`;
  - shape dos objetos retornados pelo BigQuery.

### Hotspots estruturais

Arquivos centrais com alta concentração de responsabilidade:

- `server/index.js`: `1306` linhas.
- `src/lib/dataService.js`: `2577` linhas.
- `src/hooks/useDashboardController.js`: `866` linhas.
- `src/App.jsx`: `525` linhas.
- `src/components/dashboard/RankingChart.jsx`: `694` linhas.
- `db/materialize_indicadores_mart.sql`: `2256` linhas.

### Fluxos principais

#### Fluxo 1: login e autorização

1. `src/components/auth/LoginScreen.jsx` coleta credenciais.
2. `src/contexts/AuthProvider.jsx` autentica via `firebase/auth`.
3. `src/lib/auth.js` injeta `Authorization: Bearer <id_token>` nas requests.
4. `server/index.js` usa `firebase-admin` para `verifyIdToken`.
5. O backend resolve contexto de acesso na tabela `user_operadora_acessos`.
6. O frontend consulta `/api/auth/profile` e:
   - libera dashboard;
   - ou mostra tela de acesso pendente (`noAccess=true`).

#### Fluxo 2: dashboard → query → BigQuery

1. `src/App.jsx` monta `DashboardApp`.
2. `src/hooks/useDashboardController.js` dispara bootstrap e queries por aba.
3. `src/lib/dataService.js` constrói SQL.
4. `POST /api/query` recebe `{ sql, includeFields? }`.
5. `server/index.js` valida:
   - apenas `SELECT/WITH`;
   - uma instrução por request;
   - tabelas/views permitidas;
   - escopo ACL por `reg_ans`.
6. Backend consulta o `BigQuery`.
7. Resposta JSON volta para o frontend.
8. Em alguns casos o frontend complementa `qt_prestadores` consultando `prestadores_ativos_uniodonto_origem`.

#### Fluxo 3: seleção de operadora

1. Usuário busca operadora em `FiltersPanel`.
2. `useDashboardController` chama `fetchOperatorLatestSnapshot`.
3. O controller sincroniza:
   - busca;
   - contexto da operadora;
   - filtros de comparação;
   - período.
4. As consultas seguintes passam a comparar a operadora com os pares filtrados.

#### Fluxo 4: upload da operadora

1. `OperadoraDataImportDialog.jsx` permite escolher:
   - operadora autorizada;
   - arquivo `.csv/.xls/.xlsx`.
2. O cliente lê o arquivo com `xlsx` e transforma em `rows[]`.
3. O cliente envia JSON para `POST /api/import/operadora-demonstracoes`.
4. O backend:
   - valida autenticação;
   - valida ACL de upload (`can_upload`);
   - valida colunas obrigatórias;
   - valida duplicidade por `(competencia, reg_ans, cd_conta_contabil)`;
   - garante a tabela auxiliar;
   - insere no BigQuery;
   - recria a view latest;
   - opcionalmente recria a view consolidada.
5. O frontend mostra `uploadId`, linhas inseridas e nomes dos objetos BigQuery atualizados.

#### Fluxo 5: build e deploy

1. `Dockerfile` recebe `ARG VITE_*`.
2. `npm run build` gera `dist/`.
3. `cloudbuild.yaml` faz:
   - build da imagem;
   - push para `gcr.io/$PROJECT_ID/ans-dashboard:$SHORT_SHA`;
   - deploy no Cloud Run.
4. Em produção, `server/index.js` serve `dist/` quando `SERVE_STATIC=true` ou `NODE_ENV=production`.

### Integrações externas

- `Google BigQuery`
- `Firebase Auth`
- `Firebase Admin SDK`
- `Google Cloud Run`
- `Google Cloud Build`
- `gcloud`/ADC
- `Docker` / `Docker Compose`
- URL remota de logo `https://collos.com.br/...` usada no login e no header

## 3. COMO RODAR O PROJETO

### Pré-requisitos

- `Node.js 18+` segundo `README.md`.
- `npm 9+` segundo `README.md`.
- Docker para o fluxo recomendado.
- Acesso ao projeto `GCP`/`BigQuery`.
- Projeto `Firebase` configurado.
- Credenciais do Google por um destes caminhos:
  - `gcloud auth application-default login`;
  - JSON local apontado por `GOOGLE_APPLICATION_CREDENTIALS`.

### Observação importante sobre o ambiente local atual

No workspace atual:

- existe `./.cert/bigdata-467917-firebase-adminsdk-fbsvc-e80e825190.json`;
- **não existe** `./.cert/bigdata-467917-16c1318c138a.json`;
- o `.env.local.server` atual aponta `GOOGLE_APPLICATION_CREDENTIALS=.cert/bigdata-467917-16c1318c138a.json`.

Consequência:

- `npm run dev:local` no host tende a falhar se depender desse caminho;
- no Docker, `scripts/dev-local.sh` pode cair no fallback de ADC montado de `${HOME}/.config/gcloud`.

### Instalação do zero

#### Opção A: fluxo recomendado com Docker

```bash
cd /Volumes/SSD/Collos/ans-dash
npm ci
npm run env:init
```

Editar:

- `.env.local`
- `.env.local.server`

Autenticar no Google Cloud por ADC ou garantir JSONs em `.cert/`.

Subir:

```bash
npm run docker:dev:up
```

Serviços expostos:

- frontend: `http://localhost:5173`
- API: `http://localhost:4000`

Logs:

```bash
npm run docker:dev:logs
```

Parar:

```bash
npm run docker:dev:down
```

#### Opção B: fluxo host/local sem Docker

```bash
cd /Volumes/SSD/Collos/ans-dash
npm ci
npm run env:init
```

Editar:

- `.env.local`
- `.env.local.server`

Garantir autenticação Google:

- por ADC; ou
- por arquivo JSON válido no caminho configurado.

Subir:

```bash
npm run dev:local
```

Portas padrão:

- frontend: `5173`
- API: `4000`

#### Opção C: debug mínimo

```bash
cd /Volumes/SSD/Collos/ans-dash
npm ci
npm run dev
```

Esse comando sobe Vite e API em paralelo, mas **não aplica toda a inteligência de bootstrap/credenciais** do `scripts/dev-local.sh`.

### Comandos exatos disponíveis

```bash
npm run dev
npm run dev:local
npm run dev:reload
npm run docker:dev:up
npm run docker:dev:down
npm run docker:dev:logs
npm run env:init
npm run build
npm run lint
npm test
npm run data:export-bq
npm run data:create-bq-view
npm run data:materialize-bq-snapshot
npm run data:materialize-bq-mart
npm run data:materialize-bq-mart:local
```

### Docker: como subir e serviços envolvidos

Arquivo: `docker-compose.dev.yml`

Serviço único:

- `dashboard`

Esse serviço:

- builda a imagem a partir de `Dockerfile.dev`;
- executa `npm run dev:local`;
- monta o repositório em `/app`;
- monta `./.cert` em `/app/.cert` somente leitura;
- monta `${HOME}/.config/gcloud` em `/root/.config/gcloud` somente leitura;
- publica:
  - `5173:5173`
  - `4000:4000`
- executa healthcheck em `/api/health`.

### Variáveis de ambiente

#### Frontend (`.env.local`, Vite)

| Variável | Uso real | Default identificado |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Config do Firebase Web | sem default |
| `VITE_FIREBASE_AUTH_DOMAIN` | Config do Firebase Web | sem default |
| `VITE_FIREBASE_PROJECT_ID` | Config do Firebase Web | sem default |
| `VITE_FIREBASE_APP_ID` | Config do Firebase Web | sem default |
| `VITE_FIREBASE_STORAGE_BUCKET` | Config do Firebase Web | sem default |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Config do Firebase Web | sem default |
| `VITE_FIREBASE_MEASUREMENT_ID` | Config do Firebase Web | sem default |
| `VITE_DATASET_VIEW` | tabela/view principal usada pelo frontend | `dash_ans.indicadores_curados_snapshot` |
| `VITE_DATASET_VIEW_ANS` | alias legado para mart/view ANS | vazio |
| `VITE_DATASET_VIEW_UNIODONTO` | alias legado para mart/view Uniodonto | vazio |
| `VITE_MART_ANS_TABLE` | mart/view ANS explícita | vazio |
| `VITE_MART_UNIODONTO_TABLE` | mart/view Uniodonto explícita | vazio |
| `VITE_PRESTADORES_TABLE` | tabela de prestadores para complementação | `dash_ans.prestadores_ativos_uniodonto_origem` |
| `VITE_PRESTADORES_ORIGEM` | filtro da origem dos prestadores | `PRÓPRIA` |
| `VITE_PRESTADORES_CACHE_TTL_MS` | TTL do cache local de prestadores | `43200000` |
| `VITE_PRESTADORES_ERROR_TTL_MS` | TTL de cache para erro de prestadores | `300000` |
| `VITE_API_PROXY` | proxy `/api` no Vite | `http://localhost:<SERVER_PORT>` |
| `VITE_HOST` | bind do Vite | `0.0.0.0` |
| `VITE_PORT` | porta do Vite | `5173` |
| `VITE_ALLOWED_HOSTS` | hosts aceitos por Vite/preview | `localhost,127.0.0.1,0.0.0.0,dash.collos.com.br,backdash.collos.com.br` |
| `VITE_ALLOW_SIGNUP` | mostra/esconde botão “Criar conta” | `true` implícito (`!== 'false'`) |

#### Backend/API (`.env.local.server` e Cloud Run)

| Variável | Uso real | Default identificado |
| --- | --- | --- |
| `SERVER_HOST` | bind do Express | `0.0.0.0` |
| `SERVER_PORT` | porta do Express | `4000` |
| `PORT` | fallback de porta em produção | `4000` no dev, `8080` no Docker de produção |
| `NODE_ENV` | produção/dev | sem default explícito |
| `SERVE_STATIC` | servir `dist/` pelo Express | `false`, exceto produção com `dist/` |
| `BQ_PROJECT_ID` | projeto BigQuery | `bigdata-467917` |
| `BQ_DATASET` | dataset padrão do BigQuery | `dash_ans` |
| `BQ_MART_DATASET` | dataset derivado | `dash_ans` |
| `BQ_LOCATION` | localização do BigQuery | `southamerica-east1` |
| `BQ_DATASET_VIEW` | view/tabela de export/runtime no backend | `${BQ_MART_DATASET}.indicadores_curados_snapshot` |
| `BQ_EXPORT_VIEW` | view/tabela usada pelo CSV | `${BQ_MART_DATASET}.indicadores_curados_snapshot` |
| `BQ_DATASET_VIEW_ANS` | alias legado do backend para mart ANS | vazio |
| `BQ_DATASET_VIEW_UNIODONTO` | alias legado do backend para mart Uniodonto | vazio |
| `BQ_MART_ANS_TABLE` | mart ANS permitida | vazio |
| `BQ_MART_UNIODONTO_TABLE` | mart Uniodonto permitida | vazio |
| `BQ_ALLOWED_VIEWS` | allowlist explícita do `/api/query` | gerada automaticamente se ausente |
| `BQ_PRESTADORES_TABLE` | tabela para prestadores | `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.prestadores_ativos_uniodonto_origem` |
| `BQ_AUX_DATASET` | dataset da tabela auxiliar | `BQ_MART_DATASET` |
| `BQ_AUX_DEMONSTRACOES_TABLE` | tabela auxiliar de upload | `demonstracoes_contabeis_auxiliar` |
| `BQ_AUX_DEMONSTRACOES_LATEST_VIEW` | view latest da auxiliar | `vw_demonstracoes_contabeis_auxiliar_latest` |
| `BQ_BASE_DEMONSTRACOES_TABLE` | tabela base para view consolidada | `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.demonstracoes_contabeis` |
| `BQ_CONSOLIDATED_DEMONSTRACOES_VIEW` | view consolidada base + auxiliar | `${BQ_PROJECT_ID}.${BQ_AUX_DATASET}.vw_demonstracoes_contabeis_consolidada` |
| `BQ_REFRESH_CONSOLIDATED_VIEW` | recria a view consolidada após upload | `true` |
| `BQ_USER_ACCESS_TABLE` | tabela ACL usuário x operadora | `user_operadora_acessos` |
| `BQ_ENFORCE_USER_ACCESS` | liga/desliga ACL por operadora | `true` |
| `USER_ACCESS_CACHE_TTL_MS` | cache do perfil ACL | `60000` |
| `QUERY_CACHE_TTL_MS` | TTL do cache de query | `60000` |
| `QUERY_CACHE_MAX_ENTRIES` | limite de entradas no cache | `250` |
| `DEMONSTRACOES_MAX_UPLOAD_ROWS` | limite de linhas por upload | `10000` |
| `FIREBASE_PROJECT_ID` | projeto do Firebase Admin | `GCLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | JSON Firebase Admin opcional | vazio |
| `K_REVISION` | boot id no Cloud Run | random quando ausente |
| `GCLOUD_PROJECT` | fallback GCP | sem default |
| `GOOGLE_CLOUD_PROJECT` | fallback GCP | sem default |

#### Credenciais locais

| Variável | Uso real | Observação |
| --- | --- | --- |
| `GOOGLE_APPLICATION_CREDENTIALS` | JSON do Google para BigQuery/scripts | `scripts/dev-local.sh` falha no host se o arquivo não existir; no Docker pode cair em ADC montado |

#### Scripts BigQuery

| Variável | Script(s) | Uso |
| --- | --- | --- |
| `BQ_SOURCE_TABLE` | `create_bq_view.js`, `materialize_bq_mart.js`, `materialize-bq-mart-local.sh` | tabela/view de origem |
| `BQ_SOURCE_VIEW` | `materialize_bq_snapshot.js` | view de origem para snapshot |
| `BQ_SNAPSHOT_TABLE` | `materialize_bq_snapshot.js` | tabela snapshot de destino |
| `BQ_VIEW` | `create_bq_view.js` | nome da view derivada principal |
| `BQ_FULL_VIEW` | `create_bq_view.js` | view full opcional |
| `BQ_FULL_SOURCE_TABLE` | `create_bq_view.js` | tabela fonte para full view |
| `BQ_RAW_TABLE` | `create_bq_view.js` | tabela raw alternativa |
| `BQ_CREATE_FULL_VIEW` | `create_bq_view.js` | liga criação de `vw_demonstracoes_contabeis_full` |
| `BQ_PARTITION_EXPR` | snapshot/mart | expressão de partição |
| `BQ_PARTITION_FIELD` | snapshot/mart | alias legado da partição |
| `BQ_CLUSTER_FIELDS` | snapshot/mart | campos de cluster |
| `EXPORT_SQL_PATH` | `export_indicadores_bq.js` | SQL de exportação |
| `OUTPUT_PATH` | `export_indicadores_bq.js` | arquivo CSV de saída |
| `MART_SQL_PATH` | `materialize_bq_mart.js` | SQL da materialização |

### Como o bootstrap local funciona de verdade

`scripts/dev-local.sh` faz, em ordem:

1. carrega `.env.local.server`, se existir;
2. carrega `.env.local`, se existir;
3. aplica defaults;
4. resolve `GOOGLE_APPLICATION_CREDENTIALS`;
5. se estiver em Docker e o arquivo não existir, tenta ADC em:
   - `/root/.config/gcloud/application_default_credentials.json`
   - `/home/node/.config/gcloud/application_default_credentials.json`
6. se `FIREBASE_SERVICE_ACCOUNT_PATH` não estiver definido, procura automaticamente um arquivo `*firebase-adminsdk*.json` em `.cert/`;
7. sincroniza dependências com `npm ci` se `node_modules` estiver ausente ou desalinhado do `package-lock.json`;
8. executa `npm run dev`.

## 4. BANCO DE DADOS

### Tecnologia utilizada

- `Google BigQuery`
- Não há banco local.
- `Firebase` é usado para autenticação, não para armazenamento de dados do domínio do dashboard.

### Estrutura principal identificada

#### Objetos base/fontes referenciados pelos scripts

Esses nomes aparecem no código/scripts; a existência real em produção depende do projeto/dataset configurado.

- `demonstracoes_contabeis`
- `demonstracoes_contabeis_raw`
- `operadoras`
- `operadoras_beneficiarios_modalidade`
- `prestadores_proprios`
- `uniodontos_ativas`

#### Objetos derivados / runtime

- `vw_demonstracoes_contabeis_full`
- `indicadores_curados`
- `indicadores_metricas` (alias para a view derivada principal)
- `indicadores_curados_snapshot`
- `indicadores_mart_ans`
- `indicadores_mart_uniodonto`
- `prestadores_ativos_uniodonto_origem`

#### Objetos de upload e ACL

- `user_operadora_acessos`
- `demonstracoes_contabeis_auxiliar`
- `vw_demonstracoes_contabeis_auxiliar_latest`
- `vw_demonstracoes_contabeis_consolidada`

### Como os dados são modelados

#### `indicadores_curados`

Criada por `scripts/create_bq_view.js`.

A view:

- agrega contas contábeis em colunas monetárias;
- restringe as modalidades a:
  - `Odontologia de Grupo`
  - `Cooperativa odontológica`
- calcula:
  - `periodo_raw`
  - `periodo_id`
  - `periodo`
  - `trimestre_rank`
  - valores atuais;
  - valores do período anterior (`prev_*`);
  - deltas (`delta_*`);
  - resultados líquidos/financeiros.

#### `indicadores_curados_snapshot`

Criada por `scripts/materialize_bq_snapshot.js`.

- materialização da view `indicadores_curados`;
- partição por `periodo_raw`;
- cluster pelos campos configurados.

#### `indicadores_mart_ans`

Criada por `db/materialize_indicadores_mart.sql` + `scripts/materialize_bq_mart.js`.

Objetivo:

- pré-calcular métricas RN 518 e colunas auxiliares para reduzir custo/latência das queries.

#### `indicadores_mart_uniodonto`

Criada pelo mesmo fluxo do item anterior.

Objetivo:

- pré-calcular indicadores, pesos e scores do modo Uniodonto.

#### `user_operadora_acessos`

Schema inferido do backend e de `db/create_user_access_table.sql`:

- `user_uid STRING`
- `user_email STRING`
- `reg_ans STRING`
- `operator_name STRING`
- `can_upload BOOL`
- `role STRING`
- `active BOOL`
- `created_at TIMESTAMP`
- `updated_at TIMESTAMP`

Regras reais observadas:

- lookup por `user_uid` ou `user_email`;
- `active` default lógico: `TRUE` quando nulo;
- `role='admin'` ou `reg_ans='*'` eleva o usuário para admin;
- `can_upload` default lógico: `TRUE` quando nulo;
- usuário pode ter múltiplas linhas para múltiplas operadoras.

#### `demonstracoes_contabeis_auxiliar`

Criada automaticamente pelo backend no primeiro upload, se não existir.

Campos principais:

- metadados do upload:
  - `upload_id`
  - `uploaded_at`
  - `uploaded_by_uid`
  - `uploaded_by_email`
  - `source_file_name`
  - `operator_name`
- chave contábil:
  - `competencia`
  - `ano`
  - `trimestre`
  - `data`
  - `reg_ans`
  - `cd_conta_contabil`
- valores:
  - `vl_saldo_inicial`
  - `vl_saldo_final`
  - `vl_debitos`
  - `vl_creditos`
- metadados de negócio:
  - `descricao`
  - `cnpj`
  - `moeda`
  - `status_fechamento`
  - `tipo_envio`
  - `versao_envio`
  - `dt_envio`
  - `sistema_origem`
  - `responsavel_nome`
  - `responsavel_email`
  - `qt_beneficiarios`
  - `qt_prestadores`
  - `modalidade`
  - `porte`
  - `observacoes`
  - `arquivo_origem`

Características:

- particionada por `uploaded_at` (DAY);
- cluster por `reg_ans`, `competencia`, `cd_conta_contabil`.

#### `vw_demonstracoes_contabeis_auxiliar_latest`

Criada/atualizada pelo backend após upload.

Regras:

- `ROW_NUMBER() OVER (PARTITION BY competencia, reg_ans, cd_conta_contabil ORDER BY COALESCE(versao_envio, 0) DESC, uploaded_at DESC) = 1`

#### `vw_demonstracoes_contabeis_consolidada`

Criada/atualizada pelo backend quando `BQ_REFRESH_CONSOLIDATED_VIEW=true`.

Regras:

- pega a base original (`BQ_BASE_DEMONSTRACOES_TABLE`);
- exclui linhas substituídas pela auxiliar latest;
- faz `UNION ALL` com a auxiliar latest.

### Migrações

**Não existe framework de migração**.

O projeto usa três estratégias diferentes:

1. SQL manual:
   - `db/create_user_access_table.sql`
2. Scripts `CREATE OR REPLACE`:
   - `scripts/create_bq_view.js`
   - `scripts/materialize_bq_snapshot.js`
   - `scripts/materialize_bq_mart.js`
3. Auto-criação pelo runtime:
   - tabela ACL via `ensureUserAccessTable()`
   - tabela auxiliar via `ensureAuxDemonstracoesTable()`

### Seeds

`NÃO IDENTIFICADO` mecanismo automatizado de seed.

Existe apenas:

- comentário de exemplo de `INSERT` em `db/create_user_access_table.sql`.

### Estado atual dos dados

- Contagem de linhas, volume de dados e ocupação dos datasets: `NÃO IDENTIFICADO`.
- Dataset local configurado em `.env.local.server`: `dash_ans`.
- Projeto local configurado em `.env.local.server`: `bigdata-467917`.
- Em `cloudbuild.yaml`, o deploy de produção usa:
  - `BQ_DATASET=dash_ans`
  - `BQ_MART_DATASET=dash_ans`
  - `BQ_DATASET_VIEW=dash_ans.indicadores_curados_snapshot`

## 5. APIS E CONTRATOS

### Regras globais de API

- `Content-Type` principal: `application/json` nas rotas POST.
- `express.json({ limit: '5mb' })` limita o corpo JSON.
- Todas as rotas `/api/*` exigem autenticação, **exceto**:
  - `GET /api/health`
  - `GET /api/auth/status`
- `GET /api/auth/profile` exige token, mas é permitido mesmo para usuário sem operadora vinculada.

### Endpoints existentes

#### `GET /api/auth/status`

- Auth: pública
- Request: sem corpo
- Response:

```json
{
  "enabled": true,
  "bootId": "<string>",
  "projectId": "<firebase-project-id-ou-null>"
}
```

Status: `estável`

#### `GET /api/auth/profile`

- Auth: Bearer Firebase obrigatório
- Request: sem corpo
- Response:

```json
{
  "uid": "<uid-ou-null>",
  "email": "<email-ou-null>",
  "enforced": true,
  "isAdmin": false,
  "operators": [
    {
      "regAns": "123456",
      "operatorName": "Uniodonto Exemplo",
      "canUpload": true
    }
  ],
  "allowedRegAns": ["123456"],
  "canUploadRegAns": ["123456"],
  "noAccess": false
}
```

Status: `estável`

#### `GET /api/health`

- Auth: pública
- Request: sem corpo
- Response sucesso:

```json
{ "status": "ok" }
```

- Response erro:

```json
{ "status": "error" }
```

Status: `estável`

#### `POST /api/query`

- Auth: Bearer Firebase obrigatório
- Request:

```json
{
  "sql": "SELECT ...",
  "includeFields": false
}
```

Validações do backend:

- aceita apenas `SELECT` ou `WITH`;
- rejeita múltiplas instruções;
- extrai referências `FROM/JOIN`;
- permite apenas tabelas/views da allowlist;
- injeta escopo ACL por `reg_ans`, quando aplicável.

Response sucesso:

```json
{
  "rows": [],
  "fields": [],
  "cache": "hit|miss|deduped|disabled"
}
```

Erros típicos:

- `400`: SQL inválido / instrução não permitida
- `403`: tabela não permitida / sem acesso ACL
- `500`: falha ao validar escopo ou executar consulta

Status: `estável`, porém é uma API interna de baixo nível e fortemente acoplada ao frontend atual

#### `GET /api/indicadores.csv`

- Auth: Bearer Firebase obrigatório
- Request: sem corpo
- Response: `text/csv`
- Fonte: `db/export_indicadores.sql`, com escopo ACL aplicado

Status: `estável`

#### `GET /api/import/demonstracoes/template.csv`

- Auth: Bearer Firebase obrigatório
- Request: sem corpo
- Response: CSV com cabeçalho padrão

Status: `estável`

#### `GET /api/import/demonstracoes/exemplo.csv`

- Auth: Bearer Firebase obrigatório
- Request: sem corpo
- Response: CSV de exemplo preenchido

Status: `estável`

#### `POST /api/import/operadora-demonstracoes`

- Auth: Bearer Firebase obrigatório
- Request:

```json
{
  "operatorName": "Uniodonto Exemplo",
  "operatorRegAns": "123456",
  "fileName": "arquivo.xlsx",
  "rows": [
    {
      "competencia": "2026-01",
      "reg_ans": "123456",
      "cd_conta_contabil": "311",
      "vl_saldo_final": "1200000.00",
      "descricao": "CONTRAPRESTACOES"
    }
  ]
}
```

Campos obrigatórios por linha:

- `competencia`
- `reg_ans`
- `cd_conta_contabil`
- `vl_saldo_final`

Regras adicionais:

- `operatorRegAns` precisa estar autorizado para upload;
- se existir `operator_name` na ACL, o backend exige compatibilidade com `operatorName`;
- limite default de `10000` linhas;
- duplicidade rejeitada por `(competencia, reg_ans, cd_conta_contabil)`;
- `reg_ans` de cada linha deve bater com a operadora selecionada.

Response sucesso:

```json
{
  "success": true,
  "uploadId": "<uuid>",
  "insertedRows": 123,
  "auxTable": "bigdata-467917.dash_ans.demonstracoes_contabeis_auxiliar",
  "latestView": "bigdata-467917.dash_ans.vw_demonstracoes_contabeis_auxiliar_latest",
  "consolidatedView": "bigdata-467917.dash_ans.vw_demonstracoes_contabeis_consolidada",
  "warning": null
}
```

Erros possíveis:

- `400`: validação de arquivo/linhas
- `403`: sem permissão de upload
- `500`: falha ao inserir ou recriar views

Status: `parcialmente estável`

Motivo da classificação:

- o contrato está definido no código atual;
- a feature é recente;
- o estado atual ainda vive em worktree sujo.

#### `POST /api/import/singular-demonstracoes`

- Mesmo handler de `POST /api/import/operadora-demonstracoes`
- Existe apenas como alias de compatibilidade

Status: `estável como alias`, mas semanticamente legado

### O que está estável

- `/api/auth/status`
- `/api/auth/profile`
- `/api/health`
- `/api/query`
- `/api/indicadores.csv`
- downloads de template/exemplo

### O que está instável

- fluxo de upload/ACL do ponto de vista de versionamento Git local;
- topologia de datasets entre local e produção;
- tudo que depende de worktree ainda não commitado.

### O que está incompleto

- não há API dedicada de alto nível para exportar a tabela que está na UI;
- não há API ativa para o painel de correlação, apesar de `fetchScatter` existir no `dataService`.

## 6. ESTADO ATUAL DO SISTEMA

### O que está funcionando corretamente

Validações executadas neste snapshot:

- `npm test`: passou
- `npm run lint`: passou com warnings, sem erros
- `npm run build`: passou

Resultado objetivo:

- build do frontend funciona;
- teste unitário existente funciona;
- lint não bloqueia;
- o código atual compila com a estrutura presente no workspace.

Também foi comprovado no código:

- login por Firebase com três modos;
- query proxy protegido;
- ACL por operadora;
- upload auxiliar;
- lazy loading por aba;
- cálculo de score regulatório;
- gráficos históricos;
- modo Uniodonto;
- ranking monetário e de indicadores.

### O que está quebrado

Com base apenas no código e nos checks locais executados, **nenhuma funcionalidade principal ativa foi comprovadamente quebrada**.

Itens cujo estado runtime completo com serviços remotos ficou fora do escopo deste snapshot:

- login real contra Firebase: `NÃO IDENTIFICADO` neste turno
- queries reais contra BigQuery: `NÃO IDENTIFICADO` neste turno
- upload real no BigQuery: `NÃO IDENTIFICADO` neste turno

### O que está parcialmente implementado

- Exportação de tabela no frontend: código existe, UI não usa.
- Correlação Uniodonto: componente existe, UI não usa.
- Consolidação entre base ANS e upload auxiliar: código existe e a view é recriada, mas não foi validada ao vivo neste turno.
- Branch/worktree atual ainda não foi consolidado em commit limpo.

### Bugs conhecidos / alertas concretos

#### Warnings de lint

1. `src/App.jsx:389`
   - `useEffect` do carregamento de perfil de acesso depende de `user?.uid` e `user?.email`, mas o lint aponta dependência faltante de `user`.
2. `src/hooks/useDashboardController.js:713`
   - `applyOperatorSelection` não está em `useCallback`, então afeta estabilidade de dependências de `useEffect`.

#### Build warning

`npm run build` reportou chunks grandes:

- `dist/assets/index-0hg6b6KU.js`: `1,122.34 kB`
- `dist/assets/xlsx-BvJTHLik.js`: `429.37 kB`

#### Inconsistência objetiva de credencial local

- `.env.local.server` atual aponta `GOOGLE_APPLICATION_CREDENTIALS=.cert/bigdata-467917-16c1318c138a.json`
- esse arquivo **não existe** no diretório `.cert/` atual
- o único JSON visível em `.cert/` é o Firebase Admin SDK

## 7. PENDÊNCIAS

### Features não finalizadas

- Decidir se `ExportMenu` e `src/lib/export.js` devem voltar para a UI ou ser removidos.
- Decidir se `UniodontoCorrelationPanel` e `fetchScatter` devem voltar para a UI ou ser removidos.
- Consolidar o fluxo atual de `OperadoraDataImportDialog` em commit/push; hoje o estado está só no workspace local.

### Dívidas técnicas

- `server/index.js` concentra auth, ACL, query proxy, upload, CSV e bootstrap.
- `src/lib/dataService.js` concentra praticamente toda a lógica SQL do frontend.
- `src/hooks/useDashboardController.js` concentra estado, orquestração e side effects demais.
- Não há contratos tipados.
- Não há migrações formais.
- Não há seeds automatizados.
- Não há testes de integração backend/BigQuery/Firebase.
- Não há testes de interface.

### Refatorações necessárias

- Extrair a lógica de ACL do backend para módulo próprio.
- Extrair o upload auxiliar para módulo próprio no backend.
- Separar builders SQL do `dataService` por domínio:
  - RN 518
  - Uniodonto
  - monetários
  - score regulatório
  - upload/tabela
- Padronizar nomes de datasets entre local, scripts e `cloudbuild.yaml`.
- Normalizar nomes de arquivos em `documentacao/` para evitar problemas de encoding/unicode.

## 8. DECISÕES TÉCNICAS

### Decisões importantes identificadas no código

#### 1. Sem banco local

Evidência:

- política operacional documentada;
- toda leitura/escrita relevante vai para `BigQuery`;
- não há código de banco local nem ORM.

Trade-off:

- simplifica aderência ao ambiente oficial;
- aumenta dependência de credenciais e conectividade.

#### 2. Query proxy em vez de endpoints específicos para cada grid/gráfico

Evidência:

- `POST /api/query` é a base de grande parte do sistema;
- `dataService.js` monta SQL diretamente.

Trade-off:

- acelera entrega e flexibilidade;
- aumenta acoplamento entre frontend e SQL;
- torna o backend mais sensível a allowlist/ACL e mais difícil de tipar.

#### 3. ACL por operadora aplicada no backend, não no frontend

Evidência:

- `applyUserAccessScopeToSql()` reescreve SQL;
- `/api/indicadores.csv` também passa por escopo;
- upload valida `can_upload`.

Trade-off:

- segurança melhor do que confiar em filtro de tela;
- backend fica mais complexo e centrado em um arquivo único.

#### 4. Parse do arquivo no cliente e upload em JSON

Evidência:

- `OperadoraDataImportDialog.jsx` lê o arquivo com `xlsx`;
- backend só recebe `rows[]` em JSON.

Trade-off:

- backend não precisa tratar multipart e parsers de planilha;
- payload JSON fica sujeito ao limite de `5mb`;
- o frontend absorve a responsabilidade de validação inicial.

#### 5. Lazy loading por aba

Evidência:

- `useDashboardController` separa queries por `activeTab`.

Trade-off:

- reduz carga inicial;
- aumenta quantidade de effects e estados no hook central.

#### 6. Snapshot e marts para reduzir custo de BigQuery

Evidência:

- `scripts/materialize_bq_snapshot.js`
- `scripts/materialize_bq_mart.js`
- `db/materialize_indicadores_mart.sql`
- `resolveMetricExpression()` usa colunas pré-calculadas quando a mart existe.

Trade-off:

- menos cálculo em tempo de consulta;
- mais objetos para operar e manter coerentes.

#### 7. Auto-detecção de Firebase Admin local

Evidência:

- `scripts/dev-local.sh` procura `*firebase-adminsdk*.json` em `.cert/`.

Trade-off:

- reduz setup manual;
- depende de convenção de nome do arquivo.

#### 8. `fetchWithAuth` encerra sessão ao receber `401`

Evidência:

- `src/lib/auth.js` faz `signOut(auth)` e dispara evento `auth:expired`.

Trade-off:

- simplifica recuperação de sessão expirada;
- qualquer `401` força logout do usuário.

#### 9. `create_bq_view.js` infere o schema de origem

Modos detectados no código:

- `curated_valor`
- `legacy_registro_operadora`
- `raw_uppercase`

Trade-off:

- maior tolerância a fontes diferentes;
- mais complexidade no script de criação da view.

### Motivos identificáveis no código

- reduzir custo de BigQuery;
- limitar acesso por operadora;
- manter a base oficial intacta e escrever em tabela auxiliar;
- preservar deploy simples em `Cloud Run`;
- manter frontend e API no mesmo projeto e no mesmo container em produção.

## 9. CHECKLIST DE RETOMADA

- [ ] Fazer backup ou commit/push do worktree atual antes de formatar a máquina. O estado atual não está totalmente commitado.
- [ ] Repor a branch `codex/form-operadora-acl`.
- [ ] Garantir que os arquivos locais ignorados existam novamente:
  - [ ] `.env.local`
  - [ ] `.env.local.server`
  - [ ] `.cert/` com os JSONs necessários
  - [ ] ou ADC funcional via `gcloud`
- [ ] Verificar a inconsistência atual de credencial BigQuery:
  - [ ] ajustar `GOOGLE_APPLICATION_CREDENTIALS`
  - [ ] ou confirmar fallback via ADC
- [ ] Rodar `npm ci`
- [ ] Rodar `npm test`
- [ ] Rodar `npm run lint`
- [ ] Rodar `npm run build`
- [ ] Subir o ambiente:
  - [ ] `npm run docker:dev:up` ou
  - [ ] `npm run dev:local`
- [ ] Validar primeiro:
  - [ ] `/api/health`
  - [ ] login Firebase
  - [ ] `/api/auth/profile`
  - [ ] carregamento da aba `Indicadores`
  - [ ] busca de operadora
  - [ ] alternância `Modo Uniodonto`
  - [ ] ranking
  - [ ] gráficos históricos
  - [ ] upload com template/exemplo
- [ ] Conferir se o dataset efetivo de runtime deve ser `dash_ans` ou `datalake_ans + dash_ans`
- [ ] Decidir se o próximo passo é:
  - [ ] consolidar/commitar o fluxo ACL + upload;
  - [ ] limpar código órfão;
  - [ ] refatorar `server/index.js` e `dataService.js`

## 10. RISCOS E PONTOS DE ATENÇÃO

### Partes frágeis do sistema

- `server/index.js` monolítico: um erro afeta auth, query, export e upload ao mesmo tempo.
- `src/lib/dataService.js` monolítico: um ajuste de SQL pode afetar várias telas.
- Upload depende de:
  - parse no cliente;
  - limite de corpo JSON;
  - tabela auxiliar;
  - recriação de views.
- ACL depende de consistência da tabela `user_operadora_acessos`.

### Dependências críticas

- `BigQuery`
- `Firebase Auth`
- `firebase-admin`
- credenciais GCP/ADC
- datasets/views corretos
- allowlist do `/api/query`

### Pontos de quebra prováveis

#### 1. Credenciais locais

O estado atual do `.env.local.server` aponta para um JSON BigQuery ausente no workspace.

#### 2. Divergência entre local e produção

`cloudbuild.yaml` e os envs locais não usam exatamente a mesma topologia de datasets.

#### 3. Arquivos com normalização Unicode inconsistente

`git ls-files` mostra nomes documentais duplicados com formas diferentes de Unicode, por exemplo:

- variantes de `RESOLUÇÃO...`
- variantes de `Fórmulas do Modo Uniodonto...`
- variantes de `reunião-modouniodonto.txt`

Isso pode gerar comportamento diferente entre macOS e Linux.

#### 4. Bundle grande

O build atual gera chunk principal acima de `1 MB` minificado e um chunk grande de `xlsx`. Isso aumenta risco de performance de carregamento.

#### 5. Código órfão

Existe código não conectado à UI atual. Se alguém assumir que tudo o que está em `src/components/dashboard` está ativo, vai chegar a conclusões erradas.

#### 6. Falta de validação E2E no snapshot

Este snapshot validou build/lint/test locais, mas **não executou** fluxo real contra:

- Firebase remoto;
- BigQuery remoto;
- upload real.

Estado end-to-end no momento exato do snapshot: `NÃO IDENTIFICADO`.

### Observação final de retomada

Este documento preserva o contexto técnico, mas **não substitui backup do worktree atual**. Como há mudanças locais não commitadas, formatar a máquina sem antes salvar o repositório atual causará perda de código.
