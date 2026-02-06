# Template (CSV) - Demonstracoes Contabeis Mensais (Uniodonto)

## Objetivo
Padronizar a coleta mensal de demonstracoes contabil-financeiras de operadoras (Uniodonto) via app, mantendo compatibilidade com a estrutura do dataset ANS/DIOPS ja consumida pelo projeto e permitindo expansao para todas as contas.

## Padrao ANS (como o projeto consome hoje)
No projeto, a tabela/view de base de demonstracoes contabiliza um formato **longo** (1 linha por conta por periodo):

- `reg_ans` (identificador ANS da operadora)
- `data` (data de referencia do periodo)
- `cd_conta_contabil` (codigo da conta contabil)
- `descricao` (descricao da conta)
- `vl_saldo_inicial` (saldo inicial do periodo)
- `vl_saldo_final` (saldo final do periodo)

No pipeline atual, esses campos sao normalizados/consumidos em `scripts/create_bq_view.js` para gerar uma view agregada por `ano`/`trimestre` e calcular indicadores.

## Contas essenciais ja usadas nos indicadores
Abaixo estao os principais codigos de contas que aparecem nas formulas atuais (ANS RN-518 e Modo Uniodonto). Para coleta mensal, recomenda-se garantir pelo menos essas contas.

### Receita / base de receita
- `311` (contraprestacoes)
- `311121` (contraprestacoes pre) (PMRC)
- `332129111` (outras receitas operacionais - usado no Modo Uniodonto)
- `32` (provisoes tecnicas / tributos diretos conforme formula)
- `61` (impostos - usado no Modo Uniodonto)

### Assistenciais (sinistro / eventos)
- `41` (eventos liquidos)
- `2111` (eventos a liquidar) (PMPG)
- `3117` (corresponsabilidade cedida) (RN-518)
- `442129119` (componente adicional somado a assistenciais no Modo Uniodonto)

### Administrativas / comerciais / operacionais
- `46` (despesas administrativas)
- `43` (despesas comerciais)
- `44` (outras despesas operacionais)
- `47` (despesas de tributos)
- `33` (outras receitas operacionais)
- `35` (receitas financeiras)
- `45` (despesas financeiras)
- `36` (receitas patrimoniais)
- `464` (reclassificacao usada no Modo Uniodonto)
- `464119113` (promocoes / detalhamento)
- `332189111` (ajuste excepcional no indice administrativo para uma operadora especifica)

### Liquidez / estrutura patrimonial
- `12` (ativo circulante)
- `21` (passivo circulante)
- `23` (passivo nao circulante)
- `25` (patrimonio liquido)
- `1213`, `1214`, `122` (caixa/equivalentes - liquidez imediata)
- `1231` (creditos de operacoes de saude) (PMRC)

### Endividamento / provisoes
- `216`, `236` (provisoes tributarias/civeis/trabalhistas)
- `217`, `237` (emprestimos e parcelamentos)

### Garantias e solvencia (RN-518)
- `31` (ativos garantidores)
- `2521` (PL ajustado)
- `2522` (margem de solvencia exigida)

## Template CSV proposto (formato longo)
Um arquivo, com uma linha por conta contabil por mes (competencia):

- Chave natural: (`competencia`, `reg_ans`, `cd_conta_contabil`)

### Regras de preenchimento (semantica)
- Valores em **BRL**.
- Para **contas de resultado** (classes 3/4 e subgrupos), informar preferencialmente o **valor do mes** (movimento do periodo). Para **contas patrimoniais**, informar o **saldo** na data de referencia.
- Manter o **sinal** conforme o sistema contabil (o projeto atual ja lida com `ABS(...)` em contas especificas como 217/237).

