# ADR-0001: Importação parcial de demonstrações

**Status:** Aceito
**Contexto:** PFCSH-8

## Contexto

Arquivos contábeis podem conter contas sem descrição ou mapeamento conhecido. O descarte dessas linhas precisa ser transparente para a cooperativa, sem flexibilizar as demais validações do upload.

## Decisão

Permitir resultado parcial exclusivamente para linhas cuja descrição ou mapeamento da conta esteja ausente. Essas linhas são ignoradas e o relatório de devolução informa linha, conta e motivo.

Todos os outros erros de validação bloqueiam a importação inteira.

## Consequências

Linhas válidas podem ser importadas mesmo com contas sem descrição ou mapeamento. O cliente recebe rastreabilidade das linhas ignoradas. Não são criadas contas contábeis nem aceitas linhas inválidas por outros motivos.
