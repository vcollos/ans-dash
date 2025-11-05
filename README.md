# Painel DIOPS RN 518

Dashboard interativo em Vite + React para análise dos indicadores DIOPS/ANS com processamento local (DuckDB-WASM) e componentes de UI inspirados no ShadCN.

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

O servidor de desenvolvimento fica disponível em `http://localhost:5173`. Os arquivos CSV/Parquet devem estar em `public/data` (já há exemplos com os dados de 20251103).

## Build de produção

```bash
npm run build
```

Os artefatos ficam em `dist/`. Para testar localmente:

```bash
npm run preview
```

## Estrutura relevante

- `src/lib/duckdbClient.js` – inicializa o DuckDB-WASM e compartilha a conexão.
- `src/lib/dataService.js` – orquestra o carregamento dos arquivos CSV/Parquet, cria a view normalizada e expõe consultas.
- `src/hooks/useDashboardController.js` – controla filtros, métricas selecionadas e faz as consultas reativas.
- `src/components` – componentes de UI (ShadCN adaptado), filtros e visualizações (Chart.js via `react-chartjs-2`).
- `public/data` – diretório para os arquivos regulatórios.

## Observações

- As bibliotecas pesadas (`@duckdb/duckdb-wasm`) adicionam arquivos WASM grandes ao build final; isso é esperado para processamento local.
- O export em CSV/JSON utiliza apenas os dados carregados em memória conforme os filtros ativos.
