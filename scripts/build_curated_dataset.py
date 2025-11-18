#!/usr/bin/env python3
import argparse
from pathlib import Path
import sys

import duckdb

ACCOUNT_AGGREGATIONS = [
  {'code': '3', 'alias': 'vr_receitas'},
  {'code': '4', 'alias': 'vr_despesas'},
  {'code': '311', 'alias': 'vr_contraprestacoes'},
  {'code': '3111', 'alias': 'vr_contraprestacoes_efetivas'},
  {'code': '311121', 'alias': 'vr_contraprestacoes_pre'},
  {'code': '3117', 'alias': 'vr_corresponsabilidade_cedida'},
  {'code': '1231', 'alias': 'vr_creditos_operacoes_saude'},
  {'code': '41', 'alias': 'vr_eventos_liquidos'},
  {'code': '2111', 'alias': 'vr_eventos_a_liquidar'},
  {'code': '43', 'alias': 'vr_desp_comerciais'},
  {'code': '464119113', 'alias': 'vr_desp_comerciais_promocoes'},
  {'code': '46', 'alias': 'vr_desp_administrativas'},
  {'code': '44', 'alias': 'vr_outras_desp_oper'},
  {'code': '47', 'alias': 'vr_desp_tributos'},
  {'code': '35', 'alias': 'vr_receitas_fin'},
  {'code': '36', 'alias': 'vr_receitas_patrimoniais'},
  {'code': '45', 'alias': 'vr_despesas_fin'},
  {'code': '33', 'alias': 'vr_outras_receitas_operacionais'},
  {'code': '12', 'alias': 'vr_ativo_circulante'},
  {'code': '13', 'alias': 'vr_ativo_permanente'},
  {'code': '21', 'alias': 'vr_passivo_circulante'},
  {'code': '23', 'alias': 'vr_passivo_nao_circulante'},
  {'code': '25', 'alias': 'vr_patrimonio_liquido'},
  {'code': '31', 'alias': 'vr_ativos_garantidores'},
  {'code': '32', 'alias': 'vr_provisoes_tecnicas'},
  {'code': '2521', 'alias': 'vr_pl_ajustado'},
  {'code': '2522', 'alias': 'vr_margem_solvencia_exigida'},
  {'code': '61', 'alias': 'vr_conta_61'},
]

CSV_COLUMN_MAPPINGS = [
  ('vr_receitas', '"3_vr_receitas"'),
  ('vr_despesas', '"4_vr_despesas"'),
  ('vr_contraprestacoes', '"311_vr_contraprestacoes"'),
  ('vr_contraprestacoes_efetivas', '"3111_vr_contraprestacoes_efetivas"'),
  ('vr_contraprestacoes_pre', '"311121_vr_contraprestacoes_pre"'),
  ('vr_corresponsabilidade_cedida', '"3117_vr_corresponsabilidade_cedida"'),
  ('vr_creditos_operacoes_saude', '"1231_vr_creditos_operacoes_saude"'),
  ('vr_eventos_liquidos', '"41_vr_eventos_liquidos"'),
  ('vr_eventos_a_liquidar', '"2111_vr_eventos_a_liquidar"'),
  ('vr_desp_comerciais', '"43_vr_desp_comerciais"'),
  ('vr_desp_comerciais_promocoes', '"464119113_vr_desp_comerciais_promocoes"'),
  ('vr_desp_administrativas', '"46_vr_desp_administrativas"'),
  ('vr_outras_desp_oper', '"44_vr_outras_desp_oper"'),
  ('vr_desp_tributos', '"47_vr_desp_tributos"'),
  ('vr_receitas_fin', '"35_vr_receitas_fin"'),
  ('vr_receitas_patrimoniais', '"36_vr_receitas_patrimoniais"'),
  ('vr_despesas_fin', '"45_vr_despesas_fin"'),
  ('vr_outras_receitas_operacionais', '"33_vr_outras_receitas_operacionais"'),
  ('vr_ativo_circulante', '"12_vr_ativo_circulante"'),
  ('vr_ativo_permanente', '"13_vr_ativo_permanente"'),
  ('vr_passivo_circulante', '"21_vr_passivo_circulante"'),
  ('vr_passivo_nao_circulante', '"23_vr_passivo_nao_circulante"'),
  ('vr_patrimonio_liquido', '"25_vr_patrimonio_liquido"'),
  ('vr_ativos_garantidores', '"31_vr_ativos_garantidores"'),
  ('vr_provisoes_tecnicas', '"32_vr_provisoes_tecnicas"'),
  ('vr_pl_ajustado', '"2521_vr_pl_ajustado"'),
  ('vr_margem_solvencia_exigida', '"2522_vr_margem_solvencia_exigida"'),
  ('vr_conta_61', '"61_vr_conta_61"'),
]


