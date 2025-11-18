# ANS Dashboard – Documentação Completa

## 1. Visão Geral

O projeto **ans-dashboard** é um painel interativo construído com **Vite + React** que exibe indicadores exigidos pela ANS/RN 518. Todos os cálculos são executados em um banco **PostgreSQL** através de uma API Express, permitindo filtrar operadoras, portes, modalidades, períodos e comparar resultados com pares.

Fluxo resumido:

1. Scripts Python/Node importam os arquivos DIOPS (CSV/Parquet) para o Postgres.
2. Views e materialized views pré-calculam as contas contábeis e métricas.
3. O backend (`server/index.js`) expõe `/api/query` e `/api/indicadores.csv`.
4. O frontend (`src/`) consome esses endpoints via `src/lib/dataService.js`.
5. A camada de estado (`src/hooks/useDashboardController.js`) reage aos filtros e alimenta gráficos/tabelas e cartões de KPI.

## 2. Estrutura de Diretórios Principal

```
.
├── db/                     # schema.sql, views.sql, export_indicadores.sql
├── public/data/            # insumos opcionais (.csv/.parquet) para scripts
├── scripts/                # importação de dados e materialização de métricas
├── server/                 # API Express (query proxy e exportador CSV)
├── src/
│   ├── hooks/              # controllers e estado (useDashboardController)
│   ├── lib/                # serviços de dados, fórmulas e utilitários
│   ├── components/         # UI ShadCN + visualizações (Chart.js/Recharts)
│   └── main.jsx            # bootstrapping do React
├── package.json            # scripts npm e dependências
└── DOCUMENTATION.md        # este arquivo
```

## 3. Ambiente e Variáveis

| Variável                        | Descrição                                                                                               | Valor padrão                                   |
|--------------------------------|---------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| `DATABASE_URL`                 | DSN Postgres usado pelos scripts e pela API Express.                                                    | `postgresql://ansdashboard:ansdashboard@localhost:5432/ans_dashboard` |
| `VITE_API_PROXY`               | URL alvo para `/api` durante `npm run dev/preview`.                                                     | `http://localhost:4000`                        |
| `VITE_DATASET_VIEW`           | Nome da view usada pelas consultas do frontend.                                                         | `indicadores_curados`                         |
| `VITE_DATASET_CURATED_URL`    | Fonte CSV curada legacy (não usada no modo Postgres).                                                   | `/data/indicadores.csv`                       |
| `VITE_DATASET_PARQUET_URL`    | Fonte Parquet legacy (não usada no modo Postgres).                                                      | `/data/20251213_contas_ans.parquet`           |
| `VITE_DATASET_URL`            | Fallback para `/api/indicadores.csv`.                                                                    | `/api/indicadores.csv`                        |

Para ambientes locais, use `.env.local` na raiz:

```bash
DATABASE_URL=postgresql://usuario:senha@localhost:5432/ans_dashboard
VITE_DATASET_VIEW=indicadores_metricas      # após materializar
```

## 4. Banco de Dados

### 4.1 Tabelas

#### `demonstracoes_contabeis_staging`
Utilizada pelos scripts de importação para staging de arquivos brutos.

| Coluna                 | Tipo  | Descrição                                                     |
|------------------------|-------|----------------------------------------------------------------|
| data, reg_ans, cd_conta_contabil, ... | TEXT | Valores brutos importados do DIOPS.                     |

#### `demonstracoes_contabeis`
Tabela principal com as contas contábeis normalizadas.

| Coluna                             | Tipo                | Notas                                                         |
|------------------------------------|---------------------|--------------------------------------------------------------|
| `id`                               | BIGSERIAL PK        |                                                               |
| `data`, `ano`, `trimestre`         | DATE/SMALLINT       | Controle temporal e partição lógica.                         |
| `reg_ans`, `operadora`, `modalidade`, `porte`, `uniodonto`, `ativa` | Diversos | Metadados das operadoras. |
| `cd_conta_contabil`, `vl_saldo_final` | TEXT/NUMERIC(20,4) | Valores consolidados por conta contábil.                     |

