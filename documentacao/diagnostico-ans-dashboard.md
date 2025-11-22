# Diagnóstico Técnico – ans-dashboard
_Data da análise: 14/02/2025_

## Visão Geral
- Base Vite/React com API Express (`server/index.js`) apenas proxy de consultas SQL para um PostgreSQL hospedado externamente. O frontend (`src/lib/dataService.js`) monta instruções SQL livres e as envia pelo endpoint genérico `/api/query`.
- A operação em produção hoje é feita executando `npm run dev`, que inicia simultaneamente o Vite dev server e a API via `concurrently`. Não existe fluxo de build/serve dedicado nem camada de autenticação/restrição.
- Há scripts Python/Node para importar dados (`scripts/*.py`, `scripts/materialize_metrics.js`) e vários artefatos legados (componentes e diretórios vazios) que ficaram no repositório, incluindo datasets completos dentro de `public/data/`.

## Riscos críticos

### 1. Endpoint `/api/query` exposto aceita SQL arbitrário enviado pelo browser
- Evidência: `server/index.js:67-88` executa qualquer SQL que comece com `SELECT/WITH`, sem autenticação, limitação de colunas ou prepared statements. O próprio frontend gera as consultas no cliente e faz `fetch('/api/query', { sql })` (`src/lib/dataService.js:180-239`).
- Impacto: qualquer usuário autenticado apenas pelo browser (ou um visitante que descubra o endpoint público) consegue consultar toda a base PostgreSQL, contornar filtros aplicados pelo painel, enumerar schemas e até rodar consultas caras que derrubem o banco. As regras no servidor não impedem seleção de tabelas fora da view configurada.
- Ação recomendada: mover a lógica de montagem de SQL para o backend, expondo endpoints específicos (KPIs, ranking, série histórica etc.) e aplicar autenticação (token, header ou mTLS) entre frontend e API. Enquanto isso não acontece, considere firewall/VPN para bloquear acesso ao endpoint fora da rede interna.

### 2. Chave OpenAI produtiva commitada em texto claro
- Evidência: `ecosystem.config.cjs:4-19` guarda `OPENAI_API_KEY` com prefixo `sk-proj-...` para os processos PM2. Esse arquivo já está no repositório e qualquer clone terá a credencial.
- Impacto: comprometimento imediato do projeto OpenAI (custos não autorizados, vazamento de prompts/regulamentos, revogação de acesso). A chave precisa ser considerada vazada.
- Ação recomendada: revogar a chave publicada, gerar uma nova, configurar via variáveis de ambiente/secret manager e remover o valor do histórico (ou migrar o arquivo para um exemplo sem credenciais). Replicar a estratégia para outros segredos.

## Riscos altos

### 3. Injeção/abuso de SQL por interpolação insegura
- Evidência: `src/lib/dataService.js:97-129` concatena arrays (`filters.anos`, `filters.regAns`, `filters.trimestres`) diretamente no texto do `WHERE`, sem validação de tipo ou sanitização (apenas strings passam por `sanitizeSql`). Um atacante pode enviar, por exemplo, `{"sql":"SELECT 1"}`
modificado no DevTools para incluir `"filters":{"anos":["2024) OR 1=1 --"]}` e a consulta será aceita.
- Impacto: além do risco de `UNION`/`JOIN` em outras tabelas, basta uma string maliciosa para ignorar filtros ou provocar leitura de dados confidenciais. O backend não usa parâmetros do `pg` (`$1, $2`), portanto não há proteção real.
- Ação recomendada: nunca aceitar SQL bruto do cliente. Caso mantenha a proxy temporariamente, sanitize *toda* entrada (conferindo se é número, lista permitida etc.) e utilize `pg` com parâmetros (`client.query({ text, values })`).

### 4. Produção roda `npm run dev`/Vite dev server permanentemente
- Evidência: o service `systemd` (`scripts/ans-dashboard.service:2-13`) chama `scripts/start-dashboard.sh`, que apenas executa `npm run dev` (`scripts/start-dashboard.sh:4-6`). O mesmo vale para o `ecosystem.config.cjs`, que inicia `npm run dev:client` e `npm run dev:server`.
- Impacto: o Vite dev server fica público (com HMR, upload middleware e sourcemaps), sem cache ou minificação. Cada restart recompila todo o bundle, e não existe processo de build estático, dificultando autoscaling/observabilidade. Além disso, requests de upload gravam direto em `public/data` no mesmo host do dashboard.
- Ação recomendada: separar build (`npm run build`) e servir arquivos prontos via Nginx ou `vite preview`, expondo apenas a API Express endurecida. O serviço systemd deveria rodar algo como `node server/index.js` e o frontend deveria ser servido por um web server, não pelo dev server.