### Colunas
| Campo | Tipo | Obrigatorio | Descricao | Exemplo |
|---|---|---:|---|---|
| `competencia` | STRING (YYYY-MM) | SIM | Mes de referencia do fechamento/competencia. | `2026-01` |
| `reg_ans` | INT64 | SIM | Registro ANS da operadora. | `314315` |
| `cnpj` | STRING (14 digitos) | SIM | CNPJ da operadora (somente numeros). | `12345678000190` |
| `cd_conta_contabil` | STRING | SIM | Codigo da conta contabil (sem pontuacao). | `311` |
| `vl_saldo_final` | NUMERIC | SIM | Valor do periodo (resultado) ou saldo (patrimonial), conforme regra acima. | `1054321.77` |
| `descricao` | STRING | NAO | Descricao da conta (para auditoria/UX). | `CONTRAPRESTACOES EFETIVAS` |
| `vl_saldo_inicial` | NUMERIC | NAO | Saldo inicial do periodo (quando aplicavel). | `998877.12` |
| `vl_debitos` | NUMERIC | NAO | Total de debitos no periodo (se o ERP exportar). | `250000.00` |
| `vl_creditos` | NUMERIC | NAO | Total de creditos no periodo (se o ERP exportar). | `300000.00` |
| `moeda` | STRING | NAO | Default `BRL`. | `BRL` |
| `status_fechamento` | STRING (ENUM) | NAO | `PRELIMINAR` / `FECHADO` / `RETIFICACAO`. | `FECHADO` |
| `tipo_envio` | STRING (ENUM) | NAO | `NORMAL` / `RETIFICACAO`. | `NORMAL` |
| `versao_envio` | INT64 | NAO | Inteiro incremental por competencia (quando houver retificacao). | `1` |
| `dt_envio` | TIMESTAMP (ISO-8601) | NAO | Data/hora do envio. | `2026-02-05T18:22:10Z` |
| `sistema_origem` | STRING | NAO | Nome do ERP/relatorio (ex: TOTVS, RM, Protheus, etc.). | `TOTVS-RM` |
| `responsavel_nome` | STRING | NAO | Responsavel pelo envio (auditoria). | `Maria Silva` |
| `responsavel_email` | STRING | NAO | Email do responsavel. | `maria@operadora.com.br` |
| `qt_beneficiarios` | INT64 | NAO | Beneficiarios no mes (se quiser recalcular porte no app). | `18234` |
| `qt_prestadores` | INT64 | NAO | Prestadores no mes (se quiser metricas per-prestador). | `542` |
| `modalidade` | STRING | NAO | Modalidade (ex: Cooperativa odontologica / Odontologia de Grupo). | `Cooperativa odontologica` |
| `porte` | STRING | NAO | `Pequeno Porte` / `Medio Porte` / `Grande Porte`. | `Medio Porte` |
| `observacoes` | STRING | NAO | Campo livre para anotar excecoes. | `Reclassificacao pendente` |

## Validacoes recomendadas (upload)
### Estruturais
- Arquivo em UTF-8.
- Separador recomendado: `;` (Excel PT-BR) ou `,` (aceitar ambos na ingestao).
- Valores monetarios: aceitar `.` ou `,` como separador decimal; **nao** usar separador de milhar.
- Unicidade por (`competencia`, `reg_ans`, `cd_conta_contabil`).

### Conteudo minimo por porte (sugestao)
- Pequeno porte: exigir um subconjunto minimo (contas usadas em receita, assistencial, administrativa, comercial e liquidez).
- Medio/grande: exigir o conjunto completo das contas usadas nos indicadores atuais (incluindo PMRC/PMPG e RN-518).

### Consistencia (warnings)
- Se `vl_saldo_inicial` existir, checar continuidade vs. `vl_saldo_final` do mes anterior (para contas patrimoniais), com tolerancia.
- Se `vl_debitos`/`vl_creditos` existirem, checar `vl_saldo_final ~= vl_saldo_inicial + vl_debitos - vl_creditos` quando aplicavel.
- Garantir presenca das contas essenciais (lista acima) para calcular KPIs.

## Sugestoes de implementacao (alto nivel)
- Armazenar upload cru (append-only) com `upload_id`, `uploaded_at`, `uploaded_by` e processar para uma camada curada que seleciona a ultima `versao_envio` por (`competencia`, `reg_ans`, `cd_conta_contabil`).
- Criar um dicionario de contas (referencia) para o app: codigo -> descricao -> categoria -> obrigatoria (sim/nao).
- Para comparacao com ANS trimestral: agregar meses em trimestres (resultado = soma; patrimonial = saldo do ultimo mes do trimestre) com regra explicita.
