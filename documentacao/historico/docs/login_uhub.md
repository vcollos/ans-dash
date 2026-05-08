```markdown
# Tarefa: Auto-aprovação de cadastros do PFC via verificação no UHub

## Contexto

A aplicação `pfc.uniodonto.coop.br` (Programa de Formação Cooperativista) recebe
cadastros de pessoas que precisam de aprovação manual de um colaborador da
Uniodonto do Brasil (Confederação) para liberar acesso.

Queremos eliminar essa fila manual quando a pessoa **já existe no UHub**
(`bigdata-467917.uhub` / API em `https://uhub.../api/external/*`). Se houver
match, a conta PFC é auto-aprovada, uma tag persistente é gravada no usuário do
PFC e ela loga normalmente sem nova consulta a cada acesso.

Este prompt define toda a lógica de consumo da API do UHub, regras de match,
tratamento de conflitos e o que persistir no PFC.

---

## 1. Autenticação e token

A API do UHub usa Bearer token emitido em `Hub > Configurações > API externa`.
O segredo é exibido apenas no momento da criação; no banco fica só
`token_hash` + `token_prefix`.

**Requisitos do token a ser usado pelo PFC:**

- **Contexto:** `Confederação` (obrigatório — token de singular só vê pessoas da
  própria cooperativa, e o PFC precisa verificar pessoas de qualquer Uniodonto).
- **Nome sugerido:** `pfc-onboarding`
- **`usage_context`:** `auto-aprovação de cadastros PFC`
- **Escopos mínimos:** `cooperativas.pessoas`, `tabelas.read`
- **Expiração:** definir rotação (ex: 90 dias) — armazenar em cofre/secret
  manager, nunca em código.

**Header em todas as chamadas:**

```http
Authorization: Bearer <secret>
Content-Type: application/json
```

**Variável de ambiente sugerida:** `UHUB_API_TOKEN`, `UHUB_API_BASE_URL`.

---

## 2. Endpoints utilizados

Base: `${UHUB_API_BASE_URL}` (ex: `https://uhub.uniodonto.coop.br`).

### 2.1 Busca por telefone ou email

```
POST /api/external/catalogo/pessoa_contatos/search
Body: { "q": "<valor_normalizado>" }
```

Retorna lista de contatos batendo o termo, cada item com pelo menos:
`pessoa_id`, `tipo` (`email`|`telefone`), `email_normalized` ou `telefone`,
`wpp`, `verificado_em`, `principal`.

### 2.2 Confirmação canônica da pessoa (by-key)

```
POST /api/external/catalogo/pessoas/by-key
Body: { "id": "<uhub_pessoa_id>" }
```

Retorna o registro canônico em `pessoas`. Use para **revalidar** o `pessoa_id`
antes de gravar (confirma que existe e não foi soft-deleted).

### 2.3 (Futuro / opcional) Vínculos da pessoa

```
POST /api/external/catalogo/pessoa_vinculos/search
Body: { "pessoa_id": "<uhub_pessoa_id>" }
```

Útil depois para descobrir cargos/cooperativas — não é obrigatório no fluxo de
auto-aprovação.

---

## 3. Normalização das entradas (CRÍTICO)

Sem normalização os índices do UHub não batem. Faça **antes** de chamar a API.

### Email
- `trim()`
- `toLowerCase()`
- Rejeite vazio ou sem `@`.

### Telefone
- Remover tudo que não for dígito: `value.replace(/\D/g, '')`
- Garantir formato E.164 sem `+`. Se vier sem DDI, prefixar `55` (Brasil).
- Se vier com 11 dígitos (DDD + 9 dígitos), prefixar `55` → 13 dígitos.
- Se vier com 10 dígitos (fixo), prefixar `55` → 12 dígitos.
- Rejeitar se < 10 dígitos pós-limpeza.
- Exemplo: `(11) 99999-8888` → `5511999998888`.

---

## 4. Algoritmo de match

Execute **as duas buscas em paralelo** (email e telefone). Cada uma pode
retornar 0, 1 ou N resultados.

### 4.1 Coletar `pessoa_id` distintos por canal

```
ids_por_email    = set(itens.map(i => i.pessoa_id))    // do search por email
ids_por_telefone = set(itens.map(i => i.pessoa_id))    // do search por telefone
```

### 4.2 Regras de decisão

| Situação                                                                 | Ação                  |
|--------------------------------------------------------------------------|-----------------------|
| `ids_por_email` e `ids_por_telefone` ambos vazios                        | Fila manual           |
| Exatamente 1 id em qualquer canal, sem conflito com o outro              | **Auto-aprova**       |
| Ambos canais batem o **mesmo** `pessoa_id`                               | **Auto-aprova** (forte)|
| Canais batem `pessoa_id` **diferentes**                                  | Fila manual (conflito)|
| Qualquer canal retorna **mais de 1 `pessoa_id`** distinto                | Fila manual (ambíguo) |
| Erro/timeout em qualquer chamada                                          | Fila manual (nunca auto-aprova por silêncio) |

Definição de `match_por`:
- ambos canais e mesmo id → `"ambos"`
- só email → `"email"`
- só telefone → `"telefone"`

### 4.3 Confirmação por `by-key`

Antes de gravar, chame `/catalogo/pessoas/by-key` com o `pessoa_id` resolvido.
Se retornar 404 ou status inativo → fila manual.

---

## 5. O que gravar no usuário do PFC

