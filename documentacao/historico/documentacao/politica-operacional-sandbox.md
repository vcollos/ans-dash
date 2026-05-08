# Política Operacional de Sandbox

Este repositório deve operar com ambiente reproduzível e sem dependência de banco de dados local.

## 1. Persistência de dados

- Não criar bancos locais para desenvolvimento, teste manual ou deploy.
- Não introduzir SQLite, Postgres local, MySQL local, arquivos `.db` ou containers de banco apenas para viabilizar o app.
- Toda persistência deve usar as integrações oficiais do projeto.

Estado atual do app:
- analytics e dados operacionais: **BigQuery**
- autenticação: **Firebase Auth / Firebase Admin**

Se no futuro algum módulo passar a usar **Supabase**, a mesma regra continua válida: usar a instância remota do projeto, nunca um banco local paralelo.

## 2. Execução local

- O caminho padrão para subir o sistema localmente é **Docker**.
- O ambiente local deve ser tratado como sandbox reproduzível, com portas, variáveis e credenciais vindas de `docker-compose.dev.yml`, `.env.local`, `.env.local.server` e mounts explícitos.
- O container deve consumir apenas serviços remotos já adotados pelo projeto, sem fallback para storage local persistente.

Fluxo esperado:

```bash
npm run env:init
npm run docker:dev:up
```

Validações mínimas:
- frontend respondendo na porta publicada do Vite
- API respondendo na porta publicada do Express
- healthcheck verde no compose
- integrações remotas acessíveis com as credenciais configuradas

## 3. Deploy e publicação

- O deploy deve seguir pipeline baseado em **Docker**.
- Para produção, a referência é o fluxo do repositório com `Dockerfile` + `cloudbuild.yaml`.
- Alterações locais não devem depender de passos manuais fora do pipeline para serem publicáveis.

Quando houver solicitação explícita de publicação, o fluxo operacional esperado é:

1. validar o app em sandbox via Docker
2. revisar o diff final
3. criar commit
4. fazer push para o remoto
5. acionar/acompanhar o CI/CD configurado
6. confirmar deploy em produção, se o projeto e o pedido exigirem isso

## 4. Regras para agentes e manutenção

- Preferir ajustes compatíveis com CI/CD em vez de soluções ad hoc no host local.
- Não adicionar infraestrutura local que desvie da arquitetura oficial do projeto.
- Tratar `.env*`, mounts de credenciais e serviços cloud como fonte de verdade operacional.
- Se uma mudança exigir persistência nova, ela deve ser proposta primeiro no serviço remoto correto do projeto.
- Se o pipeline de produção não estiver apto para uma publicação automática, isso deve ser reportado claramente antes do deploy.

## 5. Resumo executivo

Neste projeto:
- subir localmente = **Docker**
- dados = **BigQuery**
- autenticação = **Firebase**
- publicação = **commit + push + CI/CD + deploy**, quando solicitado
- banco local = **não permitido**
