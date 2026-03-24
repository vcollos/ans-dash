# Painel DIOPS RN 518

Dashboard interativo em Vite + React para análise de indicadores DIOPS/ANS consumindo dados do **BigQuery** via API Express. Autenticação é feita com **Firebase Auth** (ID token validado no backend). O deploy de produção roda no **Google Cloud Run**.

## Política Operacional

Este repositório segue uma política de sandbox operacional:
- sem banco de dados local
- execução local preferencial via Docker
- dados e autenticação usando apenas serviços remotos oficiais do projeto
- publicação por `commit + push + CI/CD + deploy`, quando solicitada

Documento de referência: [documentacao/politica-operacional-sandbox.md](/Volumes/SSD/Collos/ans-dash/documentacao/politica-operacional-sandbox.md)

## Pré-requisitos

- Node.js 18+
- npm 9+
- Acesso ao projeto GCP/BigQuery
- Projeto Firebase configurado

## Desenvolvimento local

O fluxo recomendado para desenvolvimento é o ambiente Docker do projeto. O comando `npm run dev` continua disponível para debug rápido no host, mas não é o caminho operacional principal.

```bash
npm install
npm run dev
```

Esse comando sobe **Vite + API** em paralelo (via `concurrently`).
- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

As portas/hosts locais podem ser sobrescritos via `.env.local` e `.env.local.server`:
- `VITE_HOST` / `VITE_PORT` (frontend; default `0.0.0.0:5173`)
- `SERVER_HOST` / `SERVER_PORT` (API; default `0.0.0.0:4000`)

Se quiser evitar exportar variáveis manualmente, use:
```bash
npm run dev:local
```
O script lê `.env.local.server` (opcional) e aplica defaults compatíveis com o projeto.

### Desenvolvimento local com Docker

Este é o fluxo padrão do repositório para subir o app em sandbox local.

Para rodar em ambiente controlado (sem mudar o deploy do Cloud Run), use:

```bash
npm run env:init
# edite .env.local e .env.local.server com seus valores
# autentique no Google Cloud CLI (ADC) ou use .cert/*.json (fora do Git)
# gcloud auth application-default login
npm run docker:dev:up
```

Esse fluxo sobe o mesmo app (Vite + API), com hot reload:
- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

O `docker-compose.dev.yml` publica as portas explicitamente e inclui `healthcheck` na API. No Docker Desktop, a linha `ans-dash` é o projeto Compose; expanda a seta para ver o serviço `dashboard` com `5173` e `4000`.

Comandos úteis:

```bash
npm run docker:dev:logs
npm run docker:dev:down
```

Arquivos de referência:
- `docker-compose.dev.yml` (somente desenvolvimento)
- `Dockerfile.dev` (imagem de desenvolvimento)
- `env/.env.local.example` e `env/.env.local.server.example` (templates versionados)
- o compose monta `${HOME}/.config/gcloud` em `/root/.config/gcloud` para usar ADC no container

### Importação de dados da operadora (tabela auxiliar)

- O botão **“Atualize seus dados”** aparece para usuários com pelo menos uma operadora vinculada com permissão de envio.
- O upload aceita `CSV`, `XLS` e `XLSX`.
- Os dados enviados **não** são gravados na tabela original da ANS.
- O backend grava em uma tabela auxiliar e mantém views auxiliares para consumo/controladoria.

### Variáveis essenciais (local)

**BigQuery (API):**
- `GOOGLE_APPLICATION_CREDENTIALS` (caminho do JSON da service account) **ou** `gcloud auth application-default login`.
- `BQ_PROJECT_ID` (ex.: `bigdata-467917`)
- `BQ_DATASET` (ex.: `dash_ans`) dataset padrão das tabelas/views usadas pelo projeto.
- `BQ_MART_DATASET` (ex.: `dash_ans`) dataset dos artefatos derivados do dashboard.
- `BQ_DATASET_VIEW` ou `BQ_EXPORT_VIEW` (ex.: `dash_ans.indicadores_curados_snapshot`)
- `BQ_LOCATION` (ex.: `US`)
- `BQ_ALLOWED_VIEWS` (opcional): lista de views/tabelas permitidas no `/api/query` (ex.: `bigdata-467917.dash_ans.indicadores_curados_snapshot,bigdata-467917.dash_ans.prestadores_ativos_uniodonto_origem`).
- `BQ_PRESTADORES_TABLE` (opcional): tabela de prestadores usada na complementação de dados.
- `BQ_AUX_DATASET` (opcional): dataset da tabela auxiliar de importação (default: `BQ_MART_DATASET`).
- `BQ_AUX_DEMONSTRACOES_TABLE` (opcional): tabela auxiliar de importação (default: `demonstracoes_contabeis_auxiliar`).
- `BQ_AUX_DEMONSTRACOES_LATEST_VIEW` (opcional): view com última versão por chave da importação (default: `vw_demonstracoes_contabeis_auxiliar_latest`).
- `BQ_BASE_DEMONSTRACOES_TABLE` (opcional): tabela base usada para view consolidada (default: `${BQ_PROJECT_ID}.${BQ_MART_DATASET}.demonstracoes_contabeis`).
- `BQ_CONSOLIDATED_DEMONSTRACOES_VIEW` (opcional): view consolidada (base ANS + auxiliar) (default: `${BQ_PROJECT_ID}.${BQ_AUX_DATASET}.vw_demonstracoes_contabeis_consolidada`).
- `BQ_REFRESH_CONSOLIDATED_VIEW` (opcional): `true|false` para atualizar a view consolidada ao final do upload (default: `true`).
- `DEMONSTRACOES_MAX_UPLOAD_ROWS` (opcional): limite de linhas por arquivo (default: `10000`).
- `BQ_USER_ACCESS_TABLE` (opcional): tabela de vínculo usuário x operadora (default: `user_operadora_acessos`).
- `BQ_ENFORCE_USER_ACCESS` (opcional): habilita bloqueio por operadora (default: `true`).
- `USER_ACCESS_CACHE_TTL_MS` (opcional): cache do perfil de acesso em ms (default: `60000`).
- `QUERY_CACHE_TTL_MS` (opcional): cache em ms para `/api/query` (default 60000).
- `QUERY_CACHE_MAX_ENTRIES` (opcional): tamanho máximo do cache (default 250).
- `SERVER_PORT` ou `PORT` (opcional): porta da API (default 4000 em dev).
- `SERVER_HOST` (opcional): host/bind da API (default `0.0.0.0`).
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
- `VITE_HOST` e `VITE_PORT` (host/porta do Vite; defaults `0.0.0.0` e `5173`).
- `VITE_ALLOWED_HOSTS` (lista separada por vírgula com hosts aceitos pelo Vite).
- `VITE_ALLOW_SIGNUP` (default `true`; use `false` para esconder "Criar conta").

