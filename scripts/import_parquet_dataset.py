#!/usr/bin/env python3
import argparse
from decimal import Decimal

import psycopg
import pyarrow.dataset as ds


def parse_int(value):
  if value is None:
    return None
  if value == '':
    return None
  return int(value)


def parse_decimal(value):
  if value is None:
    return None
  return Decimal(str(value))


def parse_bool(value):
  if value is None:
    return None
  normalized = str(value).strip().lower()
  if normalized in {'sim', 's', 'true', '1'}:
    return True
  if normalized in {'nao', 'não', 'não', 'n', 'false', '0'}:
    return False
  return None


def stream_rows(dataset, copy, batch_size):
  columns = [
    'reg_ans',
    'ano',
    'trimestre',
    'cd_conta_contabil',
    'descricao',
    'valor',
    'operadora',
    'modalidade',
    'uniodonto',
    'ativa',
    'beneficiarios',
    'porte',
    'classe',
    'grupo',
    'subgrupo',
    'classe_normativa',
    'categoria_rn518',
  ]
  for batch in dataset.to_batches(batch_size=batch_size):
    col_values = {name: batch.column(name).to_pylist() for name in columns}
    total = batch.num_rows
    for idx in range(total):
      copy.write_row(
        (
          None,  # data
          parse_int(col_values['reg_ans'][idx]),
          col_values['cd_conta_contabil'][idx],
          col_values['descricao'][idx],
          None,  # vl_saldo_inicial
          parse_decimal(col_values['valor'][idx]),
          parse_int(col_values['ano'][idx]),
          parse_int(col_values['trimestre'][idx]),
          None,  # arquivo origem
          col_values['operadora'][idx],
          None,  # periodo
          parse_int(col_values['beneficiarios'][idx]),
          parse_bool(col_values['uniodonto'][idx]),
          parse_bool(col_values['ativa'][idx]),
          col_values['modalidade'][idx],
          col_values['porte'][idx],
          col_values['classe'][idx],
          col_values['grupo'][idx],
          col_values['subgrupo'][idx],
          col_values['classe_normativa'][idx],
          col_values['categoria_rn518'][idx],
        ),
      )


def refresh_metadata(conn):
  with conn.cursor() as cur:
    cur.execute(
      """
      INSERT INTO operadoras_metadata (reg_ans, nome, porte)
      SELECT reg_ans, MAX(operadora) FILTER (WHERE operadora IS NOT NULL AND operadora <> '') AS nome, MAX(porte)
      FROM demonstracoes_contabeis
      GROUP BY reg_ans
      ON CONFLICT (reg_ans)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        porte = COALESCE(EXCLUDED.porte, operadoras_metadata.porte)
      """,
    )


def main():
  parser = argparse.ArgumentParser(description='Importa o parquet consolidado diretamente para o PostgreSQL.')
  parser.add_argument('--dsn', default='postgresql://ansdashboard:ansdashboard@localhost:5432/ans_dashboard', help='String de conexão com o banco')
  parser.add_argument('--parquet', default='public/data/20251213_contas_ans.parquet', help='Arquivo parquet de origem')
  parser.add_argument('--batch-size', type=int, default=5000, help='Tamanho dos lotes enviados via COPY')
  args = parser.parse_args()

  dataset = ds.dataset(args.parquet, format='parquet')

  with psycopg.connect(args.dsn) as conn:
    with conn.cursor() as cur:
      cur.execute('TRUNCATE demonstracoes_contabeis RESTART IDENTITY CASCADE')
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
          modalidade,
          porte,
          classe,
          grupo,
          subgrupo,
          classe_normativa,
          categoria_rn518
        )
        FROM STDIN WITH (FORMAT text)
        """
      ) as copy:
        stream_rows(dataset, copy, args.batch_size)
    refresh_metadata(conn)
    conn.commit()


if __name__ == '__main__':
  main()
