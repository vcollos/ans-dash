---
projeto: Painel Financeiro Contábil
tipo: Fluxo
tags:
  - Fluxo
---

> 📚 Parte de **[[Painel Financeiro Contábil]]** · _Fluxos_

# Upload de demonstrações

## Resumo

Fluxo completo de envio contábil por operadora autorizada.

## Localização

- `src/components/dashboard/OperadoraDataImportDialog.jsx`
- `server/index.js`

## Conteúdo detalhado

Usuário com `canUpload` escolhe operadora, competência/metadados e arquivo. Frontend normaliza linhas; backend valida tudo novamente e insere no BigQuery.
Após upload, backend atualiza latest view e pode atualizar consolidados.

### Resultado parcial e relatório de devolução

Uma linha pode ser ignorada sem bloquear o upload somente quando a descrição ou o mapeamento da conta não for encontrado. Nesse caso, as linhas válidas são importadas e o cliente recebe um relatório de devolução com cada linha ignorada, sua conta e o motivo.

Qualquer outro erro de validação bloqueia o upload inteiro; não há gravação parcial para esses casos. Exemplos: permissão ou operadora inválida, metadados ou colunas inválidos, limite de linhas, duplicidade e valor inválido.

O retorno inclui `uploadId`, linhas inseridas, objetos afetados, warning e, quando aplicável, o resultado parcial e o relatório de devolução.

O upload começa em [OperadoraDataImportDialog](../03-components/OperadoraDataImportDialog.md), passa pela [API import demonstracoes](../05-api/API import demonstracoes.md) e grava em [Demonstrações auxiliar](../06-data-model/Demonstrações auxiliar.md).

## Bugs latentes / lacunas / divergências

> ⚠️ Não há fila/background job; uploads grandes ficam limitados e podem pressionar timeout.

## Permissões / acesso

| Quem | Pode |
|---|---|
| anônimo | Apenas rotas públicas documentadas quando aplicável |
| usuário autenticado | Dados conforme escopo `user_operadora_acessos` |
| admin | Rotas administrativas se email pertence a domínio privilegiado |

## Prompt para agente

```
Você vai mexer em Upload de demonstrações.

Antes:
1. Se mudar upload, revisar cliente, API, data model e permissões.
2. Preserve limite de linhas.
3. Não permitir operador fora do perfil.

NUNCA:
- Reintroduza Supabase, Postgres, SQLite, PM2, systemd ou VPS como fonte operacional.
- Consulte `datalake_ans` diretamente nas telas do dashboard.
- Crie link Markdown para arquivo de código; use inline code.

Para mudança relacionada, atualize TAMBÉM:
- A KB correspondente em `docs/knowledge-base/`.
- `README.md` ou `documentacao/OPERACAO_ATUAL.md` quando o contrato operacional mudar.
- Testes ou validação manual do fluxo afetado.
```
