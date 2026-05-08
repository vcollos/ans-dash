# Contraprestações e Eventos Per Capita por Modalidade de Pagamento (Uniodonto)

## Objetivo

Adicionar no dashboard Uniodonto um gráfico histórico comparativo entre:

- operadora selecionada (`operatorContext`)
- média filtrada (filtros de comparação ativos)

com duas séries per capita:

- receita per capita 12m (base configurável)
- eventos per capita 12m

## Estrutura de dados contábil ANS usada

Contas base utilizadas no cálculo:

- `31` -> `vr_contraprestacoes`
- `332129111` -> `vr_conta_332129111` (outras receitas operacionais específicas)
- `32` -> `vr_conta_32` (tributos diretos)
- `41` -> `vr_eventos_liquidos`
- `311121` -> `vr_contraprestacoes_pre` (fallback para segmentação de modalidade de pagamento)
- `qt_beneficiarios` -> denominador per capita

Bases de receita disponíveis:

- `contraprestacao`: `COALESCE(vr_contraprestacoes, 0)`
- `receita_planos_odontologicos`: `COALESCE(vr_contraprestacoes, 0) + COALESCE(vr_conta_332129111, 0) - COALESCE(vr_conta_32, 0)`

Eventos per capita:

- `COALESCE(vr_eventos_liquidos, 0)`

Regra de diluição temporal aplicada no componente:

- ambos os cálculos são divididos por `12` meses (`/ 12`) após a divisão por beneficiários.

## Filtros de modalidade de pagamento

Filtro local do componente:

- `Todos`
- `Preestabelecido`
- `Pós-estabelecido`

Regra SQL:

1. Se existir coluna de modalidade de pagamento no dataset (`modalidade_pagamento`, `modalidade_pgto`, `modalidade_pagto`, `tipo_modalidade_pagamento`, `tp_modalidade_pagamento`), filtrar por ela após normalização (`NORMALIZE_AND_CASEFOLD`).
2. Se não existir, usar fallback:
   - `Preestabelecido`: `ABS(COALESCE(vr_contraprestacoes_pre, 0)) > 0`
   - `Pós-estabelecido`: diferença positiva entre contraprestação total e pré-estabelecida.

## Query SQL (modelo)

### Operadora vs média filtrada

```sql
WITH operador AS (
  SELECT
    ano,
    trimestre,
    periodo,
    CASE
      WHEN SUM(COALESCE(qt_beneficiarios, 0)) = 0 THEN NULL
      ELSE SUM(<BASE_RECEITA_SQL>) / (SUM(COALESCE(qt_beneficiarios, 0)) * 12)
    END AS operador_receita_per_capita,
    CASE
      WHEN SUM(COALESCE(qt_beneficiarios, 0)) = 0 THEN NULL
      ELSE SUM(COALESCE(vr_eventos_liquidos, 0)) / (SUM(COALESCE(qt_beneficiarios, 0)) * 12)
    END AS operador_eventos_per_capita
  FROM `<VIEW_UNIODONTO>`
  WHERE nome_operadora = '<OPERADORA>'
    AND <FILTROS_ATIVOS>
    AND <FILTRO_MODALIDADE_PAGAMENTO>
  GROUP BY ano, trimestre, periodo
),
pares AS (
  SELECT
    ano,
    trimestre,
    periodo,
    CASE
      WHEN SUM(COALESCE(qt_beneficiarios, 0)) = 0 THEN NULL
      ELSE SUM(<BASE_RECEITA_SQL>) / (SUM(COALESCE(qt_beneficiarios, 0)) * 12)
    END AS pares_receita_per_capita,
    CASE
      WHEN SUM(COALESCE(qt_beneficiarios, 0)) = 0 THEN NULL
      ELSE SUM(COALESCE(vr_eventos_liquidos, 0)) / (SUM(COALESCE(qt_beneficiarios, 0)) * 12)
    END AS pares_eventos_per_capita
  FROM `<VIEW_UNIODONTO>`
  WHERE nome_operadora <> '<OPERADORA>'
    AND <FILTROS_COMPARACAO>
    AND <FILTRO_MODALIDADE_PAGAMENTO>
  GROUP BY ano, trimestre, periodo
)
SELECT
  COALESCE(operador.ano, pares.ano) AS ano,
  COALESCE(operador.trimestre, pares.trimestre) AS trimestre,
  COALESCE(operador.periodo, pares.periodo) AS periodo,
  operador.operador_receita_per_capita,
  operador.operador_eventos_per_capita,
  pares.pares_receita_per_capita,
  pares.pares_eventos_per_capita
FROM operador
FULL OUTER JOIN pares ON operador.ano = pares.ano AND operador.trimestre = pares.trimestre
ORDER BY ano, trimestre;
```

### Sem operadora selecionada (média dos filtros)

```sql
SELECT
  ano,
  trimestre,
  periodo,
  CASE
    WHEN SUM(COALESCE(qt_beneficiarios, 0)) = 0 THEN NULL
    ELSE SUM(<BASE_RECEITA_SQL>) / (SUM(COALESCE(qt_beneficiarios, 0)) * 12)
  END AS receita_per_capita,
  CASE
    WHEN SUM(COALESCE(qt_beneficiarios, 0)) = 0 THEN NULL
    ELSE SUM(COALESCE(vr_eventos_liquidos, 0)) / (SUM(COALESCE(qt_beneficiarios, 0)) * 12)
  END AS eventos_per_capita
FROM `<VIEW_UNIODONTO>`
WHERE <FILTROS_ATIVOS>
  AND <FILTRO_MODALIDADE_PAGAMENTO>
GROUP BY ano, trimestre, periodo
ORDER BY ano, trimestre;
```

## Especificação de UI

Componente: `src/components/dashboard/UniodontoPerCapitaChart.jsx`

- Layout:
  - `Card` com título + descrição
  - 2 filtros locais (`Select`): modalidade de pagamento e base de receita
  - gráfico de linha (`recharts`) com até 4 séries
- Séries:
  - primárias: receita per capita e eventos per capita
  - comparação: receita per capita e eventos per capita da média filtrada (tracejadas)
- Integração:
  - renderizado na aba `Gráficos históricos` quando `uniodontoMode === true`
  - consome estado de `useDashboardController`

## Performance

Pontos adotados para manter consulta leve:

- agregação por período (`ano`, `trimestre`, `periodo`) direto no BigQuery
- sem detalhamento por operadora no payload final
- reutilização da mesma view configurada para o modo Uniodonto
- filtro de modalidade de pagamento aplicado no SQL antes do `GROUP BY`