**Firebase (API):**
- `FIREBASE_PROJECT_ID` (normalmente o mesmo do GCP)
- `FIREBASE_SERVICE_ACCOUNT_PATH` (opcional, recomendado quando a validação de token exigir chave dedicada do Firebase Admin, ex.: `.cert/bigdata-467917-firebase-adminsdk-*.json`)

No Docker dev, o `scripts/dev-local.sh` detecta automaticamente um arquivo `*firebase-adminsdk*.json` em `.cert/` e exporta `FIREBASE_SERVICE_ACCOUNT_PATH`.

## Autenticação

O login é feito via **Firebase Auth** (email/senha, link por email ou Google). O frontend envia o ID token e o backend valida com o Admin SDK. Sem token válido, as rotas `/api/*` retornam 401.

Com `BQ_ENFORCE_USER_ACCESS=true`, o backend também valida o vínculo do usuário na tabela `BQ_USER_ACCESS_TABLE` e limita as consultas/importações ao `reg_ans` autorizado.

Para **login por link**, o app envia um link para o email informado. Ao abrir o link, o navegador conclui o login automaticamente (ou solicita o email usado, se não estiver salvo).

### Cadastro de acesso por operadora

Com `BQ_ENFORCE_USER_ACCESS=true`, cada usuário precisa de vínculo na tabela de acesso:

1. Crie a tabela (se ainda não existir) usando `db/create_user_access_table.sql` (substitua `{{USER_ACCESS_TABLE}}` pelo FQN real).
2. Insira uma linha por `reg_ans` permitido para o usuário (mesmo `user_uid` ou `user_email` pode ter múltiplas linhas).
3. Defina `can_upload=true` apenas para operadoras onde o usuário pode enviar arquivo.

Sem vínculo ativo, o login funciona, mas o dashboard fica bloqueado até o cadastro do acesso.

## Dados (BigQuery)

- O frontend consulta a view definida em `VITE_DATASET_VIEW` (default: `dash_ans.indicadores_curados_snapshot`).
- O backend usa `BQ_DATASET_VIEW`/`BQ_EXPORT_VIEW` para `/api/indicadores.csv`.
- Para reduzir custo, materialize uma tabela snapshot (`dash_ans.indicadores_curados_snapshot`) e use-a como view principal.

## Deploy no Google Cloud Run

O deploy é automatizado via `cloudbuild.yaml`:

```bash
gcloud builds submit --config cloudbuild.yaml
```

A imagem é construída com as variáveis `VITE_FIREBASE_*` e `VITE_DATASET_VIEW`, e o serviço do Cloud Run recebe `BQ_*` e `FIREBASE_PROJECT_ID`.

O fluxo Docker local **não altera** o deploy automático: o Cloud Build usa `cloudbuild.yaml` + `Dockerfile` (produção), não o `docker-compose.dev.yml`.

Política de publicação:
- validar localmente com Docker antes de publicar
- quando solicitado, concluir com `commit`, `push` e acompanhamento do CI/CD
- só considerar deploy encerrado após confirmação do pipeline/revisão publicada

Para evitar deploy acidental ao subir para o GitHub:
- trabalhe em branch de feature (não em `main`);
- abra PR e faça merge quando quiser publicar;
- confirme no Cloud Build Trigger que o regex de branch está restrito ao branch de deploy (ex.: `^main$`).

## Endpoints principais

- `POST /api/query` – proxy de consultas (somente SELECT/WITH e tabelas permitidas).
- `GET /api/indicadores.csv` – export CSV via BigQuery.
- `GET /api/import/demonstracoes/template.csv` – template CSV da importação.
- `GET /api/import/demonstracoes/exemplo.csv` – exemplo CSV preenchido.
- `POST /api/import/operadora-demonstracoes` – upload de demonstrações para tabela auxiliar.
- `POST /api/import/singular-demonstracoes` – alias de compatibilidade para o endpoint novo.
- `GET /api/health` – healthcheck BigQuery.
- `GET /api/auth/status` – status do auth.
- `GET /api/auth/profile` – perfil autenticado + operadoras permitidas.


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
