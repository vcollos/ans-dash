#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local.server"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

set -a
: "${BQ_PROJECT_ID:=bigdata-467917}"
: "${BQ_DATASET:=dash_ans}"
: "${BQ_EXPORT_VIEW:=indicadores_curados_snapshot_consolidado}"
: "${BQ_MART_DATASET:=dash_ans}"
: "${BQ_SOURCE_TABLE:=${BQ_PROJECT_ID}.${BQ_MART_DATASET}.${BQ_EXPORT_VIEW}}"
: "${BQ_MART_ANS_TABLE:=indicadores_mart_ans}"
: "${BQ_MART_UNIODONTO_TABLE:=indicadores_mart_uniodonto}"
: "${BQ_LOCATION:=southamerica-east1}"
: "${GOOGLE_APPLICATION_CREDENTIALS:=${ROOT_DIR}/.cert/bigdata-467917-16c1318c138a.json}"
set +a

if [[ ! -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]]; then
  echo "[bq-mart-local] GOOGLE_APPLICATION_CREDENTIALS nao encontrado: ${GOOGLE_APPLICATION_CREDENTIALS}" >&2
  echo "[bq-mart-local] Defina a variavel ou crie .env.local.server com o caminho correto." >&2
  exit 1
fi

cd "${ROOT_DIR}"
node scripts/materialize_bq_mart.js
