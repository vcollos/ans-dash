# Painel DIOPS RN 518

Dashboard interativo em Vite + React para análise de indicadores DIOPS/ANS consumindo dados do **BigQuery** via API Express. Autenticação é feita com **Firebase Auth** (ID token validado no backend). O deploy de produção roda no **Google Cloud Run**.

## Pré-requisitos

- Node.js 18+
- npm 9+
- Acesso ao projeto GCP/BigQuery
- Projeto Firebase configurado

## Desenvolvimento local

```bash
npm install
npm run dev
```

Esse comando sobe **Vite + API** em paralelo (via `concurrently`).
- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

Se quiser evitar exportar variáveis manualmente, use:
```bash
npm run dev:local
```
O script lê `.env.local.server` (opcional) e aplica defaults compatíveis com o projeto.

### Variáveis essenciais (local)

**BigQuery (API):**
- `GOOGLE_APPLICATION_CREDENTIALS` (caminho do JSON da service account) **ou** `gcloud auth application-default login`.
- `BQ_PROJECT_ID` (ex.: `bigdata-467917`)
- `BQ_DATASET` (ex.: `datalake_ans`)
- `BQ_DATASET_VIEW` ou `BQ_EXPORT_VIEW` (ex.: `indicadores_curados_snapshot`)
- `BQ_LOCATION` (ex.: `US`)
- `BQ_ALLOWED_VIEWS` (opcional): lista de views/tabelas permitidas no `/api/query` (ex.: `indicadores_curados_snapshot,bigdata-467917.datalake_ans.prestadores_ativos_uniodonto_origem`).
- `BQ_PRESTADORES_TABLE` (opcional): tabela de prestadores usada na complementação de dados.
- `QUERY_CACHE_TTL_MS` (opcional): cache em ms para `/api/query` (default 60000).
- `QUERY_CACHE_MAX_ENTRIES` (opcional): tamanho máximo do cache (default 250).
- `SERVER_PORT` ou `PORT` (opcional): porta da API (default 4000 em dev).
- `SERVE_STATIC` (opcional): `true` para servir o `dist/` pelo Express.

**Firebase (frontend):** crie `.env.local` com as chaves do Firebase Web:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Outras variáveis Vite (opcionais):
- `VITE_DATASET_VIEW` (tabela/view principal do BigQuery; aceita `tabela`, `dataset.tabela` ou `projeto.dataset.tabela`).
- `VITE_PRESTADORES_TABLE` (tabela de prestadores para complementar dados).
- `VITE_PRESTADORES_ORIGEM` (default `PRÓPRIA`).
- `VITE_PRESTADORES_CACHE_TTL_MS` e `VITE_PRESTADORES_ERROR_TTL_MS` (cache local para prestadores).
- `VITE_API_PROXY` (proxy local da API; default `http://localhost:4000`).
- `VITE_ALLOW_SIGNUP` (default `true`; use `false` para esconder "Criar conta").

**Firebase (API):**
- `FIREBASE_PROJECT_ID` (normalmente o mesmo do GCP)

## Autenticação

O login é feito via **Firebase Auth** (email/senha, link por email ou Google). O frontend envia o ID token e o backend valida com o Admin SDK. Sem token válido, as rotas `/api/*` retornam 401.

Para **login por link**, o app envia um link para o email informado. Ao abrir o link, o navegador conclui o login automaticamente (ou solicita o email usado, se não estiver salvo).

## Dados (BigQuery)

- O frontend consulta a view definida em `VITE_DATASET_VIEW` (default: `indicadores_curados_snapshot`).
- O backend usa `BQ_DATASET_VIEW`/`BQ_EXPORT_VIEW` para `/api/indicadores.csv`.
- Para reduzir custo, materialize uma tabela snapshot (`indicadores_curados_snapshot`) e use-a como view principal.

## Deploy no Google Cloud Run

O deploy é automatizado via `cloudbuild.yaml`:

```bash
gcloud builds submit --config cloudbuild.yaml
```

A imagem é construída com as variáveis `VITE_FIREBASE_*` e `VITE_DATASET_VIEW`, e o serviço do Cloud Run recebe `BQ_*` e `FIREBASE_PROJECT_ID`.

## Endpoints principais

- `POST /api/query` – proxy de consultas (somente SELECT/WITH e tabelas permitidas).
- `GET /api/indicadores.csv` – export CSV via BigQuery.
- `GET /api/health` – healthcheck BigQuery.
- `GET /api/auth/status` – status do auth.


## Solução de problemas

- **Firebase invalid-api-key**: confira `.env.local` e reinicie o Vite.
- **401/403**: usuário sem sessão ou `FIREBASE_PROJECT_ID` divergente.
- **Falha no BigQuery**: verifique `BQ_PROJECT_ID/BQ_DATASET/BQ_DATASET_VIEW`, permissões e ADC.

## Estrutura relevante

- `server/index.js` – API Express (BigQuery + auth Firebase).
- `src/lib/dataService.js` – monta SQL e consome `/api/query`.
- `src/hooks/useDashboardController.js` – estado e consultas reativas.
- `db/export_indicadores.sql` – SQL do export CSV.
- `scripts/materialize_bq_snapshot.js` – gera snapshot no BigQuery.
