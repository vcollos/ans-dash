# ANS Dashboard – Documentação Completa (BigQuery + Cloud Run)

## 1. Visão Geral

O **ans-dashboard** é um painel interativo em **Vite + React** que consome indicadores financeiros da ANS diretamente do **BigQuery**. A API Express atua como proxy de consultas (`/api/query`) e exportação CSV (`/api/indicadores.csv`). A autenticação é feita via **Firebase Auth** e validada no backend com o Admin SDK. O deploy de produção roda no **Google Cloud Run**.

Fluxo resumido:

1. Os dados são mantidos no BigQuery (views/tabelas curadas).
2. A API Express executa consultas somente em views/tabelas permitidas.
3. O frontend monta filtros e consulta o endpoint `/api/query`.
4. O frontend renderiza rankings e gráficos com navegação otimizada (ex.: tabelas largas com rolagem horizontal e cabeçalho fixo).

## 2. Estrutura de Diretórios Principal

```
.
├── db/                     # export_indicadores.sql (CSV)
├── scripts/                # scripts BigQuery (view/snapshot/export)
├── server/                 # API Express (BigQuery + Firebase)
├── src/                    # frontend React
├── public/                 # assets estáticos
├── cloudbuild.yaml          # deploy Cloud Run
└── DOCUMENTATION.md         # este arquivo
```

## 3. Ambiente e Variáveis

### Backend (API)

| Variável | Descrição | Exemplo |
|---|---|---|
| `BQ_PROJECT_ID` | Projeto GCP | `bigdata-467917` |
| `BQ_DATASET` | Dataset BigQuery | `datalake_ans` |
| `BQ_DATASET_VIEW` / `BQ_EXPORT_VIEW` | View/tabela principal | `indicadores_curados_snapshot` |
| `BQ_LOCATION` | Localização | `US` |
| `BQ_ALLOWED_VIEWS` (opcional) | Lista de views/tabelas permitidas no `/api/query` | `indicadores_curados_snapshot,bigdata-467917.datalake_ans.prestadores_ativos_uniodonto_origem` |
| `BQ_PRESTADORES_TABLE` (opcional) | Tabela de prestadores usada na complementação | `bigdata-467917.datalake_ans.prestadores_ativos_uniodonto_origem` |
| `FIREBASE_PROJECT_ID` | Projeto Firebase | `bigdata-467917` |
| `QUERY_CACHE_TTL_MS` | Cache do `/api/query` em ms (opcional) | `60000` |
| `QUERY_CACHE_MAX_ENTRIES` | Máx. entradas no cache (opcional) | `250` |
| `SERVER_PORT` / `PORT` | Porta da API (opcional) | `4000` (dev) |
| `SERVE_STATIC` | Serve `dist/` via Express (opcional) | `true` |

### Frontend (Vite)

| Variável | Descrição |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Web config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Web config |
| `VITE_FIREBASE_APP_ID` | Firebase Web config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Web config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Web config |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Web config |
| `VITE_DATASET_VIEW` | View principal do BigQuery (default: `indicadores_curados_snapshot`) |
| `VITE_PRESTADORES_TABLE` (opcional) | Tabela de prestadores para complementar dados |
| `VITE_PRESTADORES_ORIGEM` (opcional) | Origem usada na tabela de prestadores (default `PRÓPRIA`) |
| `VITE_PRESTADORES_CACHE_TTL_MS` (opcional) | Cache local de prestadores (ms) |
| `VITE_PRESTADORES_ERROR_TTL_MS` (opcional) | Cache local de erro (ms) |
| `VITE_API_PROXY` (opcional) | API local durante `npm run dev` |

## 4. Dados no BigQuery

### 4.1 View principal

A view/tabela principal deve expor:
- dimensões (`reg_ans`, `ano`, `trimestre`, `modalidade`, `porte`, `uniodonto`, `ativa`)
- métricas (`vr_*`, `qt_beneficiarios`, `qt_prestadores`, etc.)
- colunas derivadas usadas pelas fórmulas do frontend

### 4.2 Snapshot recomendado

Para reduzir custo e latência, recomenda-se materializar `indicadores_curados_snapshot`.

```
npm run data:materialize-bq-snapshot
```

### 4.3 Prestadores

A API pode complementar `qt_prestadores` usando a tabela de prestadores. Ajuste:
- `VITE_PRESTADORES_TABLE` no frontend
- `BQ_PRESTADORES_TABLE` no backend
- `BQ_ALLOWED_VIEWS` se necessário

## 5. Backend (server/index.js)

- **Stack:** Express + BigQuery + Firebase Admin
- **Porta:** `SERVER_PORT` ou `PORT` (default 4000)
- **Segurança:** `/api/query` aceita apenas SELECT/WITH e valida se as tabelas estão no allowlist (`BQ_ALLOWED_VIEWS`).

Endpoints:
- `GET /api/health`
- `GET /api/indicadores.csv`
- `POST /api/query`

## 6. Frontend

O frontend monta filtros e queries via `src/lib/dataService.js` e gerencia estado em `src/hooks/useDashboardController.js`. Não há upload de dataset nem fallback para CSV/Parquet local.

### 6.1 Tabelas largas (ranking)

Para melhorar a usabilidade em tabelas com muitas colunas (ex.: ranking), o UI inclui:
- barra de rolagem horizontal visível (Radix ScrollArea)
- cabeçalho fixo (sticky header)
- colunas fixas à esquerda (ex.: `#`, `Operadora`, `Nº ANS`)
- seletor de colunas visíveis (com busca)
- botões de navegação horizontal (◀/▶)

Implementação principal: `src/components/dashboard/RankingChart.jsx`.

## 7. Scripts

| Script | Função |
|---|---|
| `scripts/create_bq_view.js` | Cria/atualiza view curada no BigQuery |
| `scripts/materialize_bq_snapshot.js` | Gera snapshot para reduzir custo |
| `scripts/export_indicadores_bq.js` | Export CSV via BigQuery |

## 8. Deploy (Cloud Run)

O `cloudbuild.yaml` realiza build e deploy automático:

```bash
gcloud builds submit --config cloudbuild.yaml
```

As variáveis `VITE_FIREBASE_*` entram como build args, e `BQ_*` e `FIREBASE_PROJECT_ID` são configuradas no runtime.