Adicionar (ou criar tabela `pfc_users_uhub_link`) os seguintes campos no
registro do usuário recém-criado:

```sql
uhub_pessoa_id        UUID         NULL      -- chave canônica retornada
uhub_verificado_em    TIMESTAMPTZ  NULL      -- agora() no momento do match
uhub_match_por        TEXT         NULL      -- 'email' | 'telefone' | 'ambos'
uhub_token_prefix     TEXT         NULL      -- prefix do token usado (auditoria)
uhub_revalidado_em    TIMESTAMPTZ  NULL      -- preenchido pelo job periódico
status_aprovacao      TEXT         NOT NULL  -- 'auto_aprovado' | 'pendente' | 'aprovado_manual' | 'rejeitado'
```

**Indexar** `uhub_pessoa_id` (queries futuras de federação).

Quando `status_aprovacao = 'auto_aprovado'`, liberar login imediatamente sem
nova consulta ao UHub a cada autenticação.

---

## 6. Job de revalidação periódica

Rodar semanal ou mensalmente sobre todos usuários PFC com `uhub_pessoa_id`
preenchido:

1. `POST /api/external/catalogo/pessoas/by-key { id: uhub_pessoa_id }`
2. Se 200 e ativo → atualizar `uhub_revalidado_em = now()`
3. Se 404 ou pessoa inativa/desligada → mover `status_aprovacao` para
   `'pendente_revisao'` e notificar admin Confederação.

Sem isso, uma tag de auto-aprovação fica eterna mesmo se a pessoa for desligada
no UHub.

---

## 7. Tratamento de erros e idempotência

- **Timeout:** 5s por chamada, 1 retry com backoff exponencial. Após falhar →
  fila manual (não bloqueia o cadastro do usuário no PFC).
- **Rate limit (429):** respeitar `Retry-After`; se persistir → fila manual.
- **Logs:** persistir cada tentativa (sucesso/falha/conflito) com `request_id`,
  `pessoa_id` (se houver), `match_por`, `token_prefix` para auditoria LGPD.
- **Não logar PII em texto puro** (CPF, telefone, email completos) — usar
  últimos 4 dígitos / hash.

---

## 8. Pseudocódigo de referência

```typescript
async function verificarECadastrar(input: { email: string; telefone: string; ... }) {
  const email = normalizeEmail(input.email);
  const telefone = normalizeTelefone(input.telefone);

  let resEmail, resTel;
  try {
    [resEmail, resTel] = await Promise.all([
      uhubSearch('pessoa_contatos', email),
      uhubSearch('pessoa_contatos', telefone),
    ]);
  } catch (err) {
    return aprovacaoManual(input, { motivo: 'uhub_indisponivel', err });
  }

  const idsEmail = unique(resEmail.map(r => r.pessoa_id));
  const idsTel   = unique(resTel.map(r => r.pessoa_id));

  if (idsEmail.length > 1 || idsTel.length > 1) {
    return aprovacaoManual(input, { motivo: 'ambiguo' });
  }
  if (idsEmail.length === 0 && idsTel.length === 0) {
    return aprovacaoManual(input, { motivo: 'sem_match' });
  }
  if (idsEmail.length && idsTel.length && idsEmail[0] !== idsTel[0]) {
    return aprovacaoManual(input, { motivo: 'conflito_canais' });
  }

  const pessoaId = idsEmail[0] ?? idsTel[0];
  const matchPor =
    idsEmail.length && idsTel.length ? 'ambos'
    : idsEmail.length ? 'email' : 'telefone';

  const canonical = await uhubByKey('pessoas', pessoaId);
  if (!canonical || canonical.status_cadastro === 'inativo') {
    return aprovacaoManual(input, { motivo: 'pessoa_inativa' });
  }

  return autoAprovar(input, {
    uhub_pessoa_id: pessoaId,
    uhub_verificado_em: new Date(),
    uhub_match_por: matchPor,
    uhub_token_prefix: getTokenPrefix(),
    status_aprovacao: 'auto_aprovado',
  });
}
```

---

## 9. Checklist de implementação

- [ ] Token Confederação `pfc-onboarding` emitido e armazenado em secret manager
- [ ] Migração no PFC adicionando colunas `uhub_*` + index em `uhub_pessoa_id`
- [ ] Funções `normalizeEmail` e `normalizeTelefone` com testes unitários
- [ ] Cliente HTTP do UHub com timeout, retry e tratamento de 4xx/5xx
- [ ] Lógica de match conforme tabela da seção 4.2 (com testes para cada caso)
- [ ] Revalidação via `by-key` antes de gravar
- [ ] Endpoint/serviço de auto-aprovação que grava as colunas `uhub_*`
- [ ] Job periódico de revalidação (cron semanal)
- [ ] Logging estruturado sem PII em texto puro
- [ ] Documentação operacional (rotação do token, runbook quando UHub cair)

---

## 10. Não fazer

- Não auto-aprovar quando o UHub responde com erro/timeout.
- Não auto-aprovar com mais de 1 `pessoa_id` retornado em qualquer canal.
- Não auto-aprovar quando email aponta a pessoa A e telefone à pessoa B.
- Não consultar o UHub a cada login — confiar na tag persistida.
- Não armazenar o secret do token em variáveis de configuração versionadas.
- Não pular a normalização — sem ela o índice não bate.
```

Pronto pra colar em outro agent. Pode ajustar nomes de coluna/secret conforme convenções do PFC.