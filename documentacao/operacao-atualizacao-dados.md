# Operacao de atualizacao de dados e materializacao de indicadores

Este documento descreve o procedimento que o administrador deve seguir sempre que um novo periodo de dados for publicado (atualizacao trimestral).

## Visao geral do fluxo
1) Ingestao/atualizacao dos dados brutos no BigQuery.
2) Atualizacao da view base de indicadores (indicadores_curados) se houver mudancas de schema.
3) Materializacao do snapshot (indicadores_curados_snapshot).
4) Materializacao das tabelas mart (indicadores_mart_ans e indicadores_mart_uniodonto).
5) Verificacoes rapidas de integridade.
6) Reinicio/redeploy do app (se necessario).

## Pre-requisitos
- Service account ou usuario com permissoes no BigQuery:
  - bigquery.jobs.create
  - bigquery.tables.create
  - bigquery.tables.get
  - bigquery.tables.updateData
  - Sugestao de roles: BigQuery Job User + BigQuery Data Editor (no dataset).
- Credenciais configuradas via Application Default Credentials (ADC) ou via GOOGLE_APPLICATION_CREDENTIALS.

## Variaveis de ambiente (local)
Arquivo recomendado: `.env.local.server`

```
BQ_PROJECT_ID=bigdata-467917
BQ_DATASET=datalake_ans
BQ_EXPORT_VIEW=indicadores_curados_snapshot
BQ_SOURCE_TABLE=bigdata-467917.datalake_ans.indicadores_curados_snapshot
BQ_MART_ANS_TABLE=indicadores_mart_ans
BQ_MART_UNIODONTO_TABLE=indicadores_mart_uniodonto
BQ_MART_DATASET=dash_ans
BQ_ALLOWED_VIEWS=bigdata-467917.datalake_ans.indicadores_curados_snapshot,bigdata-467917.dash_ans.indicadores_mart_ans,bigdata-467917.dash_ans.indicadores_mart_uniodonto,bigdata-467917.datalake_ans.prestadores_ativos_uniodonto_origem
BQ_LOCATION=US
GOOGLE_APPLICATION_CREDENTIALS=/Users/vitor/Documents/Dev/ans-dash/.cert/bigdata-467917-16c1318c138a.json
```

Variaveis front-end (Vite) em `.env.local`:
```
VITE_DATASET_VIEW=bigdata-467917.datalake_ans.indicadores_curados_snapshot
VITE_MART_ANS_TABLE=bigdata-467917.dash_ans.indicadores_mart_ans
VITE_MART_UNIODONTO_TABLE=bigdata-467917.dash_ans.indicadores_mart_uniodonto
```

## Passo a passo (novo periodo)

### 0) Dataset dedicado para o dashboard (recomendado)
Recomenda-se isolar as tabelas do dashboard em um dataset separado (ex.: `dash_ans`). Isso evita misturar marts do dashboard com o datalake principal.

Passos:
- Crie o dataset `dash_ans` no mesmo projeto.
- Conceda a service account usada pelo backend as permissoes de criacao/escrita no dataset.

Exemplo (via console ou `bq`):
```
bq --location=US mk --dataset bigdata-467917:dash_ans
```


### 1) Atualizar os dados brutos
- Carregue os novos dados no dataset de origem.
- Se houver mudancas de colunas, atualize o script/view base.

### 2) Atualizar a view base (se necessario)
Se a view `indicadores_curados` precisa ser recriada:
```
npm run data:create-bq-view
```

### 3) Materializar o snapshot
```
npm run data:materialize-bq-snapshot
```

### 4) Materializar as tabelas mart (ANS + Uniodonto)
Local (usando .env.local.server):
```
npm run data:materialize-bq-mart:local
```

Direto (ADC):
```
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
npm run data:materialize-bq-mart
```

### 5) Verificacoes rapidas
Exemplos de consultas:
```
-- ultimo periodo disponivel
SELECT MAX(periodo_id) AS ultimo_periodo FROM `bigdata-467917.datalake_ans.indicadores_mart_ans`;
SELECT MAX(periodo_id) AS ultimo_periodo FROM `bigdata-467917.datalake_ans.indicadores_mart_uniodonto`;

-- total de operadoras no ultimo periodo
SELECT periodo_id, COUNT(*) AS operadoras
FROM `bigdata-467917.datalake_ans.indicadores_mart_ans`
GROUP BY periodo_id
ORDER BY periodo_id DESC
LIMIT 4;
```

### 6) Reiniciar/redeploy do app
- Local: reiniciar o `npm run dev`.
- Cloud Run/Vercel/etc: se as envs ou dataset foram alterados, publique nova revisao.

## Solucao de problemas

### Erro: Permission bigquery.tables.create denied
- A conta usada nao tem permissao de criar tabelas no dataset.
- Corrija a permissao (BigQuery Data Editor no dataset) e rode novamente.

### Erro: Could not load the default credentials
- Configure ADC com `gcloud auth application-default login` ou defina `GOOGLE_APPLICATION_CREDENTIALS`.

## Observacoes
- O app agora tenta usar as tabelas mart quando `VITE_MART_ANS_TABLE` e `VITE_MART_UNIODONTO_TABLE` estao definidas.
- Caso nao estejam definidas, o sistema volta a usar a view base e calcula as formulas sob demanda.
- Se aparecer erro 403 em `/api/query`, confirme que `BQ_ALLOWED_VIEWS` inclui as tabelas mart, o snapshot e `prestadores_ativos_uniodonto_origem`.
