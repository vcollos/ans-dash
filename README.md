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

## Assistente regulatório (ChatGPT)

- O bloco “Falar com ChatGPT” na barra lateral/móvel abre um diálogo para conversar com o agente **Marinho**. Ele recebe automaticamente os filtros, KPIs, ranking, séries e valores monetários exibidos na tela e usa apenas os PDFs carregados no vector store para responder.
- Configure as variáveis antes de iniciar o servidor/API:
  - `OPENAI_API_KEY`: chave do projeto OpenAI.
  - `OPENAI_VECTOR_STORE_ID`: vector store com as normas (padrão `vs_691d04557eac8191a3dbed8d80a90e4a`).
  - `OPENAI_WORKFLOW_ID` / `OPENAI_WORKFLOW_VERSION`: metadados opcionais para rastreamento (`wf_691cf24519088190be4a330d067c011605a94df9a2f95438`, versão `draft`).
  - `OPENAI_AGENT_MODEL`: modelo base (`gpt-4.1-mini-2025-04-14`).
- O backend expõe `POST /api/agent`, que roda `server/agentRunner.js` usando `@openai/agents` e `fileSearchTool` para cumprir o hard-retrieval. Nenhum SQL adicional é executado: o agente interpreta apenas o contexto enviado pelo usuário e o material normativo.
- Teste rápido:

```bash
curl -X POST http://localhost:4000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"question":"Qual a situação do ROE?", "context":{"kpis":{"retorno_pl_pct":1.2}}}'
```

O retorno inclui `answer` contendo o texto do agente e, quando aplicável, o JSON `{ "tool": "renderFormula", "latex": "..." }` no final da mensagem (interpretado automaticamente pelo frontend).

## Execução como serviço (systemd)

Um serviço de exemplo está em `scripts/ans-dashboard.service`. Ele executa `scripts/start-dashboard.sh`, que sobe a API Express e o Vite em paralelo (modo desenvolvimento). Para habilitar no host Linux:

```bash
sudo cp scripts/ans-dashboard.service /etc/systemd/system/ans-dashboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now ans-dashboard
```

Edite `User=`, `WorkingDirectory=` ou as variáveis de ambiente caso o projeto esteja em outro caminho. Os logs ficam disponíveis via `journalctl -u ans-dashboard -f`. Sempre verifique se `DATABASE_URL` está exportada no ambiente do serviço antes de iniciar.

## Solução de problemas

- **Invalid hook call / múltiplas cópias do React** – O `vite.config.js` agora força `dedupe: ['react', 'react-dom']`. Caso o erro persista, remova `node_modules`/`package-lock.json`, rode `npm install` e reinicie `npm run dev`.
- **Portas ocupadas** – Se o serviço já estiver em execução, parar com `systemctl stop ans-dashboard` antes de rodar `npm run dev` manualmente. Ajuste `SERVER_PORT` ou `VITE_PORT` nas variáveis do serviço se já existirem processos nas portas 4000/5173.
- **Uploads falhando** – confirme que `public/data` é gravável pelo usuário do serviço e que o request passa pelo middleware `/api/upload-dataset`.

## Atualizar o PostgreSQL a partir do Parquet

1. Copie o arquivo bruto para `public/data/20251213_contas_ans.parquet`.
2. Execute:

```bash
python3 scripts/import_parquet_dataset.py --dsn postgresql://usuario:senha@host:porta/ans_dashboard
```

O script depende de `pyarrow` e `psycopg`. Use `--batch-size` para ajustar o tamanho dos lotes durante o `COPY`. Ao final, a view `indicadores_curados` (definida em `db/views.sql`) fica pronta para atender às consultas em tempo real.
