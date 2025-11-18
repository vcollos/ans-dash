# Painel DIOPS RN 518

Dashboard interativo em Vite + React para análise dos indicadores DIOPS/ANS consumindo os dados diretamente de um PostgreSQL (via API Node/Express) e componentes de UI inspirados no ShadCN.

## Pré-requisitos

- Node.js 18+
- npm 9+

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Esse comando agora sobe **tanto** o Vite quanto a API Express em paralelo (via `concurrently`). O frontend fica acessível normalmente em `http://localhost:5173` (ou a próxima porta disponível) e já aponta pelo proxy `/api` para `http://localhost:4000`.

Se preferir controlar cada processo manualmente:

```bash
npm run dev:client   # apenas o Vite
npm run dev:server   # apenas a API Express
```

Independentemente da forma escolhida, garanta que a variável `DATABASE_URL` aponte para o PostgreSQL com as tabelas/visões definidas em `db/schema.sql` e `db/views.sql`.

### Otimizando consultas com materialized view

Quando o volume de filtros e comparações aumenta, é recomendável materializar os indicadores com os cálculos mais usados. O script abaixo gera/atualiza a `MATERIALIZED VIEW` `indicadores_metricas` (que inclui as colunas derivadas de `src/lib/metricFormulas.js`):

```bash
npm run data:materialize   # usa DATABASE_URL para se conectar
```

Depois de gerar a view, exponha-a ao frontend criando um `.env.local` (ou exportando no shell) com `VITE_DATASET_VIEW=indicadores_metricas`. Assim o dashboard consulta diretamente os campos já calculados e evita repetir fórmulas pesadas a cada requisição.

## Build de produção

```bash
npm run build
```

Os artefatos ficam em `dist/`. Para testar localmente:

```bash
npm run preview
```

## Estrutura relevante

- `server/index.js` – API Express que executa as consultas SQL (via `/api/query`) diretamente no PostgreSQL.
- `src/lib/dataService.js` – monta as instruções SQL de acordo com os filtros e consome o endpoint `/api/query`.
- `src/hooks/useDashboardController.js` – controla filtros, métricas selecionadas e faz as consultas reativas.
- `src/components` – componentes de UI (ShadCN adaptado), filtros e visualizações (Chart.js via `react-chartjs-2`).
- `public/data` – diretório opcional com insumos locais (Parquet) usados pelos scripts de importação.

## Observações

- Todo cálculo (sinistralidade, DA, DC, DOP etc.) é executado no Postgres com base no plano de contas oficial. O frontend apenas apresenta os resultados.
- O botão de upload deixa de aceitar `.csv/.parquet` – o dataset precisa ser carregado no banco via scripts antes de iniciar o dashboard.
- Utilize `scripts/import_parquet_dataset.py` para povoar o banco diretamente a partir de `public/data/20251213_contas_ans.parquet`. O script trunca `demonstracoes_contabeis`, insere os 4M+ registros e atualiza `operadoras_metadata`.
- Caso prefira manter um CSV curado para outros fins, `scripts/build_curated_dataset.py` continua disponível (usa DuckDB localmente) mas não é mais necessário para o dashboard.

## Atualizar o PostgreSQL a partir do Parquet

1. Copie o arquivo bruto para `public/data/20251213_contas_ans.parquet`.
2. Execute:

```bash
python3 scripts/import_parquet_dataset.py --dsn postgresql://usuario:senha@host:porta/ans_dashboard
```

O script depende de `pyarrow` e `psycopg`. Use `--batch-size` para ajustar o tamanho dos lotes durante o `COPY`. Ao final, a view `indicadores_curados` (definida em `db/views.sql`) fica pronta para atender às consultas em tempo real.
