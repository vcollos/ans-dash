# Como funciona o ranking de operadoras (guia rápido para leigos)

## O que o ranking mostra
- Cada linha é uma operadora no período mais recente disponível (ou no período filtrado).
- As colunas são indicadores econômico-financeiros da ANS (DM, DA, DC, DOP, COMB, LC, CT/PL, PMCR, PMPE, MLL, ROE, IRF etc.).
- A primeira coluna `#` é a posição no ranking para o indicador escolhido.

## Como o cálculo é feito
- **Fonte dos dados:** view/tabela `indicadores_curados_snapshot` no BigQuery (ou a definida em `VITE_DATASET_VIEW`). Cada linha já traz os valores dos indicadores para `reg_ans`, `ano`, `trimestre`.
- **Filtros aplicados:** Modalidade, Porte, Uniodonto, Ativa, Ano, Trimestre, busca por nome. O ranking só considera as operadoras que passam pelos filtros ativos.
- **Ordenação:** definida pela tendência do indicador:
  - Indicadores em que “mais é melhor” (ex.: MLL, ROE, LC, IRF) ordenam em ordem decrescente.
  - Indicadores em que “menos é melhor” (ex.: DM, DA, DC, DOP, COMB, CT/PL, PMCR, PMPE) ordenam em ordem crescente.
- **Cálculo por coluna:** o valor exibido vem diretamente do banco (ou da expressão SQL do indicador). Não há média ou agregação adicional no frontend.
- **Desempate:** o SQL usa `ROW_NUMBER() OVER (ORDER BY valor ...)`, portanto empates seguem a ordem de valor e, se idênticos, a ordem física do resultado (não há critério secundário).

## Quem entra no ranking
- **Sem operadora selecionada:** todas as operadoras que passam pelos filtros ativos.
- **Com operadora selecionada:** a tabela pode destacar a operadora escolhida, mas o ranking continua sendo calculado sobre o mesmo conjunto filtrado (não há “peso extra” para a selecionada).
- **Comparação/pares:** quando o modo “Comparar com” é usado, ele afeta métricas de tendência e cartões, mas o ranking segue a ordenação simples do indicador escolhido dentro do conjunto filtrado.

## Cores e interpretação
- Verde → desempenho melhor na direção esperada (ex.: DM mais baixa, MLL mais alta).
- Vermelho → desempenho pior na direção esperada (ex.: DOP ou COMB altos).
- Amarelo → intermediário.
- As cores são apenas visuais; a posição depende do valor numérico.

## Por que uma operadora fica em 1º ou em último
- Porque o valor do indicador escolhido, após filtros, é o maior (ou o menor) do grupo.
- Se duas operadoras têm valores idênticos, a primeira que aparece recebe a posição mais alta (ordem do banco).
- Não há ponderação por número de beneficiários ou porte no ranking básico.

## Observação sobre ROE (Retorno sobre PL)
- Quando o patrimônio líquido (PL) é negativo, o cálculo padrão pode gerar números muito grandes e positivos (resultado e PL negativos dão quociente positivo).
- Ajuste aplicado para evitar “falsos positivos” em operadoras quebradas:
  - Se `PL < 0`: ROE é forçado a ser negativo (`-abs(resultado_liquido) / abs(PL)`), sinalizando situação de insolvência mesmo que o resultado seja positivo pontualmente.
  - Se `PL = 0` ou nulo: ROE fica em branco (null) para não inflar valores.
  - Se `PL > 0`: ROE normal = `resultado_liquido / PL`.
- Resultado: operadoras descapitalizadas não exibem ROE gigantesco e positivo; o indicador reflete risco/insolvência.

## Observação sobre Capital de Terceiros / PL (CT/PL)
- Se o PL é zero ou negativo, o indicador fica em branco (não é calculado) para evitar números distorcidos que mascaram risco.
- Se o PL é positivo: cálculo normal = (passivo circulante + passivo não circulante) / patrimônio líquido.

## Resumo para responder “por que estou na posição X?”
1) Veja o indicador selecionado no topo da tabela.  
2) Confirme os filtros ativos (modalidade/porte/ano/trimestre etc.).  
3) O valor da sua linha vem direto do banco para esse indicador.  
4) O ranking ordena todos os valores filtrados; você está em Xº porque seu valor é o X-ésimo na ordem (crescente ou decrescente conforme o indicador).  
5) Se o PL for negativo e o resultado também, o ROE aparecerá negativo (não inflado).***

## Score ponderado (score regulatório) – explicação simples

- **O que é:** um “boletim” resumido que combina vários indicadores em uma nota final (RUIM/REGULAR/BOA/ÓTIMA) seguindo pesos inspirados na RN 518/630.
- **Base de cálculo:** usa indicadores como LC, cobertura de provisões, DM, DA, DC, resultado operacional, IRF, ROE, DOP. Cada um recebe uma nota de 1 a 4 comparando o valor da operadora com o grupo de pares (percentis).
- **Pares (quem entra na comparação):** as mesmas operadoras que passam pelos filtros atuais (modalidade, porte, uniodonto, ativa, ano/trimestre). Se você filtra por modalidade “Cooperativa” e porte “Pequeno”, o score compara só esse grupo.
- **Como sai a nota final:**  
  1) Para cada indicador, calcula a posição em relação ao grupo (abaixo de Q1 → nota 1/2/3/4 conforme a tendência).  
  2) Aplica pesos (ex.: LC e solvência têm peso maior; despesas/comerciais/administrativas peso menor).  
  3) Faz a média ponderada das notas e classifica: RUIM (<1.8), REGULAR (≥1.8), BOA (≥2.5), ÓTIMA (≥3.5).
- **O que são Q1, Q2/mediana, Q3 e percentis:** imagine a lista de valores ordenada. Q1 é o ponto onde 25% estão abaixo; mediana (Q2) é o meio (50% abaixo/acima); Q3 é onde 75% estão abaixo. Em alguns gráficos chamamos de p10 (10%), p90 (90%) para ver extremos.
- **Como viram notas (1 a 4):**  
  - Se o indicador “quanto menor melhor” (ex.: DM, DOP, COMB, CT/PL, PMPE, PMCR): valores abaixo de Q1 recebem nota 4 (ótimo), entre Q1–mediana nota 3, entre mediana–Q3 nota 2, acima de Q3 nota 1.  
  - Se o indicador “quanto maior melhor” (ex.: LC, ROE, MLL, IRF): valores acima de Q3 recebem nota 4, entre mediana–Q3 nota 3, entre Q1–mediana nota 2, abaixo de Q1 nota 1.
- **Dados ausentes:** se um indicador está ausente, ele não arrasta a nota para zero; o cálculo normaliza o peso para os indicadores existentes.
- **Filtros e operadora selecionada:** mudar filtros muda o grupo de comparação e, portanto, os percentis. Selecionar uma operadora apenas destaca a linha; o cálculo continua com o mesmo grupo filtrado.
- **Por que a operadora A tem score maior que B?** Porque, no grupo filtrado, ela ficou em percentis melhores (ex.: LC acima de Q3, DM abaixo de Q1, DOP abaixo de Q1), e os pesos favoreceram esses pontos fortes.
