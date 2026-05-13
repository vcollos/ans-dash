# Documentação Completa — ans-dash (Painel Financeiro Contábil PFC/ANS)

> Painel PFC/ANS da Uniodonto do Brasil. Dashboard de indicadores financeiros e contábeis das operadoras de planos odontológicos, com foco no sistema Uniodonto e comparação com o universo ANS.

- **Domínio público**: <https://pfc.uniodonto.coop.br>
- **Stack**: Vite + React 19, Express 5, Firebase Auth, BigQuery, Cloud Run
- **Projeto GCP**: `bigdata-467917`
- **Location BigQuery**: `southamerica-east1`
- **Dataset operacional**: `dash_ans`
- **Serviço Cloud Run**: `ans-dashboard`

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Stack e dependências](#3-stack-e-dependências)
4. [Estrutura de pastas](#4-estrutura-de-pastas)
5. [Modelo de dados (BigQuery)](#5-modelo-de-dados-bigquery)
6. [Autenticação e perfis de acesso](#6-autenticação-e-perfis-de-acesso)
7. [API HTTP (Express)](#7-api-http-express)
8. [Frontend — telas, componentes e fluxos](#8-frontend--telas-componentes-e-fluxos)
9. [Indicadores e fórmulas](#9-indicadores-e-fórmulas)
10. [Filtros e modos de comparação](#10-filtros-e-modos-de-comparação)
11. [Importação de demonstrações contábeis](#11-importação-de-demonstrações-contábeis)
12. [Variáveis de ambiente](#12-variáveis-de-ambiente)
13. [Desenvolvimento local](#13-desenvolvimento-local)
14. [Build, scripts e jobs de dados](#14-build-scripts-e-jobs-de-dados)
15. [Deploy (Cloud Run / Cloud Build)](#15-deploy-cloud-run--cloud-build)
16. [Cache, performance e custo BigQuery](#16-cache-performance-e-custo-bigquery)
17. [Segurança e governança](#17-segurança-e-governança)
18. [Operação e troubleshooting](#18-operação-e-troubleshooting)
19. [Glossário](#19-glossário)

---

## 1. Visão geral

O `ans-dash` é um painel SaaS interno da Uniodonto que consolida os indicadores financeiros e contábeis (PFC) reportados pelas operadoras à ANS, materializados em BigQuery. Ele permite:

- Acompanhar **KPIs financeiros** (sinistralidade, liquidez, ROE, margens, despesas etc.) por operadora, modalidade, porte, ano e trimestre.
- Comparar uma operadora com **peer groups** (universo ANS ou apenas Uniodontos).
- Visualizar **rankings** de indicadores ANS, indicadores exclusivos Uniodonto e valores monetários.
- Explorar **séries históricas** e gráficos de evolução por trimestre.
- Calcular um **Score Regulatório** consolidado com classificação por nota (RUIM / REGULAR / BOA / ÓTIMA).
- Permitir que cada Singular Uniodonto **importe suas próprias demonstrações contábeis auxiliares** quando o PFC ainda não foi publicado pela ANS.
- Servir como ferramenta administrativa para **aprovação de cadastros**, com validação automática contra o UHub.

A aplicação distingue dois "modos":

- **Modo ANS** (padrão): usa o universo de operadoras ANS como peer group.
- **Modo Uniodonto**: substitui o universo de comparação por apenas operadoras Uniodonto e habilita indicadores exclusivos do sistema.

---

## 2. Arquitetura

```
┌─────────────────────┐        HTTPS/JSON        ┌────────────────────────┐
│  Vite + React (SPA) │ ───────────────────────► │  Express API (Node 22) │
│   /assets servidos  │                          │   server/index.js       │
│   pelo próprio      │ ◄─────────────────────── │                         │
│   container Cloud   │                          │  - Firebase Admin (JWT) │
│   Run em produção   │                          │  - BigQuery client      │
└──────────┬──────────┘                          │  - Nodemailer (SMTP)    │
           │                                     │  - UHub HTTP client     │
           │ Firebase Auth (browser SDK)         └───────────┬─────────────┘
           ▼                                                 │
   Firebase Identity Platform                                │ BigQuery jobs
                                                             ▼
                                                  ┌────────────────────────┐
                                                  │ BigQuery dash_ans      │
                                                  │ (southamerica-east1)   │
                                                  │ + dash_ans_historico   │
                                                  │ + datalake_ans         │
                                                  └────────────────────────┘
```

- **Single container** publicado no Cloud Run: o `Dockerfile` faz `vite build`, o resultado é servido como estático pelo próprio Express, junto à API em `/api/*`.
- **Sem banco operacional próprio**: estado de usuários/perfis vai para BigQuery (tabelas `user_operadora_acessos`, `user_profile_completions`) e Firestore (`pfc_users_uhub_link`, `pfc_onboarding_audit_logs`).
- **Sem Supabase, Postgres, SQLite, PM2, systemd ou VPS** no runtime — restrição explícita do projeto.

---

## 3. Stack e dependências

### Runtime

- **Node.js 22** (container `node:22-slim`).
- **React 19** + **Vite 7** (`@vitejs/plugin-react`).
- **Express 5** como servidor HTTP unificado.
- **Tailwind CSS 3** + **shadcn/ui** sobre Radix UI.
- **lucide-react** (ícones) e **Recharts** (gráficos).
- **@tanstack/react-table** para tabelas.
- **dayjs** para datas, **zod** para validação leve.
- **xlsx** para parse de planilhas no upload.
- **@google-cloud/bigquery** + **firebase-admin** + **firebase** (SDK web).
- **nodemailer** para notificação SMTP.

### Dev

- **ESLint 9** com plugins de React Hooks e React Refresh.
- **concurrently** para subir client + API juntos em desenvolvimento.
- **node --test** para os testes unitários (`uhubOnboarding.test.js`, `uniodontoPerCapita.test.js`).

---

## 4. Estrutura de pastas

```
ans-dash/
├── Dockerfile                  # build multi-stage para Cloud Run
├── Dockerfile.dev              # imagem de desenvolvimento
├── cloudbuild.yaml             # pipeline Cloud Build → Cloud Run
├── docker-compose.dev.yml      # ambiente local
├── vite.config.js              # config do bundler
├── tailwind.config.js          # tokens de design
├── components.json             # config shadcn/ui
├── eslint.config.js            # regras de lint
├── package.json                # scripts npm + deps
│
├── db/                         # SQL persistido
│   ├── export_indicadores.sql
│   └── materialize_indicadores_mart.sql
│
├── documentacao/               # documentação operacional
│   ├── OPERACAO_ATUAL.md
│   ├── INVENTARIO_LEGADOS.md
│   ├── DOCUMENTACAO_COMPLETA.md   # este arquivo
│   └── historico/
│
├── env/                        # exemplos de .env
│
├── public/                     # estáticos (logos, favicon)
│
├── scripts/                    # jobs CLI Node/Bash
│   ├── dev-local.sh
│   ├── reload-dev.sh
│   ├── init-local-env.sh
│   ├── start-dashboard.sh
│   ├── export_indicadores_bq.js
│   ├── create_bq_view.js
│   ├── refresh_bq_demonstracoes_base.js
│   ├── refresh_bq_consolidated_indicators.js
│   ├── sync_bq_beneficiarios_odontologicas.js
│   ├── inventory_bq_legacy.js
│   ├── revalidate_pfc_uhub_links.js
│   ├── materialize_bq_snapshot.js
│   ├── materialize_bq_mart.js
│   └── materialize-bq-mart-local.sh
│
├── server/                     # backend Express
│   ├── index.js                # rotas, BigQuery, Firebase, SMTP
│   ├── uhubOnboarding.js       # regras de match com UHub
│   └── uhubOnboarding.test.js
│
└── src/                        # frontend React
    ├── main.jsx                # bootstrap React 19 + StrictMode
    ├── App.jsx                 # tela principal e shell de auth
    ├── index.css               # tokens Tailwind + scrollbar
    ├── assets/                 # SVGs (logo Uniodonto)
    ├── components/
    │   ├── auth/               # Login, registro, conclusão de perfil, admin
    │   ├── dashboard/          # KPIs, ranking, gráficos, tabela, importação
    │   ├── filters/            # painel de filtros e seletor de operadora
    │   ├── layout/             # AppHeader
    │   └── ui/                 # primitivos shadcn (button, card, dialog…)
    ├── contexts/               # AuthProvider, useAuth
    ├── hooks/                  # useDashboardController (orquestra dados)
    └── lib/                    # serviços, fórmulas e utilidades
        ├── accessProfile.js
        ├── auth.js
        ├── comparisonModes.js
        ├── dataService.js
        ├── export.js
        ├── firebaseClient.js
        ├── metricFormulas.js
        ├── metricFormulasModoUniodonto.js
        ├── monetaryIndicators.js
        ├── regulatoryScore.js
        ├── uniodontoMetrics.js
        ├── uniodontoPerCapita.js
        └── utils.js
```

---

## 5. Modelo de dados (BigQuery)

Todo o runtime consome o dataset `bigdata-467917.dash_ans`. O dataset `datalake_ans` é fonte canônica ANS, usada apenas por scripts de materialização. Histórico legado fica em `dash_ans_historico` com prefixo `legacy_`.

### Objetos principais

| Objeto | Tipo | Propósito |
|---|---|---|
| `indicadores_curados_snapshot_consolidado` | view | Snapshot oficial ANS + dados auxiliares de Singulares, consumido como base padrão. |
| `indicadores_mart_ans_consolidado` | tabela | Mart final do modo ANS (indicadores + percentis + score). |
| `indicadores_mart_uniodonto_consolidado` | tabela | Mart do modo Uniodonto (peer group = apenas Uniodontos). |
| `prestadores_ativos_uniodonto_origem` | tabela | Contagem de prestadores próprios por Uniodonto. |
| `demonstracoes_contabeis` | tabela | Base ANS de DRE/Balanço por operadora/trimestre. |
| `demonstracoes_contabeis_auxiliar` | tabela | DRE/Balanço submetidos manualmente pelas Singulares quando o PFC ANS ainda não saiu. |
| `vw_demonstracoes_contabeis_auxiliar_latest` | view | Versão mais recente por operadora/período do upload manual. |
| `vw_demonstracoes_contabeis_consolidada` | view | União do oficial + auxiliar, prioridade do auxiliar mais recente. |
| `beneficiarios_odontologicas_por_operadora` | tabela | Contagem trimestral de beneficiários odontológicos. |
| `operadoras` | tabela | Catálogo (reg_ans, nome, modalidade, porte, situação, marcação Uniodonto). |
| `uhub_cooperativas_catalogo` | tabela | Catálogo das Singulares conhecidas pelo UHub. |
| `user_operadora_acessos` | tabela | Liga `uid` Firebase → `reg_ans` autorizado, com flags de upload e admin. |
| `user_profile_completions` | tabela | Cadastro adicional do usuário (nome, função, telefone, vínculo). |

### Materialização

- `scripts/refresh_bq_demonstracoes_base.js` → atualiza `demonstracoes_contabeis` a partir do `datalake_ans`.
- `scripts/refresh_bq_consolidated_indicators.js` → recalcula `indicadores_curados_snapshot_consolidado` e os marts ANS/Uniodonto consolidados.
- `scripts/materialize_bq_mart.js` → reexecuta o SQL persistido em `db/materialize_indicadores_mart.sql`.
- `scripts/materialize_bq_snapshot.js` → cria/atualiza snapshots imutáveis para auditoria.
- `scripts/sync_bq_beneficiarios_odontologicas.js` → atualiza beneficiários ANS por operadora.
- `scripts/export_indicadores_bq.js` → exporta CSV consolidado para downloads administrativos.

---

## 6. Autenticação e perfis de acesso

### Frontend

- **Firebase Auth** via SDK web (`firebase` 12.x). Métodos suportados:
  - E-mail + senha (`signInWithEmailAndPassword`)
  - Criação de conta (`createUserWithEmailAndPassword`)
  - Google (`signInWithPopup` com fallback para `signInWithRedirect`)
  - Magic link por e-mail (`sendSignInLinkToEmail` + `signInWithEmailLink`)
  - Recuperação de senha (`sendPasswordResetEmail`)
- O `AuthProvider` (`src/contexts/AuthProvider.jsx`) expõe o usuário corrente e os handlers via `useAuth`.

### Backend

- Todas as rotas `/api/*` passam por `authMiddleware`, que:
  1. Lê `Authorization: Bearer <ID Token>`.
  2. Valida com **Firebase Admin** (`admin.auth().verifyIdToken`).
  3. Resolve o perfil de acesso via tabela `user_operadora_acessos` no BigQuery.
  4. Aplica cache de 60 s por usuário (`USER_ACCESS_CACHE_TTL_MS`).
  5. Bloqueia (`403`) quando `ENFORCE_USER_ACCESS=true` e o usuário não tem registro ativo.
- Domínios listados em `ACCESS_ADMIN_EMAIL_DOMAINS` (default: `uniodonto.coop.br`, `collos.com.br`, `contagbr.com.br`) ganham flag de admin.

### Fluxo de onboarding

1. Usuário cria conta ou faz login.
2. Frontend chama `GET /api/auth/profile`; se `requiresProfileCompletion = true`, abre `ProfileCompletionDialog`.
3. `POST /api/auth/profile/complete` grava em `user_profile_completions` e dispara `decideUhubMatch` (regras em `server/uhubOnboarding.js`) cruzando contra UHub.
4. Caso `match`, vínculo aprovado automaticamente. Caso ambíguo, fica como `PENDING` e administradores aprovam via `AdminAccountsDialog`.
5. Auditoria fica em Firestore (`pfc_onboarding_audit_logs`) e e-mails de boas-vindas são enviados via SMTP para `marketing@uniodonto.coop.br`.

### Estados de UI

- **`isLoading`** → "Verificando autenticação…".
- **`!user`** → `LoginScreen`.
- **`isAccessProfileLoading`** → "Carregando perfil de acesso…".
- **`accessProfileError`** → `ErrorState` com botão "Tentar novamente".
- **`requiresProfileCompletion`** → `ProfileCompletionDialog` em modo bloqueante.
- **`accessProfile.canAccess === false`** → "Conta em ativação".
- **OK** → `DashboardApp`.

---

## 7. API HTTP (Express)

Servidor único definido em `server/index.js`. Convenções: respostas JSON, `Authorization: Bearer <ID Token Firebase>`, `Content-Type: application/json` exceto onde indicado.

### Autenticação e perfil

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/auth/status` | Healthcheck do middleware. Retorna `{ ok: true, uid, email }`. |
| `GET` | `/api/auth/profile` | Retorna o perfil de acesso (operadoras autorizadas, flags admin/upload, completude do cadastro). |
| `POST` | `/api/auth/profile/complete` | Salva cadastro do usuário, dispara matching UHub e responde com o perfil atualizado. |
| `GET` | `/api/onboarding/operators` | Lista operadoras elegíveis para vínculo (catálogo cruzado UHub + ANS). |
| `GET` | `/api/operators` | Alias de `/api/onboarding/operators`. |

### Administração

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/admin/accounts/pending` | Lista contas aguardando ativação manual. Restrito a admins. |
| `POST` | `/api/admin/accounts/:uid/approve` | Aprova uma conta, vincula reg_ans e flags. |
| `POST` | `/api/admin/accounts/:uid/reject` | Rejeita uma conta, registra motivo. |

### Dados

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/query` | Executa uma consulta parametrizada e retorna `{ columns, rows, fromCache, jobId, totalBytesProcessed }`. Validações: tabela em `BQ_ALLOWED_VIEWS`, parâmetros via `@named`, limite de bytes (`BQ_MAX_BYTES_BILLED`), cache TTL configurável. |
| `GET` | `/api/indicadores.csv` | Exporta CSV completo da view consolidada (para admins). |
| `GET` | `/api/health` | Health probe usado pelo Cloud Run e testes (`bq` + `firebase-admin`). |

### Importação de demonstrações

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/import/operadora-demonstracoes/context` | Retorna o contexto para upload (reg_ans permitido, último envio, períodos válidos). |
| `GET` | `/api/import/demonstracoes/template.csv` | Baixa o template CSV (`cd_conta_contabil;vl_saldo_final`). |
| `GET` | `/api/import/demonstracoes/exemplo.csv` | Baixa um CSV de exemplo preenchido. |
| `POST` | `/api/import/operadora-demonstracoes` | Recebe o upload (multipart) e persiste em `demonstracoes_contabeis_auxiliar`. |
| `POST` | `/api/import/singular-demonstracoes` | Alias semântico para o mesmo handler. |

### Static / Firebase config

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/__/firebase/init.json` | Disponibiliza a config Firebase para Hosting-compat. |
| `GET` | `/__/firebase/init.js` | Mesma config no formato JS. |
| `GET` | `*` | Serve `dist/index.html` (SPA fallback). |

### Tratamento de erros

- Erros são logados com `console.error`.
- BigQuery: respostas `400` para queries inválidas, `403` para tabelas não permitidas e `429` quando `bytesBilled` excede o limite configurado.
- Auth: `401` para token ausente/expirado, `403` para usuário sem acesso.

---

## 8. Frontend — telas, componentes e fluxos

### Hierarquia

```
<App>
  <AuthProvider>
    <AppContent>          // src/App.jsx
      <LoginScreen>       // se !user
      <ProfileCompletionDialog>  // se requiresProfileCompletion
      <DashboardApp>      // app principal
        <AppHeader/>
        <DataLoadingIndicator/>
        <FiltersPanel/>   // sidebar drawer
        <Tabs>
          <KpiCards | UniodontoKpiCards/>
          <MonetarySummary/>
          <DataTable/>
          <RankingPanel/>
          <IndicatorTrendChart/>
          <UniodontoPerCapitaChart/>
        </Tabs>
        <OperadoraDataImportDialog/>
        <AdminAccountsDialog/>
        <ProfileCompletionDialog/>
```

### Hook orquestrador

`src/hooks/useDashboardController.js` concentra todo o estado do dashboard:

- Carrega bootstrap (`fetchDashboardBootstrap`) com catálogo de operadoras, períodos disponíveis e KPIs default.
- Mantém:
  - `filters` (modalidade, porte, ano, trimestre, ativa, uniodonto, regAns, busca textual)
  - `comparisonFilters` (peer group para comparação)
  - `operatorContext` (operadora selecionada como foco)
  - `rankingMetric`, `monetaryRankingMetric`, `uniodontoRankingMetric`
  - `trendSeriesByMetric` (séries históricas de cada indicador)
  - `tableData`, `kpis`, `dashboardSummary`, `regulatoryScore`
- Dispara `fetchTrendSeriesBatch`, `fetchRanking`, `fetchMonetaryRanking`, `fetchAnsPeerSummary` / `fetchUniodontoPeerSummary` em paralelo conforme a aba ativa.
- Aplica debouncing implícito via `useEffect` + `AbortController`.

### Abas

1. **Indicadores** — KPIs principais, score regulatório, resumo monetário, tabela detalhada com colunas configuráveis.
2. **Ranking** — Tabela ranqueada por indicador escolhido (ANS, Uniodonto ou monetário), com a operadora-foco destacada.
3. **Gráficos históricos** — Séries por trimestre/ano. Em modo Uniodonto adiciona `UniodontoPerCapitaChart` (per capita com filtro de modalidade e base de receita).

### Componentes-chave

- `AppHeader` (`src/components/layout/AppHeader.jsx`): logo, sumário (operadoras, beneficiários, prestadores), toggle "Modo Uniodonto", botão "Atualize seus dados" (importação) e ações de perfil/admin.
- `FiltersPanel` (`src/components/filters/FiltersPanel.jsx`): multi-select de modalidade/porte/ano/trimestre, busca de operadora (`OperatorSearch`), filtros de comparação.
- `KpiCards` / `UniodontoKpiCards`: cards com valor, formato (moeda/%/dias/decimal), tendência (verde para alvo atingido), comparação contra peer e classificação ÓTIMA/BOA/REGULAR/RUIM por indicador. `KpiCards` também mostra o **Score Regulatório** consolidado com gauge multicolorido.
- `RankingPanel` + `RankingChart`: lista de operadoras ordenada pelo indicador, com paginação e destaque para a selecionada. Clique em uma linha aplica a operadora como foco.
- `IndicatorTrendChart`: gráfico de linha (Recharts) com séries da operadora vs peer.
- `UniodontoPerCapitaChart`: per capita por modalidade de pagamento (`pre`, `pos`, `misto`) com base de receita configurável.
- `MonetarySummary`: cards monetários (receitas, despesas, resultado líquido) em formato BRL.
- `DataTable` (TanStack): tabela detalhada com colunas listadas em `DETAIL_TABLE_FIELDS` do `dataService.js`.
- `OperadoraDataImportDialog`: wizard de upload de demonstrações.
- `AdminAccountsDialog`: gestão de contas pendentes.
- `ProfileCompletionDialog`: cadastro/edição de perfil, vínculo com operadora e troca de senha.

### Tema e UI

- Tokens em `src/index.css` (variáveis CSS `--primary`, `--muted` etc.) com suporte a tema dark (não exposto em UI atualmente).
- Componentes shadcn em `src/components/ui/*` — apenas estilizados com Tailwind + class-variance-authority.

---

## 9. Indicadores e fórmulas

### Catálogo ANS (`src/lib/metricFormulas.js`)

Cada item expõe `{ id, code, label, description, format, sql, trend, showInCards, showInCatalog }`. Principais:

| Código | Nome | Fórmula resumida | Tendência |
|---|---|---|---|
| `SPC` | Sinistro mensal per capta | `vr_eventos_liquidos / qt_beneficiarios / meses` | menor |
| `TM` | Ticket médio mensal | `vr_contraprestacoes / qt_beneficiarios / meses` | maior |
| `TM/SM` | Ticket médio vs sinistro | Ticket/Sinistro per capta | maior |
| `MLL` | Margem Líquida | `resultado_liquido / vr_contraprestacoes` | maior |
| `ROE` | Retorno sobre PL | `resultado_liquido / patrimonio_liquido` | maior |
| `DM` | Sinistralidade | `eventos / (contraprestacoes − provisoes) + corresponsabilidade` | menor |
| `DM_ACUM` | Sinistralidade acumulada | mesma fórmula com `SUM OVER` | menor |
| `DM_TRIM` | Sinistralidade trimestral | usa deltas do trimestre | menor |
| `DA` | Despesas Administrativas | `desp_adm / receitas operacionais` | menor |
| `DC` | Despesas Comerciais | `desp_comerciais / receitas` | menor |
| `DOP` | Despesas Operacionais | combinação de DA, DC, DM | menor |
| `COMB` | Margem combinada | DM + DOP | menor |
| `IRF` | Resultado Financeiro | `resultado_financeiro / contraprestacoes` | maior |
| `LC` | Liquidez Corrente | `ativo_circulante / passivo_circulante` | maior |
| `LI` | Liquidez Imediata | `disponivel / passivo_circulante` | maior |
| `CT/CP` | Capital de Terceiros / PL | passivo de terceiros / PL | menor |
| `PMRC` | Prazo médio de recebimento | `contas_a_receber * dias / receita` | menor |
| `PMPG` | Prazo médio de pagamento | `passivo_eventos * dias / despesa` | menor |
| `CPT` | Cobertura de Provisões Técnicas | ativos garantidores / provisões | maior |

### Score Regulatório (`src/lib/regulatoryScore.js`)

- Define 13 indicadores com **peso individual** que somam ~1.
- Calcula percentis (`p10, q1, median, q3, p90`) sobre o peer group atual.
- Aplica **nota** 1..4 (RUIM, REGULAR, BOA, ÓTIMA) por indicador, respeitando o `trend` (lower-is-better inverte a escala).
- Classificação final por faixas: `≥3.5 ÓTIMA`, `≥2.5 BOA`, `≥1.8 REGULAR`, `< RUIM`.
- A função `evaluateRegulatoryScore` é compartilhada entre frontend e materialização BigQuery.

### Indicadores Uniodonto (`src/lib/uniodontoMetrics.js`)

Disponíveis apenas no **Modo Uniodonto**. Contém ~50 métricas operacionais derivadas:

- `ranking_operacional`, `icu_score`, `icu_operacional`
- Índices de despesa (`assistenciais`, `administrativas`, `comerciais`)
- Despesa administrativa por hora/dia/semana/mês/ano
- Sinistralidade por hora/dia/semana/mês/ano
- Receita assistencial e repasse por prestador, por janela temporal
- Liquidez corrente/imediata, PMRC, PMPG espelhados

A função `computeUniodontoMetrics` recalcula os valores derivados no cliente para previsões e drilldowns.

### Indicadores monetários (`src/lib/monetaryIndicators.js`)

Mapa hierárquico de contas contábeis (Ativo `1*`, Passivo `2*`/`6*`, Receitas `31*`, Despesas `4*` etc.) usadas no **MonetarySummary**, na tabela de detalhe e no **Ranking Monetário**. Cada item conhece seu `vr_*`, e a função `applyDerivedMonetaryValues` calcula deltas e totais.

---

## 10. Filtros e modos de comparação

`src/lib/comparisonModes.js` define o conjunto `DEFAULT_COMPARISON_FILTERS` e helpers para descrição textual. Os filtros aceitam:

- **Modalidade** (Cooperativa odontológica, Odontologia de grupo, etc.)
- **Porte** (Pequeno, Médio, Grande — calculado por beneficiários: ≤19.999 / ≤99.999 / >99.999)
- **Ano** e **Trimestre**
- **Ativa?** (sim/não)
- **É Uniodonto?**
- Lista explícita de **reg_ans**
- **Busca textual** por nome

`comparisonFiltersToQuery` mantém o conjunto canônico, e `describeComparisonFilters` gera a etiqueta que aparece nas legendas dos gráficos e nos cards (ex.: "Médio porte • Cooperativa odontológica").

Toggle "Modo Uniodonto" troca:
- View base (`indicadores_mart_ans_consolidado` → `indicadores_mart_uniodonto_consolidado`).
- Catálogo de KPIs e ranking.
- Peer summary (`fetchAnsPeerSummary` → `fetchUniodontoPeerSummary`).
- Habilita per capita Uniodonto na aba Gráficos.

---

## 11. Importação de demonstrações contábeis

Permite que Singulares Uniodonto enviem suas demonstrações antes da publicação ANS, preenchendo `demonstracoes_contabeis_auxiliar`.

### Pré-requisitos

- Usuário precisa ter ao menos uma `operator.canUpload = true` no `accessProfile.operators` (regra avaliada em `App.jsx`).
- Botão "Atualize seus dados" no `AppHeader` só fica habilitado nessa condição.

### Fluxo

1. Abrir `OperadoraDataImportDialog`.
2. Selecionar operadora autorizada, ano/trimestre, modalidade.
3. Baixar template `/api/import/demonstracoes/template.csv` (ou exemplo preenchido).
4. Subir CSV com colunas `cd_conta_contabil;vl_saldo_final` (separador `;`, decimal `.`).
5. Backend valida, atribui `status=FECHADO`, `tipo_envio=NORMAL`, `modalidade=Cooperativa odontológica` por padrão, e grava em BQ.
6. View `vw_demonstracoes_contabeis_auxiliar_latest` é usada na consolidação seguinte.

### Auditoria

- Cada upload registra `uid`, `email`, timestamp e hash do payload em Firestore.
- O Cloud Run usa Service Account `ans-dashboard-run@bigdata-467917.iam.gserviceaccount.com`.

---

## 12. Variáveis de ambiente

### Build (Vite)

| Variável | Default | Uso |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | — | Auth no browser. |
| `VITE_FIREBASE_AUTH_DOMAIN` | — | Auth no browser. |
| `VITE_FIREBASE_PROJECT_ID` | `bigdata-467917` | Projeto Firebase. |
| `VITE_FIREBASE_APP_ID` | — | App Firebase. |
| `VITE_FIREBASE_STORAGE_BUCKET` | `bigdata-467917.firebasestorage.app` | Storage. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | — | Cloud Messaging. |
| `VITE_FIREBASE_MEASUREMENT_ID` | — | Analytics opcional. |
| `VITE_DATASET_VIEW` | `bigdata-467917.dash_ans.indicadores_curados_snapshot_consolidado` | View base. |
| `VITE_MART_ANS_TABLE` | `bigdata-467917.dash_ans.indicadores_mart_ans_consolidado` | Mart ANS. |
| `VITE_MART_UNIODONTO_TABLE` | `bigdata-467917.dash_ans.indicadores_mart_uniodonto_consolidado` | Mart Uniodonto. |
| `VITE_PRESTADORES_TABLE` | `dash_ans.prestadores_ativos_uniodonto_origem` | Tabela de prestadores. |
| `VITE_PRESTADORES_ORIGEM` | `PRÓPRIA` | Filtro padrão. |
| `VITE_PRESTADORES_CACHE_TTL_MS` | `43200000` | Cache de 12 h. |
| `VITE_QUERY_CACHE_TTL_MS` | `300000` | Cache de queries no client (5 min). |
| `VITE_QUERY_CACHE_MAX_ENTRIES` | `150` | Tamanho do cache. |
| `VITE_ALLOW_SIGNUP` | `true` | Liga/desliga a tela de cadastro. |

### Runtime (Express)

| Variável | Default | Uso |
|---|---|---|
| `SERVER_HOST` | `0.0.0.0` | Bind do Express. |
| `SERVER_PORT` / `PORT` | `4000` (local) / `8080` (Cloud Run) | Porta. |
| `BQ_PROJECT_ID` | `bigdata-467917` | Projeto BigQuery. |
| `BQ_DATASET` | `dash_ans` | Dataset principal. |
| `BQ_MART_DATASET` | `dash_ans` | Dataset dos marts. |
| `BQ_AUX_DATASET` | `dash_ans` | Dataset auxiliar (demonstrações manuais). |
| `BQ_EXPORT_VIEW` | `dash_ans.indicadores_curados_snapshot_consolidado` | View principal para `/api/query`. |
| `BQ_LOCATION` | `southamerica-east1` | Region obrigatória. |
| `BQ_ALLOWED_VIEWS` | lista | Whitelist explícita de fontes para `/api/query`. |
| `BQ_MAX_BYTES_BILLED` | `1073741824` (1 GB) | Limite por job. |
| `BQ_EXECUTE` | `false` | Habilita execução real (vs dry-run) de operações sensíveis. |
| `BQ_ENFORCE_USER_ACCESS` | `true` | Bloqueia usuários sem ACL. |
| `USER_ACCESS_CACHE_TTL_MS` | `60000` | Cache do perfil por usuário. |
| `QUERY_CACHE_TTL_MS` | `900000` | TTL do cache servidor (15 min). |
| `QUERY_CACHE_MAX_ENTRIES` | `250` | Tamanho máximo do cache. |
| `FIREBASE_PROJECT_ID` | `bigdata-467917` | Verifica tokens. |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | — | JSON da service account (local). |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Credencial GCP padrão. |
| `UHUB_API_BASE_URL` | `https://uhub.uniodonto.coop.br` | Base UHub. |
| `UHUB_API_TOKEN` / `UHUB_TOKEN` | — | Token UHub. |
| `UHUB_API_TIMEOUT_MS` | `5000` | Timeout HTTP. |
| `UHUB_OPERATOR_CACHE_TTL_MS` | `600000` | Cache do catálogo UHub. |
| `PFC_ONBOARDING_COLLECTION` | `pfc_users_uhub_link` | Firestore. |
| `PFC_ONBOARDING_LOG_COLLECTION` | `pfc_onboarding_audit_logs` | Firestore. |
| `PFC_MARKETING_EMAIL` | `marketing@uniodonto.coop.br` | Destinatário admin. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | — | Notificações. |
| `ACCESS_ADMIN_EMAIL_DOMAINS` | `uniodonto.coop.br,collos.com.br,contagbr.com.br` | Quem vira admin. |
| `SERVE_STATIC` | `true` em produção | Serve `dist/` direto pelo Express. |

---

## 13. Desenvolvimento local

### Pré-requisitos

- Node 22 e npm 10.
- Conta GCP com permissão de leitura no BigQuery `bigdata-467917`.
- Credencial Firebase Admin (JSON em `.cert/*-firebase-adminsdk*.json`).
- ADC do gcloud ou JSON de service account BigQuery em `.cert/`.

### Subida rápida

```bash
npm install
npm run env:init        # cria .env.local e .env.local.server a partir de exemplos
npm run dev:local       # roda client + API com as credenciais detectadas
```

Portas padrão:
- Frontend: <http://localhost:5173>
- API: <http://localhost:4000>

O script `scripts/dev-local.sh`:
- Carrega `.env.local` e `.env.local.server`.
- Procura credenciais em `~/.config/gcloud/application_default_credentials.json` ou `.cert/`.
- Roda `npm ci` se `node_modules` estiver desatualizado.
- Sobe `vite` + `node server/index.js` em paralelo via `concurrently`.

### Docker

```bash
npm run docker:dev:up
npm run docker:dev:logs
npm run docker:dev:down
```

### Lint, testes, build

```bash
npm run lint
npm test                # node --test (test runner nativo)
npm run build           # gera dist/
npm run preview         # serve dist/ localmente
```

---

## 14. Build, scripts e jobs de dados

Scripts npm relevantes:

| Script | O que faz |
|---|---|
| `dev` | client + API com `concurrently`. |
| `dev:client` | só Vite. |
| `dev:server` | só Express. |
| `dev:local` / `dev:reload` | wrappers com env de `.env.local*`. |
| `docker:dev:*` | helpers Docker Compose. |
| `build` | `vite build` para `dist/`. |
| `preview` | `vite preview`. |
| `lint` | ESLint completo. |
| `test` | `node --test` (todos os `*.test.js`). |
| `server` | `node server/index.js` direto. |
| `data:export-bq` | Exporta CSV consolidado. |
| `data:create-bq-view` | (Re)cria a view consolidada. |
| `data:refresh-bq-demonstracoes-base` | Atualiza `demonstracoes_contabeis` do datalake. |
| `data:refresh-bq-consolidated-indicators` | Recalcula marts ANS/Uniodonto. |
| `data:sync-beneficiarios-odontologicas` | Atualiza beneficiários ANS. |
| `data:inventory-bq-legacy` | Inventaria objetos legados. |
| `auth:revalidate-uhub` | Re-roda matching UHub para usuários existentes. |
| `data:materialize-bq-snapshot` | Materializa snapshot oficial ANS. |
| `data:materialize-bq-mart` | Materializa marts a partir do SQL persistido. |
| `data:materialize-bq-mart:local` | Versão local com `.env.local.server`. |

---

## 15. Deploy (Cloud Run / Cloud Build)

Pipeline em `cloudbuild.yaml`:

1. `docker build` com todos os `VITE_*` injetados como `--build-arg` (Vite empacota tudo no `dist/`).
2. `docker push` para `gcr.io/$PROJECT_ID/ans-dashboard:$SHORT_SHA`.
3. Gera `cloudrun-env.yaml` com as variáveis de runtime.
4. `gcloud run deploy ans-dashboard` na região `southamerica-east1`:
   - 1 vCPU, 1 GiB
   - `concurrency: 1`
   - `max-instances: 3`
   - `timeout: 300s`
   - Service account `ans-dashboard-run@bigdata-467917.iam.gserviceaccount.com`
   - `--allow-unauthenticated` (auth é por Firebase Token).

Tracking: o domínio `pfc.uniodonto.coop.br` aponta para o serviço Cloud Run via mapeamento de domínio.

---

## 16. Cache, performance e custo BigQuery

- **Cache cliente** (`queryResultCache` em `dataService.js`): map em memória com TTL `VITE_QUERY_CACHE_TTL_MS`, deduplicação de in-flight (`queryResultInFlight`), até `VITE_QUERY_CACHE_MAX_ENTRIES`.
- **Cache servidor** (`queryCache` + `inFlightQueries`): mesmo padrão, TTL `QUERY_CACHE_TTL_MS`, limite `QUERY_CACHE_MAX_ENTRIES`.
- **Cache de catálogos** UHub e operadoras com TTL próprio (default 10 min).
- **Quota por query** via `BQ_MAX_BYTES_BILLED` (1 GB por job).
- **Whitelist de tabelas** (`BQ_ALLOWED_VIEWS`) impede execução de qualquer view fora do escopo.
- **Materializações offline**: marts consolidados pré-calculam percentis e score regulatório, evitando window functions no caminho quente.
- **Recarga de prestadores** com TTL de 12 h (custosa, mas estável).

---

## 17. Segurança e governança

- Tokens **nunca** são gravados em log; o middleware loga apenas `uid` e `email`.
- `safeHash`, `last4`, `normalizePhoneForUhub` (em `server/uhubOnboarding.js`) garantem que dados sensíveis vão para Firestore já normalizados/hash.
- `BQ_EXECUTE=false` por padrão em produção: scripts destrutivos exigem flip explícito por deploy.
- `BQ_ENFORCE_USER_ACCESS=true` em produção. Domínios admin restritos.
- Headers Express padrão (sem custom CORS porque servimos do mesmo host).
- Body limit `5 MB` em `express.json` para evitar uploads gigantes via JSON.
- Validação por `zod` em rotas que aceitam payload livre.
- `dist/` é estático e só serve arquivos do build — não há diretório arbitrário exposto.

---

## 18. Operação e troubleshooting

### Healthchecks

```bash
curl -sS https://pfc.uniodonto.coop.br/api/health
bq show --format=json bigdata-467917:dash_ans
bq query --location=southamerica-east1 --use_legacy_sql=false 'SELECT 1 AS ok'
```

### Logs

- Cloud Run: `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="ans-dashboard"' --limit=200 --freshness=1h`.
- Local: stdout do `dev-local.sh`.

### Sintomas comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| Tela "Conta em ativação" persistente | Usuário sem registro em `user_operadora_acessos` | Aprovação manual via `AdminAccountsDialog` ou script `auth:revalidate-uhub`. |
| `429 bytesBilled excede` | Query muito ampla | Aplicar filtros, revisar `BQ_MAX_BYTES_BILLED`. |
| `403 Tabela não autorizada` | View fora de `BQ_ALLOWED_VIEWS` | Adicionar à whitelist no `cloudbuild.yaml`. |
| Login falha com "API key inválida" | `VITE_FIREBASE_*` faltando no build | Re-deploy com substituições do Cloud Build atualizadas. |
| Importação rejeitada | Usuário sem `canUpload` ou CSV com header errado | Conferir perfil e usar template oficial. |

---

## 19. Glossário

- **PFC** — Painel Financeiro Contábil ANS.
- **DIOPS** — Documento de Informações Periódicas das Operadoras de Planos de Saúde.
- **DM** — Despesa Médica (sinistralidade).
- **DA / DC / DOP** — Despesas Administrativas / Comerciais / Operacionais.
- **MLL** — Margem Líquida.
- **ROE** — Retorno sobre Patrimônio Líquido.
- **LC / LI** — Liquidez Corrente / Liquidez Imediata.
- **PMRC / PMPG** — Prazo Médio de Recebimento de Contraprestações / Pagamento de Eventos.
- **CPT** — Cobertura de Provisões Técnicas.
- **ICU** — Índice Cooperativista Uniodonto (composto operacional).
- **Singular** — Operadora cooperativa Uniodonto local.
- **UHub** — Plataforma central da Uniodonto do Brasil para cadastros e identidade.
- **Peer group** — Conjunto de operadoras usadas como referência comparativa.
- **Mart** — Tabela consolidada e pré-calculada para consumo do dashboard.

---

_Última revisão alinhada à branch `claude/add-documentation-frontend-lt7l2`._