def escape_sql_string(value: str) -> str:
  return value.replace("'", "''")


def build_account_sql():
  parts = []
  for spec in ACCOUNT_AGGREGATIONS:
    alias = spec['alias']
    if 'prefix' in spec:
      condition = f"cd_conta_contabil LIKE '{spec['prefix']}%'"
    else:
      condition = f"cd_conta_contabil = '{spec['code']}'"
    parts.append(f"SUM(CASE WHEN {condition} THEN valor ELSE 0 END) AS {alias}")
  return ",\n          ".join(parts)


def build_curated_query(source_path: Path) -> str:
  source_sql = escape_sql_string(str(source_path))
  account_sql = build_account_sql()
  csv_projection = ",\n    ".join(f"{column} AS {alias}" for column, alias in CSV_COLUMN_MAPPINGS)
  return f"""
WITH raw AS (
  SELECT *
  FROM read_parquet('{source_sql}')
), parsed AS (
  SELECT
    TRY_CAST(NULLIF(CAST(reg_ans AS VARCHAR), '') AS BIGINT) AS reg_ans,
    TRY_CAST(NULLIF(CAST(ano AS VARCHAR), '') AS INTEGER) AS ano,
    TRY_CAST(NULLIF(CAST(trimestre AS VARCHAR), '') AS INTEGER) AS trimestre,
    TRIM(operadora) AS nome_operadora,
    TRIM(modalidade) AS modalidade,
    TRIM(porte) AS porte,
    CASE
      WHEN lower(trim(COALESCE(uniodonto, ''))) IN ('sim', 's', '1', 'true') THEN TRUE
      WHEN lower(trim(COALESCE(uniodonto, ''))) IN ('nao', 'não', 'n', '0', 'false') THEN FALSE
      ELSE NULL
    END AS uniodonto_bool,
    CASE
      WHEN lower(trim(COALESCE(ativa, ''))) IN ('sim', 's', '1', 'true') THEN TRUE
      WHEN lower(trim(COALESCE(ativa, ''))) IN ('nao', 'não', 'n', '0', 'false') THEN FALSE
      ELSE NULL
    END AS ativa_bool,
    TRY_CAST(NULLIF(CAST(beneficiarios AS VARCHAR), '') AS BIGINT) AS qt_beneficiarios,
    TRIM(CAST(cd_conta_contabil AS VARCHAR)) AS cd_conta_contabil,
    TRY_CAST(valor AS DOUBLE) AS valor
  FROM raw
  WHERE TRY_CAST(NULLIF(CAST(ano AS VARCHAR), '') AS INTEGER) IS NOT NULL
    AND TRY_CAST(NULLIF(CAST(trimestre AS VARCHAR), '') AS INTEGER) IS NOT NULL
    AND TRY_CAST(NULLIF(CAST(reg_ans AS VARCHAR), '') AS BIGINT) IS NOT NULL
), aggregated AS (
  SELECT
    reg_ans,
    ano,
    trimestre,
    MIN(nome_operadora) FILTER (WHERE nome_operadora IS NOT NULL AND nome_operadora <> '') AS nome_operadora,
    MIN(modalidade) FILTER (WHERE modalidade IS NOT NULL AND modalidade <> '') AS modalidade,
    MIN(porte) FILTER (WHERE porte IS NOT NULL AND porte <> '') AS porte,
    MAX(qt_beneficiarios) AS qt_beneficiarios,
    SUM(CASE WHEN uniodonto_bool IS NOT NULL THEN 1 ELSE 0 END) AS uniodonto_count,
    BOOL_OR(COALESCE(uniodonto_bool, FALSE)) AS uniodonto_flag,
    SUM(CASE WHEN ativa_bool IS NOT NULL THEN 1 ELSE 0 END) AS ativa_count,
    BOOL_OR(COALESCE(ativa_bool, FALSE)) AS ativa_flag,
    {account_sql}
  FROM parsed
  GROUP BY reg_ans, ano, trimestre
), computed AS (
  SELECT
    aggregated.*,
    CASE
      WHEN uniodonto_count = 0 THEN NULL
      WHEN uniodonto_flag THEN 'SIM'
      ELSE 'NAO'
    END AS uniodonto,
    CASE
      WHEN ativa_count = 0 THEN NULL
      WHEN ativa_flag THEN 'SIM'
      ELSE 'NAO'
    END AS ativa
  FROM aggregated
)
SELECT
  nome_operadora,
  modalidade,
  uniodonto,
  qt_beneficiarios AS qt_beneficiarios_periodo,
  ativa,
  porte,
  reg_ans,
  ano,
  trimestre,
  {csv_projection}
FROM computed
WHERE nome_operadora IS NOT NULL
"""