Índices existentes: `idx_dc_reg_periodo`, `idx_dc_conta`.

#### `plano_de_contas`
Vocabulário das contas contábeis (nome, natureza, somatórios, etc.).

#### `operadoras_metadata`
Metadados complementares (porte/nome por `reg_ans`).

### 4.2 Views

#### `indicadores_curados` (`db/views.sql`)
Principais transformações:

1. Agrupa `demonstracoes_contabeis` por `reg_ans`/`ano`/`trimestre`.
2. Soma valores das contas relevantes (3, 4, 311, 3117, 21, 25, etc.).
3. Calcula derivados como `resultado_financeiro` ou `resultado_liquido`.
4. Adiciona deltas (`delta_vr_contraprestacoes`, etc.) via janela `LAG`.
5. Determina `trimestre_rank` para permitir selecionar o período mais recente por padrão.

Colunas chave: `qt_beneficiarios`, `vr_*` (contas), `prev_*`, `delta_*`, `periodo_id`, `periodo`.

#### `indicadores_metricas` (Materialized View)
Gerada pelo script `npm run data:materialize`. Inclui todas as colunas de `indicadores_curados` **e** as métricas derivadas presentes em `src/lib/metricFormulas.js`. Índices:

- `indicadores_metricas_pk` em `(reg_ans, ano, trimestre)`
- `indicadores_metricas_periodo_idx` em `(ano DESC, trimestre DESC)`
- `indicadores_metricas_nome_operadora_idx` em `nome_operadora`

Recriação:

```bash
npm run data:materialize
# ou: node scripts/materialize_metrics.js
```

### 4.3 Exportação

`db/export_indicadores.sql` define o CSV disponibilizado em `/api/indicadores.csv`, contendo campos amigáveis aos usuários (por exemplo `311_vr_contraprestacoes`, `41_vr_eventos_liquidos`, `ativa`, `uniodonto`, etc.).

## 5. Backend (server/index.js)

- **Stack:** Express + `pg`.
- **Configuração:** Porta `process.env.SERVER_PORT ?? process.env.PORT ?? 4000`; `DATABASE_URL` para conexão.
- **Endpoints:**
  - `GET /api/health`: executa `SELECT 1` no Postgres.
  - `GET /api/indicadores.csv`: roda o SQL de `db/export_indicadores.sql` e retorna CSV.
  - `POST /api/query`: recebe `{ sql }`, valida se é uma consulta `SELECT/WITH` única, e devolve `{ rows }`.
- **Upload middleware:** durante `vite dev/preview`, `vite.config.js` adiciona `/api/upload-dataset` para receber arquivos e salvá-los em `public/data/`.

## 6. Frontend

### 6.1 Fluxo de Estado (`useDashboardController`)

1. **Bootstrap:** `loadDataset()` garante acesso ao Postgres e busca opções de operadoras e períodos.
2. **Filtros:** mantidos em `defaultFilters`. Há suporte a comparações via `comparisonFilters`.
3. **Consultas principais:** `fetchKpiSummary`, `fetchRanking`, `fetchTableData` são rodadas em paralelo sempre que filtros mudam. Para operadores selecionados:
   - As métricas usam `operatorName` e `regAns`.
   - A tabela detalhada traz todas as colunas (ou um subconjunto) ignorando filtros de período.
4. **Séries temporais:** `fetchTrendSeries` gera dados para os gráficos (média geral x pares ou operador x pares).
5. **Snapshots:** `fetchOperatorSnapshot` busca o período disponível, peers (média dos pares) e métricas calculadas via `cardMetricColumnsSql`.
6. **Upload dataset:** `replaceDataset` continua disponível mas, no modo Postgres, apenas lê arquivos para persistência manual (erro se tentar `csvText` ou `parquetBuffer` enquanto a API está conectada).

