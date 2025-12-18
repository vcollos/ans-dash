#!/usr/bin/env python3
import argparse
from decimal import Decimal

import psycopg
import pyarrow.dataset as ds


def get_column_values(batch, *names, default=None):
  for name in names:
    if name in batch.schema.names:
      return batch.column(name).to_pylist()
  return [default] * batch.num_rows


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
  for batch in dataset.to_batches(batch_size=batch_size):
    col_values = {
      'reg_ans': get_column_values(batch, 'reg_ans'),
      'ano': get_column_values(batch, 'ano'),
      'trimestre': get_column_values(batch, 'trimestre'),
      'cd_conta_contabil': get_column_values(batch, 'cd_conta_contabil'),
      'descricao': get_column_values(batch, 'descricao'),
      'vl_saldo_inicial': get_column_values(batch, 'vl_saldo_inicial'),
      'vl_saldo_final': get_column_values(batch, 'vl_saldo_final', 'valor'),
      'operadora': get_column_values(batch, 'Operadora', 'operadora'),
      'modalidade': get_column_values(batch, 'modalidade'),
      'uniodonto': get_column_values(batch, 'Uniodonto', 'uniodonto'),
      'ativa': get_column_values(batch, 'ATIVA', 'ativa'),
      'beneficiarios': get_column_values(batch, 'Beneficiarios', 'beneficiarios'),
      'prestadores': get_column_values(batch, 'Prestadores', 'prestadores'),
      'porte': get_column_values(batch, 'porte'),
      'classe': get_column_values(batch, 'classe'),
      'grupo': get_column_values(batch, 'grupo'),
      'subgrupo': get_column_values(batch, 'subgrupo'),
      'classe_normativa': get_column_values(batch, 'classe_normativa'),
      'categoria_rn518': get_column_values(batch, 'categoria_rn518'),
    }
    total = batch.num_rows
    for idx in range(total):
      copy.write_row(
        (
          None,  # data
          parse_int(col_values['reg_ans'][idx]),
          col_values['cd_conta_contabil'][idx],
          col_values['descricao'][idx],
          parse_decimal(col_values['vl_saldo_inicial'][idx]),
          parse_decimal(col_values['vl_saldo_final'][idx]),
          parse_int(col_values['ano'][idx]),
          parse_int(col_values['trimestre'][idx]),
          None,  # arquivo origem
          col_values['operadora'][idx],
          None,  # periodo
          parse_int(col_values['beneficiarios'][idx]),
          parse_int(col_values['prestadores'][idx]),
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
          prestadores,
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
