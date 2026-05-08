# AGENTS.md

- Executar correções pontuais e evitar refatoração ampla sem pedido explícito.
- Stack atual: React/Vite, API Express, Firebase Auth, Cloud Run e BigQuery.
- BigQuery ativo: projeto `bigdata-467917`, location `southamerica-east1`, dataset de consumo `dash_ans`.
- `datalake_ans` é fonte canônica ANS quando necessário; `dash_ans` é a camada usada pelo dashboard.
- Não introduzir nem consultar Supabase, Postgres, SQLite, PM2, systemd ou VPS como fonte operacional.
- Antes de publicar, validar com `npm run lint`, `npm test`, `npm run build` e `/api/health`.