### 6.2 Serviços (`src/lib/dataService.js`)

Principais funções:

| Função                    | Descrição                                                                                     |
|---------------------------|-------------------------------------------------------------------------------------------------|
| `loadDataset`             | Verifica se a view definida em `VITE_DATASET_VIEW` está acessível (`SELECT 1 FROM view`).      |
| `fetchAvailablePeriods`   | Lista anos e trimestres disponíveis.                                                           |
| `fetchOperatorOptions`    | Nomes de operadoras (opcionalmente filtrados por período).                                    |
| `fetchKpiSummary`         | Executa `summarizePeriod` (agrupamento + métricas).                                            |
| `fetchTrendSeries`        | Gera séries com `AVG(metricSql[metric])` por período.                                         |
| `fetchOperatorSnapshot`   | Retorna dados da operadora e peers (incluindo métricas calculadas).                           |
| `fetchRanking`            | Produz ranking com `ROW_NUMBER()` e, opcionalmente, uma linha referente ao operador selecionado. |
| `fetchTableData`          | Pagina a tabela detalhada. Quando `includeAllColumns` é `true`, descobre colunas via `information_schema`. |

### 6.3 Componentes

- **`components/dashboard`**: `KpiCards`, `RankingChart`, `IndicatorTrendChart`, `MonetarySummary`, `DataTable`. Utilizam `metricFormulas` para labels e formatação.
- **`components/filters`**: `FiltersPanel` renderiza seletores (modalidade, porte, período, Uniodonto, ativa, etc.).
- **UI**: ShadCN adaptado em `components/ui/`, `lucide-react` para ícones, `react-chartjs-2` para gráficos.

## 7. Fórmulas de Métricas (`src/lib/metricFormulas.js`)

Todas as fórmulas são strings SQL convertidas em `metricSql`. Helpers:

- `safePercent(numerador, denominador)` – evita divisão por zero.
- `safeRatio(numerador, denominador)` – idem sem multiplicar por 100.
- `safeDays(numerador, denominador, dias)` – calcula prazos médios.

| ID                             | Código | Formato  | Tendência | Fórmula (descrição)                                                                                   |
|--------------------------------|--------|----------|-----------|--------------------------------------------------------------------------------------------------------|
| `margem_lucro_pct`             | MLL    | percent  | higher    | `resultado_liquido / vr_contraprestacoes`                                                             |
| `retorno_pl_pct`               | ROE    | percent  | higher    | `resultado_liquido / vr_patrimonio_liquido`                                                           |
| `sinistralidade_pct`           | DM     | percent  | lower     | `(41 + ABS(3117)) / (31 - 321 + ABS(3117))` – fórmula ANS RN 518                                      |
| `sinistralidade_acumulada_pct` | DM_ACUM| percent  | lower     | Versão acumulada anual da fórmula de sinistralidade.                                                  |
| `sinistralidade_trimestral_pct`| DM_TRIM| percent  | lower     | Fluxo trimestral usando deltas `delta_vr_*`.                                                          |
| `despesas_adm_pct`             | DA     | percent  | lower     | `46 / (31 - 32 + |3117|)`                                                                             |
| `despesas_comerciais_pct`      | DC     | percent  | lower     | `43 / (31 - 32 + |3117|)`                                                                             |
| `despesas_operacionais_pct`    | DOP    | percent  | lower     | `(41 + |3117| + 43 + 46 + 44) / ((31 - 32 + |3117|) + 33)`                                           |
| `indice_resultado_financeiro_pct` | IRF | percent | higher    | `(35 - 45) / 311121`                                                                                   |
| `liquidez_corrente`            | LC     | decimal  | higher    | `12 / 21`                                                                                              |
| `capital_terceiros_sobre_pl`   | CT/PL  | decimal  | lower     | `(21 + 23) / 25`                                                                                       |
| `pmcr`                         | PPMCR  | days     | lower     | `(1231 * 90) / 311121`                                                                                |
| `pmpe`                         | PPME   | days     | lower     | `(2111 * 90) / 41`                                                                                    |
| ...                            |        |          |           | (Outras métricas podem ser adicionadas em `metricFormulas`.)                                          |