def determine_format(output_path: Path, preferred: str | None) -> str:
  if preferred:
    return preferred.lower()
  suffix = output_path.suffix.lower()
  if suffix == '.parquet':
    return 'parquet'
  if suffix == '.csv':
    return 'csv'
  return 'csv'


def main():
  parser = argparse.ArgumentParser(description="Gera dataset curado a partir do Parquet de contas ANS.")
  parser.add_argument("--source", default="public/data/20251213_contas_ans.parquet", help="Arquivo Parquet bruto.")
  parser.add_argument(
    "--output",
    default="public/data/indicadores.csv",
    help="Arquivo de saída (CSV ou Parquet).",
  )
  parser.add_argument(
    "--format",
    choices=["csv", "parquet"],
    help="Formato explícito da saída (ignora a extensão).",
  )
  args = parser.parse_args()

  source_path = Path(args.source).expanduser().resolve()
  if not source_path.exists():
    raise SystemExit(f"Arquivo de origem {source_path} não encontrado.")

  output_path = Path(args.output).expanduser().resolve()
  output_path.parent.mkdir(parents=True, exist_ok=True)

  output_format = determine_format(output_path, args.format)
  query = build_curated_query(source_path)

  con = duckdb.connect()
  con.execute(f"CREATE OR REPLACE TEMP TABLE curated AS {query}")
  row_count = con.execute("SELECT COUNT(*) FROM curated").fetchone()[0]

  if output_format == 'parquet':
    con.execute(f"COPY curated TO '{escape_sql_string(str(output_path))}' (FORMAT 'parquet')")
  else:
    con.execute(
      f"COPY curated TO '{escape_sql_string(str(output_path))}' "
      "(FORMAT 'csv', HEADER true, DELIMITER ',')"
    )

  size_mb = output_path.stat().st_size / (1024 * 1024)
  print(f"[curate] Geradas {row_count} linhas em {output_path} ({size_mb:.2f} MB)")


if __name__ == "__main__":
  try:
    main()
  except duckdb.Error as exc:
    print(f"[curate] Erro DuckDB: {exc}", file=sys.stderr)
    raise
