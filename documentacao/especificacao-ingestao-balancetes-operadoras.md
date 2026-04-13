# Especificação de Ingestão de Balancetes e Demonstrações das Operadoras

## 1) Recomendação de estratégia (Template vs Leitor vs Híbrido)

**Recomendação:** híbrido, com **template canônico como padrão obrigatório** e **leitor de balancetes como fallback controlado**.

Justificativa objetiva:

- O projeto já consome um formato longo compatível com o modelo atual de importação auxiliar (`competencia`, `reg_ans`, `cd_conta_contabil`, `descricao`, `vl_saldo_inicial`, `vl_saldo_final` e campos adicionais de auditoria).
- Para operação recorrente e com menor custo de suporte, o formato principal deve ser um **CSV/XLSX padronizado**, porque reduz ambiguidades de parser, facilita validação e permite carga idempotente.
- Como nem todas as operadoras terão maturidade para aderir de imediato ao template, o processo deve aceitar arquivos de ERP em CSV/XLSX e convertê-los para o layout canônico por meio de **perfis de layout versionados por operadora e/ou sistema de origem**.
- PDF deve ser tratado como **exceção operacional**, com extração assistida, validações reforçadas e aprovação manual antes da carga final.

Decisão operacional:

- **Formato principal:** `CSV UTF-8` com `;` como separador recomendado, ou `XLSX` com uma aba única no layout canônico.
- **Formato alternativo aceito:** exportação nativa do ERP em `CSV/XLSX`, desde que exista `layout_id` cadastrado.
- **Formato excepcional:** `PDF`, apenas com parser OCR/tabular + revisão humana.

Alinhamento com o projeto atual:

- O **resultado final normalizado** deve continuar chegando no formato compatível com a tabela auxiliar já existente (`demonstracoes_contabeis_auxiliar`) e com a view consolidada (`vw_demonstracoes_contabeis_consolidada`).
- Os metadados adicionais de parsing, mapeamento e auditoria devem ficar em camadas de staging e controle, sem alterar a lógica analítica existente.

## 2) Pacote mínimo de dados exigidos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| `cnpj_operadora` | STRING(14) | SIM | CNPJ sem máscara. Identificador fiscal primário da operadora. |
| `reg_ans` | STRING | SIM | Registro ANS da operadora. Deve bater com o vínculo de acesso e com o cadastro mestre. |
| `operadora_nome` | STRING | SIM | Nome da cooperativa/operadora no envio. |
| `competencia` | STRING `YYYY-MM` | SIM | Competência mensal de referência do balancete/demonstrativo. |
| `tipo_demonstrativo` | ENUM | SIM | `BALANCETE`, `DRE`, `BALANCO_PATRIMONIAL`, `OUTRO`. Preferencial: `BALANCETE`. |
| `origem_sistema` | STRING | SIM | ERP, planilha padrão ou origem do arquivo. Ex.: `TOTVS`, `PROTHEUS`, `MANUAL_TEMPLATE`. |
| `arquivo_nome` | STRING | SIM | Nome original do arquivo recebido. |
| `arquivo_hash_sha256` | STRING(64) | SIM | Hash do arquivo para idempotência, rastreio e auditoria. |
| `data_geracao_arquivo` | DATETIME | SIM | Data/hora em que o arquivo foi gerado na origem, quando disponível. |
| `moeda` | STRING | SIM | `BRL` por padrão. |
| `unidade_valor` | ENUM | SIM | `UNIDADE`, `MILHAR`, `MILHAO`, `CENTAVOS`. Recomendado: `UNIDADE`. |
| `plano_contas_referencia` | STRING | NÃO | Versão/data do plano de contas de origem, quando existir no ERP. |
| `layout_id` | STRING | NÃO | Identificador do layout conhecido. Obrigatório para arquivos fora do template padrão. |
| `layout_versao` | STRING | NÃO | Versão do layout utilizado pela operadora/sistema. |
| `responsavel_nome` | STRING | SIM | Responsável pelo envio. |
| `responsavel_email` | STRING | SIM | Email do responsável. |
| `responsavel_telefone` | STRING | NÃO | Telefone do responsável. |
| `indicador_substituicao` | BOOLEAN | SIM | `true` quando o envio substitui arquivo anterior da mesma competência. |
| `arquivo_substituido_hash` | STRING(64) | NÃO | Hash do arquivo anterior substituído. Obrigatório se `indicador_substituicao=true`. |