### 5. Credenciais e IDs reais hard-coded no código fonte
- Exemplos: `server/index.js:11-17` define `DATABASE_URL` com usuário/senha `ansdashboard:ansdashboard`. `scripts/import_demonstracoes.py` e `scripts/import_parquet_dataset.py` repetem o mesmo DSN. `server/agentRunner.js:5-8` traz IDs reais de Vector Store/Workflow.
- Impacto: qualquer vazamento do repositório expõe a instância do banco e os recursos do agente. Em ambientes multiusuário basta olhar o bundle para descobrir o host do banco e tentar brute-force.
- Ação recomendada: usar arquivos `.env` não versionados, ler os valores com `dotenv` ou `process.env`, e definir credenciais distintas (com privilégios mínimos) para cada serviço. Os IDs do vector store e workflow também devem sair do código e morar em configuração.

## Riscos médios / gaps funcionais

### 6. Botão “Atualizar arquivo base” nunca funciona no modo PostgreSQL
- Evidência: o hook chama `replaceDataset()` (`src/hooks/useDashboardController.js:430-489`), que por sua vez invoca `persistDatasetFile`/`loadDataset`. Entretanto essas funções lançam erro explícito (`src/lib/dataService.js:225-239`) dizendo que upload não é suportado nesse modo.
- Impacto: o usuário final consegue selecionar um CSV/Parquet, mas o app sempre cai em `status='error'` e exibe “Falha ao importar arquivo”. Os filtros são resetados e o status só volta ao normal com reload manual.
- Ação recomendada: remover/ocultar o card quando `sourceInfo.source === 'postgres'`, ou implementar um endpoint na API para aceitar o upload. Até lá, deixe um aviso na UI/README para evitar abertura de chamados.

### 7. Assistente “Falar com ChatGPT” descrito no README não é renderizado
- Evidência: o componente existe (`src/components/dashboard/AgentAssistant.jsx`), mas não é importado em `src/App.jsx` (busca por `AgentAssistant` não retorna nenhuma outra referência). README e DOCUMENTATION prometem o recurso.
- Impacto: clientes esperam o assistente regulatório e não encontram o botão. Além disso, `server/agentRunner.js` fica exposto sem controle de uso real (apenas o endpoint `/api/agent`).
- Ação recomendada: decidir se o recurso será lançado (incluir o componente na sidebar/móvel com o `agentContext`) ou remover a documentação e o endpoint por enquanto. Isso também ajuda a medir/lidar com consumo de tokens.

### 8. Código morto e diretórios/resíduos aumentando o atrito
- Componentes que não são usados em lugar nenhum: `src/components/dashboard/TrendChart.jsx`, `src/components/dashboard/ScatterChart.jsx`, o diretório `src/components/examples/*`, o diretório vazio `src/components/shared/`, `agent/` vazio e `test-listen.js`.
- Impacto: ruído para onboarding, risco de regressões por engano e build maior que o necessário.
- Ação recomendada: arquivar/remover esses arquivos ou movê-los para uma pasta `experiments/` fora do bundle.

### 9. Datasets completos versionados em `public/data`
- Evidência: `public/data/20251213_contas_ans.parquet` (~GB) e `public/data/indicadores.csv` trazem dados de operadoras reais. Como `public/` é servida pelo Vite dev server, qualquer visitante baixa esses arquivos crús.
- Impacto: exposição dos dados em produção (se o servidor não estiver atrás de VPN) e repositório pesado/demorado para clonar.
- Ação recomendada: mover os insumos para armazenamento privado (S3, storage interno) e deixar apenas arquivos de exemplo anonimizados no repositório.

## Outras observações
- O arquivo de exportação SQL é lido synchronously no boot (`server/index.js:19`). Se `db/export_indicadores.sql` não existir ou estiver inválido, a API não sobe – vale adicionar validação/log melhor.
- `agentRunner.ensureClient()` instancia `new OpenAI()` mas o cliente nunca é usado (apenas o `fileSearchTool`). Pode ser simplificado ou aproveitado para observabilidade/autenticação extra.
- Não há scripts `npm start`/`npm run serve` adequados para produção; o `package.json` só contempla ambientes de desenvolvimento e scripts de dados. Documente um playbook de deploy com build, migrações e PM2/systemd.

## Próximos passos sugeridos
1. **Segurança imediata**: revogar a chave OpenAI vazada, girar as credenciais do banco/PostgreSQL e limpar o histórico. Bloquear `/api/query` publicamente (VPN ou firewall) enquanto uma camada de autenticação não é implementada.
2. **Rever arquitetura de dados**: mover a montagem das consultas SQL para o backend, expondo endpoints REST específicos e usando queries parametrizadas no `pg`.
3. **Pipeline de deploy**: criar scripts `npm run build && npm run preview` ou servir `dist/` via Nginx + `node server/index.js`. Ajustar `systemd`/PM2 para usar esses comandos em vez de `npm run dev`.
4. **Higiene do repositório**: retirar datasets sensíveis, remover componentes mortos/diretórios vazios, esconder o card de upload até que o backend suporte a operação e alinhar README/documentação ao estado real do produto.
5. **Agente regulatório**: decidir se o fluxo será liberado agora (UI + controle de uso) ou se o endpoint deve ser protegido/desativado para evitar chamadas externas com ID de vector store real.