`metricSql` é um objeto `id -> SQL`. Outras partes do app (ranking, tabela, cartas) usam esse mapa para gerar consultas.

## 8. Scripts Auxiliares

| Script                              | Descrição                                                                                         |
|-------------------------------------|-----------------------------------------------------------------------------------------------------|
| `scripts/import_parquet_dataset.py` | Importa Parquet bruto para `demonstracoes_contabeis` (usa `pyarrow` + `psycopg`).                   |
| `scripts/import_demonstracoes.py`   | Alternativa para CSVs menores.                                                                     |
| `scripts/build_curated_dataset.py`  | Usa DuckDB para gerar CSV curado (legado).                                                         |
| `scripts/export_indicadores.sh`     | Roda `psql -f db/export_indicadores.sql` e exporta CSV.                                            |
| `scripts/materialize_metrics.js`    | Cria/atualiza `indicadores_metricas` e respectivos índices.                                        |

## 9. Fluxo de Desenvolvimento

1. **Instalação:** `npm install`.
2. **Banco:** usar scripts de importação para popular `demonstracoes_contabeis`, garantir `db/views.sql` aplicado e rodar `npm run data:materialize`.
3. **Ambiente:** definir `.env.local` com `DATABASE_URL` e `VITE_DATASET_VIEW`.
4. **Desenvolvimento:** `npm run dev` (sobe Vite e API Express simultaneamente). O front consulta `/api/query` automaticamente.
5. **Build:** `npm run build` gera `dist/`. `npm run preview` testa build com proxy `/api`.

## 10. Operação e Monitoramento

- **Logs Backend:** `server/index.js` loga `console.error` com prefixo `[server]`. Erros SQL (ex.: falta de colunas ou permissões) aparecem no terminal.
- **Saúde:** `curl http://localhost:4000/api/health`.
- **CSV Export:** `curl http://localhost:4000/api/indicadores.csv` (útil para auditoria).
- **Grant de permissões:** assegure `GRANT SELECT ON indicadores_curados/indicadores_metricas TO ansdashboard;`.

## 11. Extendendo o Sistema

1. **Novas métricas:**
   - Adicione a definição em `src/lib/metricFormulas.js` (id, label, `safePercent/safeRatio`, `format`).
   - Atualize scripts/views caso deseje pré-calcular no banco (ou confie no `metricSql`).
   - Re-rodar `npm run data:materialize` para atualizar a view.
2. **Novos filtros:**
   - Ajuste `defaultFilters` em `useDashboardController`.
   - Atualize `buildWhereClause` e `getWhereExpression` em `dataService`.
   - Expanda `FiltersPanel` para incluir UI.
3. **Outras fontes de dados:** Os scripts e a API assumem Postgres. Caso use DuckDB/CSV standalone, seria necessário reintroduzir o antigo `duckdbClient` (removido) e adaptar `dataService`.

## 12. Referências de Dados

- **Contas contábeis** seguem o plano oficial ANS (prefixos 3/4 receitas/despesas, 31/32 ativos/provisões).
- **Resultado líquido** é calculado tanto diretamente (`vr_receitas - vr_despesas`) quanto em variantes (`resultado_liquido_final_ans`, `resultado_liquido_informado`).
- **Deltas e `trimestre_rank`** permitem análises temporais (sinistralidade trimestral, séries de tendência).
- **Export SQL** mantém nomes amigáveis (`31_vr_ativos_garantidores`) para cruzamentos externos.

---

Esta documentação serve como referência completa para desenvolvedores e analistas que mantêm ou expandem o painel ANS/RN 518. Ao atualizar componentes, mantenha este arquivo sincronizado com a implementação real.***
