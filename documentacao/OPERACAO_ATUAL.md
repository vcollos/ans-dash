# Operação Atual do ans-dash

## Estado ativo

- Aplicação: dashboard PFC/ANS.
- Frontend: Vite + React.
- Backend: Express em Cloud Run.
- Autenticação: Firebase Auth, validada no backend com Firebase Admin.
- Dados: BigQuery no projeto `bigdata-467917`.
- Location BigQuery obrigatória: `southamerica-east1`.
- Dataset de consumo do app: `dash_ans`.
- Domínio público: `https://pfc.uniodonto.coop.br`.

## BigQuery

O runtime deve apontar para objetos atuais em `bigdata-467917.dash_ans`.

Variáveis principais:

```env
BQ_PROJECT_ID=bigdata-467917
BQ_DATASET=dash_ans
BQ_MART_DATASET=dash_ans
BQ_EXPORT_VIEW=dash_ans.indicadores_curados_snapshot_consolidado
BQ_LOCATION=southamerica-east1
BQ_AUX_DATASET=dash_ans
```

Views/tabelas de leitura do frontend:

```env
VITE_DATASET_VIEW=bigdata-467917.dash_ans.indicadores_curados_snapshot_consolidado
VITE_MART_ANS_TABLE=bigdata-467917.dash_ans.indicadores_mart_ans_consolidado
VITE_MART_UNIODONTO_TABLE=bigdata-467917.dash_ans.indicadores_mart_uniodonto_consolidado
```

`datalake_ans` só deve aparecer em scripts de sincronização ou refresh que leem a origem canônica ANS para materializar dados em `dash_ans`.

## Desenvolvimento local

```bash
npm run dev:local
```

Portas padrão:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

## Deploy

O deploy é feito pelo `cloudbuild.yaml`.

O Cloud Run recebe `BQ_EXPORT_VIEW`, `BQ_LOCATION`, `BQ_ALLOWED_VIEWS`, Firebase e demais variáveis de runtime pelo arquivo YAML gerado no build.

## Validação mínima

```bash
npm run lint
npm test
npm run build
bq show --format=json bigdata-467917:dash_ans
bq query --location=southamerica-east1 --use_legacy_sql=false 'SELECT 1 AS ok'
curl -sS https://pfc.uniodonto.coop.br/api/health
```

## Fora do runtime

Não usar como fonte operacional:

- Supabase
- Postgres
- SQLite
- arquivos `.db`
- PM2
- systemd
- VPS

Registros antigos ficam em `documentacao/historico/`.