Observação prática:

- O pacote mínimo é **arquivo + metadados do envio**.
- O conteúdo contábil detalhado fica nas linhas do template/leitor.

## 3) Layout do Template Canônico (CSV/XLSX)

Regra:

- O sistema sempre converte qualquer entrada para este layout antes de validar e carregar.
- O layout canônico é mais rico que a tabela final atual; a carga final no modelo do projeto usa o subconjunto compatível e preserva o restante na trilha de auditoria.

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| `cnpj_operadora` | STRING(14) | SIM | CNPJ sem máscara. |
| `reg_ans` | STRING | SIM | Registro ANS. |
| `competencia` | STRING `YYYY-MM` | SIM | Competência da linha. |
| `origem` | STRING | SIM | `MANUAL_TEMPLATE`, `ERP_CSV`, `ERP_XLSX`, `PDF_EXTRACTION`. |
| `codigo_conta_origem` | STRING | SIM | Código da conta no arquivo recebido, preservando pontuação/níveis. |
| `descricao_conta_origem` | STRING | SIM | Descrição exatamente como veio na origem. |
| `saldo_atual` | DECIMAL(18,2) | SIM | Saldo final da competência. |
| `saldo_anterior` | DECIMAL(18,2) | NÃO | Saldo inicial/anterior da competência. |
| `debito_periodo` | DECIMAL(18,2) | NÃO | Total de débitos do período, quando disponível. |
| `credito_periodo` | DECIMAL(18,2) | NÃO | Total de créditos do período, quando disponível. |
| `natureza` | ENUM `D`,`C`,`ND` | SIM | Natureza informada ou inferida. `ND` = não disponível. |
| `nivel` | INT64 | NÃO | Nível hierárquico da conta. |
| `tipo_linha` | ENUM | SIM | `ANALITICA`, `SINTETICA`, `TOTAL`, `CABECALHO`. No template padrão, enviar `ANALITICA` ou `SINTETICA`. |
| `centro_custo` | STRING | NÃO | Centro de custo, se houver. |
| `unidade_negocio` | STRING | NÃO | Unidade/filial, se houver. |
| `data_geracao_arquivo` | DATETIME | NÃO | Copiada do arquivo/metadado. |
| `id_documento` | STRING | SIM | ID lógico do documento; recomendado usar o SHA-256 do arquivo. |
| `sheet_name_origem` | STRING | NÃO | Aba de origem, se vier de XLSX. |
| `linha_origem` | INT64 | NÃO | Número da linha no arquivo original. |
| `parser_layout_id` | STRING | NÃO | Perfil de parsing usado na normalização. |
| `parser_layout_versao` | STRING | NÃO | Versão do parser/layout aplicado. |

Exemplo de 5 linhas fictícias coerentes:

```csv
cnpj_operadora,reg_ans,competencia,origem,codigo_conta_origem,descricao_conta_origem,saldo_atual,saldo_anterior,debito_periodo,credito_periodo,natureza,nivel,tipo_linha,centro_custo,unidade_negocio,data_geracao_arquivo,id_documento,sheet_name_origem,linha_origem,parser_layout_id,parser_layout_versao
12345678000190,314315,2026-02,MANUAL_TEMPLATE,1.2,ATIVO CIRCULANTE,1850000.00,1795000.00,350000.00,295000.00,D,2,SINTETICA,,,2026-03-05T18:10:00Z,0d1a6f0b8f0e9c1b5d1f7c9c5a3d8c2f,balancete,12,TEMPLATE_CANONICO,v1
12345678000190,314315,2026-02,MANUAL_TEMPLATE,2.1,PASSIVO CIRCULANTE,920000.00,880000.00,210000.00,170000.00,C,2,SINTETICA,,,2026-03-05T18:10:00Z,0d1a6f0b8f0e9c1b5d1f7c9c5a3d8c2f,balancete,25,TEMPLATE_CANONICO,v1
12345678000190,314315,2026-02,MANUAL_TEMPLATE,2.5,PATRIMONIO LIQUIDO,930000.00,915000.00,15000.00,0.00,C,2,SINTETICA,,,2026-03-05T18:10:00Z,0d1a6f0b8f0e9c1b5d1f7c9c5a3d8c2f,balancete,31,TEMPLATE_CANONICO,v1
12345678000190,314315,2026-02,MANUAL_TEMPLATE,3.1.1,CONTRAPRESTACOES LIQUIDAS,420000.00,395000.00,0.00,25000.00,C,3,ANALITICA,,,2026-03-05T18:10:00Z,0d1a6f0b8f0e9c1b5d1f7c9c5a3d8c2f,balancete,48,TEMPLATE_CANONICO,v1
12345678000190,314315,2026-02,MANUAL_TEMPLATE,4.1,EVENTOS INDENIZAVEIS LIQUIDOS,260000.00,240000.00,20000.00,0.00,D,2,ANALITICA,,,2026-03-05T18:10:00Z,0d1a6f0b8f0e9c1b5d1f7c9c5a3d8c2f,balancete,57,TEMPLATE_CANONICO,v1
```

Compatibilidade com o projeto atual:

- A carga final analítica precisa gerar ao menos:
  - `competencia`
  - `reg_ans`
  - `cnpj`
  - `cd_conta_contabil`
  - `descricao`
  - `vl_saldo_inicial`
  - `vl_saldo_final`
  - `vl_debitos`
  - `vl_creditos`
  - metadados de envio já existentes

## 4) Especificação do Leitor de Balancetes

### 4.1. Estratégia de parsing

- Detectar tipo do arquivo: `csv`, `xlsx`, `xls`, `pdf`.
- Aplicar `layout profile` por operadora/sistema quando existir.
- Se não houver profile conhecido:
  - detectar cabeçalho por heurística;
  - localizar coluna de conta, descrição e saldos por sinônimos;
  - converter para o layout canônico;
  - marcar o envio como `layout_novo` para revisão.

### 4.2. Sinônimos de colunas

Mapeamento mínimo esperado:

- `codigo_conta_origem`:
  - `conta`
  - `codigo`
  - `cod_conta`
  - `classificacao`
  - `conta contabil`
- `descricao_conta_origem`:
  - `descricao`
  - `descricao conta`
  - `titulo`
  - `nome conta`
- `saldo_atual`:
  - `saldo atual`
  - `saldo final`
  - `saldo mes`
  - `saldo`
- `saldo_anterior`:
  - `saldo anterior`
  - `saldo inicial`
  - `saldo mes anterior`
- `debito_periodo`:
  - `debitos`
  - `mov debito`
- `credito_periodo`:
  - `creditos`
  - `mov credito`
- `natureza`:
  - `natureza`
  - `dc`
  - `debito/credito`

### 4.3. Normalização numérica

- Aceitar:
  - `1234.56`
  - `1234,56`
  - `1.234,56`
  - `1,234.56`
  - `(1234,56)` como negativo
  - `-1234,56`
- Regras:
  - remover separador de milhar;
  - padronizar decimal em `.` internamente;
  - converter parênteses para sinal negativo;
  - tratar células vazias como `NULL`, não como zero.

### 4.4. Identificação de linhas válidas

- Considerar linha contábil quando:
  - existir `codigo_conta_origem` plausível;
  - existir pelo menos um saldo numérico;
  - não for linha de cabeçalho/rodapé/assinatura.
