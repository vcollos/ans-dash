# Inventário de Legados

## Classificação

| Item | Status | Tratamento |
|---|---|---|
| Supabase | removido do runtime | nenhuma referência operacional ativa |
| Postgres/SQLite | removido do runtime | permitido apenas em documentação histórica |
| PM2/systemd/VPS | removido do runtime | documentação antiga arquivada |
| `BQ_DATASET_VIEW_ANS` / `BQ_DATASET_VIEW_UNIODONTO` | removido | usar `BQ_MART_ANS_TABLE` e `BQ_MART_UNIODONTO_TABLE` |
| `VITE_DATASET_VIEW_ANS` / `VITE_DATASET_VIEW_UNIODONTO` | removido | usar `VITE_MART_ANS_TABLE` e `VITE_MART_UNIODONTO_TABLE` |
| `dash_ans_uploads` | ausente/histórico | `bq show` retornou dataset inexistente; runtime atual usa `dash_ans` |
| `dash_ans_historico` | ativo para arquivo | dataset histórico em `southamerica-east1`, fora do runtime |
| `datalake_ans` | ativo restrito | origem canônica para scripts de sincronização/materialização |
| schema `registro_operadora` | removido | base ativa deve expor `reg_ans` |

## BigQuery ativo

- `bigdata-467917.dash_ans.indicadores_curados_snapshot_consolidado`
- `bigdata-467917.dash_ans.indicadores_mart_ans_consolidado`
- `bigdata-467917.dash_ans.indicadores_mart_uniodonto_consolidado`
- `bigdata-467917.dash_ans.prestadores_ativos_uniodonto_origem`
- `bigdata-467917.dash_ans.demonstracoes_contabeis`
- `bigdata-467917.dash_ans.demonstracoes_contabeis_auxiliar`
- `bigdata-467917.dash_ans.vw_demonstracoes_contabeis_auxiliar_latest`
- `bigdata-467917.dash_ans.vw_demonstracoes_contabeis_consolidada`

## Objetos BigQuery arquivados

Objetos antigos de indicadores foram copiados para `bigdata-467917.dash_ans_historico` com prefixo `legacy_`.

| origem | histórico | linhas origem | linhas histórico |
|---|---|---:|---:|
| `dash_ans.indicadores_curados` | `dash_ans_historico.legacy_indicadores_curados` | 19441 | 19441 |
| `dash_ans.indicadores_curados_snapshot` | `dash_ans_historico.legacy_indicadores_curados_snapshot` | 19441 | 19441 |
| `dash_ans.indicadores_mart_ans` | `dash_ans_historico.legacy_indicadores_mart_ans` | 19441 | 19441 |
| `dash_ans.indicadores_mart_uniodonto` | `dash_ans_historico.legacy_indicadores_mart_uniodonto` | 19441 | 19441 |

As origens não foram apagadas nem renomeadas.

## Histórico

Arquivos de documentação anteriores foram movidos para `documentacao/historico/`.

Objetos BigQuery antigos devem ser movidos para `bigdata-467917.dash_ans_historico` somente após:

1. inventário por `INFORMATION_SCHEMA`;
2. confirmação de zero dependências em views ativas;
3. cópia validada com contagem de linhas;
4. validação do app usando apenas `dash_ans`.
