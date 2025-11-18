#!/usr/bin/env python3
import argparse
import csv
from datetime import datetime
from decimal import Decimal
from pathlib import Path

import psycopg


def parse_date(value):
  if not value:
    return None
  return datetime.strptime(value, "%Y-%m-%d").date()


def parse_int(value):
  if not value:
    return None
  return int(value)


def parse_decimal(value):
  if not value:
    return None
  return Decimal(value)


def parse_bool(value):
  if not value:
    return None
  normalized = value.strip().lower()
  if normalized in {"sim", "s", "1", "true", "t"}:
    return True
  if normalized in {"nao", "não", "n", "0", "false", "f"}:
    return False
  return None


def stream_demonstracoes(csv_path, copy):
  with open(csv_path, newline="", encoding="utf-8") as source:
    reader = csv.DictReader(source)
    for row in reader:
      copy.write_row(
        (
          parse_date(row["data"]),
          parse_int(row["reg_ans"]),
          row["cd_conta_contabil"] or None,
          row["descricao"] or None,
          parse_decimal(row["vl_saldo_inicial"]),
          parse_decimal(row["vl_saldo_final"]),
          parse_int(row["ano"]),
          parse_int(row["trimestre"]),
          row["arquivo_origem"] or None,
          row["Operadora"] or None,
          parse_date(row["Periodo"]),
          parse_int(row["Beneficiarios"]),
          parse_bool(row["Uniodonto"]),
          parse_bool(row["ATIVA"]),
          row["modalidade"] or None,
        ),
      )


def stream_plano_contas(csv_path, copy):
  with open(csv_path, newline="", encoding="utf-8") as source:
    reader = csv.DictReader(source)
    for row in reader:
      codigo = row.get("Nº") or row.get("No. 2") or row.get("Nº ")
      if not codigo:
        continue
      copy.write_row(
        (
          codigo,
          row.get("Nome"),
          row.get("Variação Líquida"),
          row.get("Saldo"),
          row.get("Resultado/Balanço"),
          row.get("Cód. Natureza/Grupo Contas"),
          row.get("Categoria de Conta"),
          row.get("Subcategoria de Conta"),
          row.get("Tipo Conta"),
          row.get("Somatório"),
          row.get("Tipo Registro Geral"),
          row.get("Gr. Contábil Negócio"),
          row.get("Gr. Contábil Produto"),
          row.get("Nº Tipo Custo"),
          row.get("Modelo de Diferimento Padrão"),
        ),
      )


def export_indicadores(conn, sql_path, output_path):
  query_text = Path(sql_path).read_text(encoding="utf-8").strip()
  if query_text.endswith(";"):
    query_text = query_text[:-1]
  copy_sql = f"COPY ({query_text}) TO STDOUT WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"
  output_path = Path(output_path)
  with open(output_path, "wb") as dest:
    with conn.cursor().copy(copy_sql) as copy:
      while True:
        chunk = copy.read()
        if not chunk:
          break
        dest.write(chunk)


def main():
  parser = argparse.ArgumentParser(description="Importa demonstracoes contabeis para o PostgreSQL.")
  parser.add_argument(
    "--dsn",
    default="postgresql://ansdashboard:ansdashboard@localhost:5432/ans_dashboard",
    help="String de conexão com o banco",
  )
  parser.add_argument("--csv", default="public/data/20251112_demonstracoes_contabeis.csv", help="Arquivo CSV principal")
  parser.add_argument("--plano", default="dist/data/plano_de_contas_modelo.csv", help="Plano de contas CSV")
  parser.add_argument("--export-sql", default="db/export_indicadores.sql", help="Consulta SQL para gerar o CSV do dashboard")
  parser.add_argument("--export-output", default="public/data/indicadores.csv", help="Arquivo CSV final para o dashboard")
  parser.add_argument("--skip-plano", action="store_true", help="Pula o carregamento do plano de contas")
  parser.add_argument("--skip-export", action="store_true", help="Não gera o CSV agregado após importar os dados")
  args = parser.parse_args()

  csv_path = Path(args.csv)
  plano_path = Path(args.plano)
  if not csv_path.exists():
    raise SystemExit(f"Arquivo {csv_path} não encontrado.")
  if not plano_path.exists():
    if args.skip_plano:
      plano_path = None
    else:
      raise SystemExit(f"Arquivo {plano_path} não encontrado. Use --skip-plano para ignorar.")

  with psycopg.connect(args.dsn) as conn:
    with conn.cursor() as cur:
      cur.execute("TRUNCATE demonstracoes_contabeis RESTART IDENTITY CASCADE")
      cur.execute("TRUNCATE demonstracoes_contabeis_staging")
      cur.execute("TRUNCATE plano_de_contas")
      with cur.copy(
        """
        COPY demonstracoes_contabeis (
          data,
          reg_ans,
          cd_conta_contabil,
          descricao,
          vl_saldo_inicial,
          vl_saldo_final,
          ano,
          trimestre,
          arquivo_origem,
          operadora,
          periodo,
          beneficiarios,
          uniodonto,
          ativa,
          modalidade
        )
        FROM STDIN WITH (FORMAT text)
        """
      ) as copy:
        stream_demonstracoes(csv_path, copy)
      if plano_path:
        with cur.copy(
          """
          COPY plano_de_contas (
            codigo,
            nome,
            variacao_liquida,
            saldo,
            resultado_balanco,
            natureza_grupo,
            categoria_conta,
            subcategoria_conta,
            tipo_conta,
            somatorio,
            tipo_registro,
            grupo_negocio,
            grupo_produto,
            codigo_tipo_custo,
            modelo_diferimento_padrao
          )
          FROM STDIN WITH (FORMAT text)
          """
        ) as copy_plano:
          stream_plano_contas(plano_path, copy_plano)
    conn.commit()
    if not args.skip_export:
      export_indicadores(conn, args.export_sql, args.export_output)


if __name__ == "__main__":
  main()
