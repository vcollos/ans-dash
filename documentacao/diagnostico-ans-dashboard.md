# Diagnóstico Técnico – ans-dashboard
_Data da análise: 31/01/2026_

## Visão Geral
- Frontend em **Vite/React** e API em **Express**.
- Dados consumidos exclusivamente do **BigQuery**.
- Autenticação via **Firebase Auth** (ID token validado no backend).
- Produção em **Google Cloud Run** com build estático do frontend.

## Riscos críticos

### 1. `/api/query` expõe SQL (mesmo com allowlist)
- O endpoint agora bloqueia tabelas fora do allowlist (`BQ_ALLOWED_VIEWS`).
- **Risco residual:** se o allowlist for configurado de forma ampla, ainda permite leitura não intencional.
- **Ação recomendada:** manter `BQ_ALLOWED_VIEWS` restrito apenas às views necessárias (ex.: `indicadores_curados_snapshot` e `prestadores_ativos_uniodonto_origem`).

### 2. Credenciais locais no repositório
- Arquivos de service account **não** devem estar versionados.
- **Ação recomendada:** garantir `.cert/` e `.env*` ignorados e revisar commits antes de push.

## Riscos altos

### 3. Dependência de credenciais externas
- O backend depende de ADC (Application Default Credentials) ou `GOOGLE_APPLICATION_CREDENTIALS`.
- **Ação recomendada:** padronizar setup local e usar Service Account no Cloud Run.

### 4. Custos de BigQuery
- Consultas amplas podem aumentar custo.
- **Ação recomendada:** usar snapshot (`indicadores_curados_snapshot`) e filtros por `periodo_id`.

## Gaps funcionais

### 5. Upload de dataset removido
- O painel não aceita upload local (CSV/Parquet).
- **Impacto:** toda atualização de dados deve ocorrer no BigQuery.

## Observações
- Recomenda-se observabilidade (logs estruturados e métricas) no Cloud Run.
