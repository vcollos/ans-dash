# ans-dash

Dashboard PFC/ANS em Vite + React, API Express, Firebase Auth, Cloud Run e BigQuery.

Fonte operacional atual:

- Projeto: `bigdata-467917`
- BigQuery location: `southamerica-east1`
- Dataset ativo do app: `dash_ans`
- Serviço Cloud Run: `ans-dashboard`
- Domínio público: `https://pfc.uniodonto.coop.br`

Documentação atual:

- [Operação atual](documentacao/OPERACAO_ATUAL.md)
- [Inventário de legados](documentacao/INVENTARIO_LEGADOS.md)

Comandos principais:

```bash
npm run dev:local
npm run lint
npm test
npm run build
```

Não usar Supabase, Postgres, SQLite, PM2, systemd ou VPS neste projeto. Documentos antigos foram arquivados em `documentacao/historico/`.
