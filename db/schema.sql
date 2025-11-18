CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS public.demonstracoes_contabeis_staging (
  data TEXT,
  reg_ans TEXT,
  cd_conta_contabil TEXT,
  descricao TEXT,
  vl_saldo_inicial TEXT,
  vl_saldo_final TEXT,
  ano TEXT,
  trimestre TEXT,
  arquivo_origem TEXT,
  operadora TEXT,
  periodo TEXT,
  beneficiarios TEXT,
  uniodonto TEXT,
  ativa TEXT,
  modalidade TEXT
);

CREATE TABLE IF NOT EXISTS public.demonstracoes_contabeis (
  id BIGSERIAL PRIMARY KEY,
  data DATE,
  reg_ans BIGINT,
  cd_conta_contabil TEXT NOT NULL,
  descricao TEXT,
  vl_saldo_inicial NUMERIC(20,4),
  vl_saldo_final NUMERIC(20,4),
  ano SMALLINT NOT NULL,
  trimestre SMALLINT NOT NULL,
  arquivo_origem TEXT,
  operadora TEXT,
  periodo DATE,
  beneficiarios INTEGER,
  uniodonto BOOLEAN,
  ativa BOOLEAN,
  modalidade TEXT,
  porte TEXT,
  classe TEXT,
  grupo TEXT,
  subgrupo TEXT,
  classe_normativa TEXT,
  categoria_rn518 TEXT
);

CREATE INDEX IF NOT EXISTS idx_dc_reg_periodo
  ON public.demonstracoes_contabeis (reg_ans, ano, trimestre);

CREATE INDEX IF NOT EXISTS idx_dc_conta
  ON public.demonstracoes_contabeis (cd_conta_contabil);

CREATE TABLE IF NOT EXISTS public.plano_de_contas (
  codigo TEXT PRIMARY KEY,
  nome TEXT,
  variacao_liquida TEXT,
  saldo TEXT,
  resultado_balanco TEXT,
  natureza_grupo TEXT,
  categoria_conta TEXT,
  subcategoria_conta TEXT,
  tipo_conta TEXT,
  somatorio TEXT,
  tipo_registro TEXT,
  grupo_negocio TEXT,
  grupo_produto TEXT,
  codigo_tipo_custo TEXT,
  modelo_diferimento_padrao TEXT
);

CREATE TABLE IF NOT EXISTS public.operadoras_metadata (
  reg_ans BIGINT PRIMARY KEY,
  nome TEXT,
  porte TEXT
);
