---
projeto: Painel Financeiro Contábil
tipo: API
tags:
  - API
---

> 📚 Parte de **[[Painel Financeiro Contábil]]** · _API_

# API import demonstracoes

## Resumo

Upload validado de demonstrações contábeis por operadora.

## Localização

- `server/index.js`
- `src/components/dashboard/OperadoraDataImportDialog.jsx`

## Conteúdo detalhado

| Método | Rotas | Auth |
|---|---|---|
| GET | `/api/import/operadora-demonstracoes/context` | Firebase |
| GET | `/api/import/demonstracoes/template.csv` | Firebase |
| GET | `/api/import/demonstracoes/exemplo.csv` | Firebase |
| POST | `/api/import/operadora-demonstracoes`, `/api/import/singular-demonstracoes` | Firebase + escopo upload |
O POST valida operador, permissão, limite de linhas, colunas aceitas, duplicidades e metadados. Insere em BigQuery por chunks de 500.
Após inserir, atualiza latest view e, por flags, views/indicadores consolidados.

### Contrato de validação parcial

Somente falhas de descrição ou mapeamento ausente para uma conta são elegíveis para importação parcial: a linha é ignorada e as demais linhas válidas podem ser persistidas.

Para cada linha ignorada, o relatório de devolução deve informar:

- linha do arquivo;
- conta recebida;
- motivo da rejeição.

Todos os demais erros são bloqueantes e impedem a persistência de qualquer linha do arquivo. O cliente deve receber a causa da falha; o relatório de devolução não transforma erro de schema, autorização, escopo, metadados, limite, duplicidade ou valor em erro ignorável.

A API é chamada por [OperadoraDataImportDialog](../03-components/OperadoraDataImportDialog.md), executa o [Fluxo de Upload de demonstrações](../10-fluxos/Upload de demonstrações.md) e grava em [Demonstrações auxiliar](../06-data-model/Demonstrações auxiliar.md).

## Bugs latentes / lacunas / divergências

> ⚠️ Inserção BigQuery via streaming e refresh de views podem ter consistência eventual; UI deve comunicar warning retornado.

## Permissões / acesso

| Quem | Pode |
|---|---|
| anônimo | Apenas rotas públicas documentadas quando aplicável |
| usuário autenticado | Dados conforme escopo `user_operadora_acessos` |
| admin | Rotas administrativas se email pertence a domínio privilegiado |

## Prompt para agente

```
Você vai mexer em API import demonstracoes.

Antes:
1. Leia handler completo antes de mudar upload.
2. Atualize frontend e template CSV junto com schema.
3. Preserve checagem `hasOperatorUploadAccess`.

NUNCA:
- Reintroduza Supabase, Postgres, SQLite, PM2, systemd ou VPS como fonte operacional.
- Consulte `datalake_ans` diretamente nas telas do dashboard.
- Crie link Markdown para arquivo de código; use inline code.

Para mudança relacionada, atualize TAMBÉM:
- A KB correspondente em `docs/knowledge-base/`.
- `README.md` ou `documentacao/OPERACAO_ATUAL.md` quando o contrato operacional mudar.
- Testes ou validação manual do fluxo afetado.
```
