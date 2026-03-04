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
: "${BQ_DATASET:=datalake_ans}"
: "${BQ_EXPORT_VIEW:=indicadores_curados_snapshot}"
: "${BQ_MART_ANS_TABLE:=indicadores_mart_ans}"
: "${BQ_MART_UNIODONTO_TABLE:=indicadores_mart_uniodonto}"
: "${BQ_MART_DATASET:=dash_ans}"
: "${BQ_LOCATION:=US}"
: "${FIREBASE_PROJECT_ID:=${BQ_PROJECT_ID}}"
: "${GOOGLE_APPLICATION_CREDENTIALS:=${ROOT_DIR}/.cert/bigdata-467917-16c1318c138a.json}"

if [[ "${BQ_EXPORT_VIEW}" == *.* ]]; then
  _export_view_ref="${BQ_EXPORT_VIEW}"
else
  _export_view_ref="${BQ_PROJECT_ID}.${BQ_MART_DATASET}.${BQ_EXPORT_VIEW}"
fi

: "${VITE_DATASET_VIEW:=${_export_view_ref}}"
: "${VITE_MART_ANS_TABLE:=${BQ_PROJECT_ID}.${BQ_MART_DATASET}.${BQ_MART_ANS_TABLE}}"
: "${VITE_MART_UNIODONTO_TABLE:=${BQ_PROJECT_ID}.${BQ_MART_DATASET}.${BQ_MART_UNIODONTO_TABLE}}"
: "${BQ_ALLOWED_VIEWS:=${_export_view_ref},${BQ_PROJECT_ID}.${BQ_MART_DATASET}.${BQ_MART_ANS_TABLE},${BQ_PROJECT_ID}.${BQ_MART_DATASET}.${BQ_MART_UNIODONTO_TABLE},${BQ_PROJECT_ID}.${BQ_MART_DATASET}.prestadores_ativos_uniodonto_origem}"
set +a

if [[ ! -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]] && [[ -f "/.dockerenv" ]]; then
  docker_cred_candidate="$(find "${ROOT_DIR}/.cert" -maxdepth 1 -type f -name '*.json' | head -n1 || true)"
  if [[ -n "${docker_cred_candidate}" ]]; then
    export GOOGLE_APPLICATION_CREDENTIALS="${docker_cred_candidate}"
    echo "[dev-local] usando credencial BigQuery encontrada em ${GOOGLE_APPLICATION_CREDENTIALS}"
  fi
fi

if [[ ! -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]]; then
  echo "[dev-local] GOOGLE_APPLICATION_CREDENTIALS nao encontrado: ${GOOGLE_APPLICATION_CREDENTIALS}" >&2
  echo "[dev-local] Defina a variavel ou crie .env.local.server com o caminho correto." >&2
  exit 1
fi

cd "${ROOT_DIR}"
npm run dev