- Regex recomendada para código:
  - `^[0-9]{1,20}([.-][0-9]{1,20})*$`
- Excluir linhas com textos como:
  - `total`
  - `subtotal`
  - `assinatura`
  - `emitido em`
  - `pagina`
  - `folha`

### 4.5. Tratamento de totais e hierarquia

- `tipo_linha=TOTAL` nunca entra automaticamente na carga final.
- `tipo_linha=SINTETICA` pode entrar para validação de soma, mas a carga analítica deve priorizar contas analíticas.
- Se o arquivo trouxer apenas sintéticas, o envio é aceito somente se atender ao escopo mínimo acordado para cálculo dos indicadores.

### 4.6. Configuração por operadora

Cada `layout profile` deve armazenar:

- `layout_id`
- `layout_versao`
- `operadora_id` ou `grupo_operadora`
- `sistema_origem`
- `file_type`
- `sheet_name`
- `header_row_index`
- `skip_rows`
- `footer_rows`
- `column_map`
- `decimal_separator`
- `thousand_separator`
- `negative_style`
- `account_code_regex`
- `line_filters`
- `natureza_default`
- `requires_manual_review`

### 4.7. Estratégia para PDF

- Pipeline:
  - extrair texto/tabelas com OCR ou tabular extraction;
  - reconstruir colunas;
  - converter para layout canônico;
  - obrigar revisão humana antes da carga final.
- Limitações:
  - maior taxa de erro em colunas quebradas;
  - perda de hierarquia visual;
  - risco alto de trocar código/descrição entre linhas;
  - menor confiabilidade para valores negativos e totais.

Regra operacional:

- PDF nunca deve ser `auto-approved`.

## 5) Estratégia de mapeamento de contas

### 5.1. Ordem de prioridade

1. `crosswalk` vigente por operadora:
   - `codigo_conta_origem` + `operadora` + `vigencia`
2. Match exato por código normalizado no plano interno:
   - removendo pontuação opcional
3. Match por prefixo controlado:
   - apenas quando a regra de negócio permitir agregação por subconta para conta pai
4. Fallback por descrição similar:
   - somente com score alto e sem ambiguidade
5. Fila de revisão:
   - qualquer caso ambíguo, sem match ou com score intermediário

### 5.2. Regras de normalização

- Código:
  - remover espaços;
  - preservar o código original bruto;
  - gerar também `codigo_conta_origem_normalizado` sem `.` `-` `/`.
- Descrição:
  - uppercase;
  - remover acentos;
  - remover stopwords genéricas (`conta`, `saldo`, `grupo`);
  - colapsar espaços;
  - tokenizar.

### 5.3. Similaridade por descrição

Regra recomendada:

- score `>= 0.92`: auto-map somente se houver um único candidato
- score `>= 0.85` e `< 0.92`: revisão manual obrigatória
- score `< 0.85`: rejeitar auto-map

### 5.4. Crosswalk versionado

Tabela de `crosswalk` por operadora:

- `operadora_id`
- `codigo_conta_origem`
- `descricao_conta_origem_normalizada`
- `codigo_conta_interno`
- `descricao_conta_interna`
- `vigencia_inicio`
- `vigencia_fim`
- `fonte_match` (`MANUAL`, `AUTO_CODE`, `AUTO_DESC`)
- `aprovado_por`
- `aprovado_em`

### 5.5. Regra de reprocessamento

- O mapeamento é aplicado conforme a vigência da competência processada.
- Alterações futuras no plano de contas não devem reescrever retroativamente competências antigas sem reprocessamento explícito.

## 6) Validações e relatórios de qualidade

### 6.1. Checks obrigatórios

| Check | Regra | Ação |
|---|---|---|
| Presença de campos mínimos | `cnpj_operadora`, `reg_ans`, `competencia`, `codigo_conta_origem`, `saldo_atual` | Bloqueio |
| Formato de competência | `YYYY-MM` válido | Bloqueio |
| CNPJ válido | 14 dígitos e DV válido | Bloqueio |
| Duplicidade de chave bruta | mesma combinação `arquivo_hash + linha_origem` | Bloqueio |
| Duplicidade lógica | mesma `operadora + competencia + codigo_conta_origem + centro_custo + unidade_negocio` sem regra de agregação | Bloqueio |
| Percentual de contas mapeadas | `>= 98%` das linhas monetárias | Bloqueio |
| Percentual de valor mapeado | `>= 99.5%` do valor absoluto total | Bloqueio |
| Continuidade de saldo | `saldo_anterior` da competência atual = `saldo_atual` da competência anterior, dentro da tolerância | Alerta |
| Equação contábil | `Ativo = Passivo + PL`, tolerância de `0.01` | Bloqueio |
| Somas de sintéticas x analíticas | diferença absoluta <= `0.01` por conta sintética | Bloqueio |
| Natureza esperada | divergência entre natureza da conta no plano e sinal/natureza recebidos | Alerta ou bloqueio, conforme criticidade |
| Movimento contábil | `saldo_anterior + debito - credito = saldo_atual`, quando houver os quatro campos | Alerta |
| Outlier mensal | variação > `50%` e valor absoluto > limite configurado | Alerta |
| Linha de total indevida | `tipo_linha=TOTAL` presente na carga final | Bloqueio |
| PDF sem revisão | arquivo `PDF_EXTRACTION` sem aprovação manual | Bloqueio |

### 6.2. Critérios de bloqueio

Bloquear carga final quando ocorrer qualquer um dos itens abaixo:

- erro estrutural do arquivo;
- parser com coluna obrigatória não identificada;
- conta obrigatória para o escopo mínimo ausente;
- mapeamento abaixo do limiar;
- equação contábil inválida;
- duplicidade lógica não resolvida;
- saldo não numérico;
- PDF sem revisão;
- competência já carregada com mesmo `arquivo_hash_sha256`.

### 6.3. Critérios de alerta

- variação relevante mês a mês;
- natureza divergente;
- conta mapeada por descrição e não por código;
- linha sintética recebida sem detalhamento analítico;
- centro de custo novo;
- descrição alterada para um mesmo código de origem.

### 6.4. Exemplo de relatório de erros

```text
arquivo_id: 2f7d1b6e-6d4e-4b7f-9d92-2a95fd17d142
operadora: 314315 / UNIODONTO EXEMPLO
competencia: 2026-02
status: REPROVADO

erros_criticos:
1. linha 57: codigo_conta_origem ausente
2. linha 103: saldo_atual invalido ("1.2.3,45")
3. linha 188: duplicidade de chave logica (314315, 2026-02, 3.1.1)
4. validacao_global: percentual de contas mapeadas = 95.4%, abaixo do minimo de 98%
5. validacao_global: ativo 1,850,000.00 != passivo + PL 1,840,000.00

alertas:
1. linha 212: conta 4.6 mapeada por descricao com score 0.88
2. linha 287: variacao mensal de 83% na conta 4.1
```

## 7) Modelo de dados sugerido (staging e final)

Objetivo:

- manter rastreabilidade completa;
- permitir reprocessamento idempotente;
- preservar compatibilidade com a camada final já usada pelo projeto.

Entidades/tabelas sugeridas:

- `ingestao_arquivo`
  - PK: `arquivo_id`
  - chaves auxiliares: `arquivo_hash_sha256`, `operadora_id`, `competencia`
  - guarda metadados do envio
- `ingestao_arquivo_raw`
  - PK: `arquivo_raw_id`
  - FK: `arquivo_id`
  - guarda blob/URI do arquivo original
- `ingestao_linha_raw`
  - PK: `linha_raw_id`
  - FK: `arquivo_id`
  - chave de origem: `sheet_name_origem`, `linha_origem`
  - guarda a linha original serializada e o texto bruto
- `ingestao_layout_profile`
  - PK: `layout_id`, `layout_versao`
  - define parser por operadora/sistema
- `conta_crosswalk_operadora`
  - PK: `crosswalk_id`
  - FK lógica: `operadora_id`, `codigo_conta_origem`, `vigencia_inicio`
  - mapeia origem -> plano interno
- `balancete_normalizado`
  - PK: `linha_normalizada_id`
  - FK: `arquivo_id`, `linha_raw_id`
  - guarda o layout canônico
- `balancete_validacao_resultado`
  - PK: `validacao_resultado_id`
  - FK: `arquivo_id`, opcional `linha_normalizada_id`
  - registra erro/alerta/check executado
- `balancete_aprovacao`
  - PK: `aprovacao_id`
  - FK: `arquivo_id`
  - registra aprovação manual, responsável e timestamp
- `demonstracoes_contabeis_auxiliar`
  - tabela final já existente no projeto
  - recebe somente linhas aprovadas e mapeadas
- `vw_demonstracoes_contabeis_consolidada`
  - view final já existente
  - combina base oficial + auxiliar latest

Diagrama textual:

- `ingestao_arquivo`
- `ingestao_arquivo`
  - 1:N `ingestao_arquivo_raw`
- `ingestao_arquivo`
  - 1:N `ingestao_linha_raw`
- `ingestao_arquivo`
  - N:1 `ingestao_layout_profile`
- `ingestao_linha_raw`
  - 1:1 ou 1:N `balancete_normalizado`
- `balancete_normalizado`
  - N:1 `conta_crosswalk_operadora`
- `balancete_normalizado`
  - 1:N `balancete_validacao_resultado`
- `ingestao_arquivo`
  - 1:N `balancete_aprovacao`
- `balancete_normalizado` aprovado
  - N:1 `demonstracoes_contabeis_auxiliar`
- `demonstracoes_contabeis_auxiliar`
  - alimenta `vw_demonstracoes_contabeis_consolidada`

Chaves de idempotência recomendadas:

- arquivo: `arquivo_hash_sha256`
- linha normalizada: `arquivo_id + linha_origem + sheet_name_origem`
- fato final: `competencia + reg_ans + cd_conta_contabil + COALESCE(centro_custo,'') + COALESCE(unidade_negocio,'')`

## 8) Checklist final para operação

### Envio pela operadora

1. Gerar balancete da competência `YYYY-MM`.
2. Preferir o template canônico em `CSV UTF-8` ou `XLSX`.
3. Informar `CNPJ`, `reg_ans`, competência, origem do sistema, moeda e unidade de valor.
4. Garantir que negativos estejam consistentes e que não haja separador de milhar ambíguo.
5. Se for reenvio, marcar substituição e informar o documento anterior.

### Ingestão

1. Registrar metadados do arquivo e calcular `SHA-256`.
2. Identificar o tipo de arquivo e o `layout profile`.
3. Parsear para `balancete_normalizado`.
4. Persistir o arquivo bruto e as linhas brutas para auditoria.

### Validação

1. Rodar checks estruturais.
2. Rodar mapeamento de contas.
3. Rodar checks contábeis e de consistência.
4. Emitir relatório de erros e alertas.
5. Bloquear automaticamente quando houver erro crítico.

### Aprovação

1. Aprovar automaticamente apenas arquivos sem erros críticos e com mapping acima do limiar.
2. Exigir revisão manual para:
   - PDF
   - layout novo
   - mapeamento por descrição
   - divergência contábil relevante

### Carga final

1. Carregar somente linhas aprovadas.
2. Gerar versão latest por `competencia + reg_ans + conta`.
3. Atualizar a camada auxiliar compatível com o projeto atual.
4. Regerar a view consolidada.

### Pós-carga

1. Armazenar logs de processamento.
2. Registrar quem aprovou e quando.
3. Permitir reprocessamento do mesmo arquivo sem duplicar.
4. Preservar histórico completo de parser, crosswalk e validações.

