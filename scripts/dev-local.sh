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
: "${BQ_EXPORT_VIEW:=indicadores_curados_snapshot}"
: "${BQ_MART_ANS_TABLE:=indicadores_mart_ans}"
: "${BQ_MART_UNIODONTO_TABLE:=indicadores_mart_uniodonto}"
: "${BQ_MART_DATASET:=dash_ans}"
: "${BQ_LOCATION:=US}"
: "${FIREBASE_PROJECT_ID:=${BQ_PROJECT_ID}}"
: "${FIREBASE_SERVICE_ACCOUNT_PATH:=}"
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
  adc_candidate=""
  for candidate in \
    "/root/.config/gcloud/application_default_credentials.json" \
    "/home/node/.config/gcloud/application_default_credentials.json"
  do
    if [[ -f "${candidate}" ]]; then
      adc_candidate="${candidate}"
      break
    fi
  done

  if [[ -n "${adc_candidate}" ]]; then
    export GOOGLE_APPLICATION_CREDENTIALS="${adc_candidate}"
    echo "[dev-local] usando ADC do gcloud em ${GOOGLE_APPLICATION_CREDENTIALS}"
  else
    docker_cred_candidate="$(find "${ROOT_DIR}/.cert" -maxdepth 1 -type f -name '*.json' ! -name '*firebase-adminsdk*' | head -n1 || true)"
    if [[ -n "${docker_cred_candidate}" ]]; then
      export GOOGLE_APPLICATION_CREDENTIALS="${docker_cred_candidate}"
      echo "[dev-local] usando credencial BigQuery encontrada em ${GOOGLE_APPLICATION_CREDENTIALS}"
    fi
  fi
fi

if [[ ! -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]]; then
  echo "[dev-local] GOOGLE_APPLICATION_CREDENTIALS nao encontrado: ${GOOGLE_APPLICATION_CREDENTIALS}" >&2
  echo "[dev-local] Defina a variavel ou crie .env.local.server com o caminho correto." >&2
  exit 1
fi

if [[ -z "${FIREBASE_SERVICE_ACCOUNT_PATH}" ]]; then
  firebase_key_candidate="$(find "${ROOT_DIR}/.cert" -maxdepth 1 -type f -name '*firebase-adminsdk*.json' | head -n1 || true)"
  if [[ -n "${firebase_key_candidate}" ]]; then
    export FIREBASE_SERVICE_ACCOUNT_PATH="${firebase_key_candidate}"
    echo "[dev-local] usando credencial Firebase Admin em ${FIREBASE_SERVICE_ACCOUNT_PATH}"
  fi
elif [[ ! -f "${FIREBASE_SERVICE_ACCOUNT_PATH}" ]]; then
  echo "[dev-local] FIREBASE_SERVICE_ACCOUNT_PATH nao encontrado: ${FIREBASE_SERVICE_ACCOUNT_PATH}" >&2
  echo "[dev-local] continuando com credencial padrao (ADC)." >&2
fi

cd "${ROOT_DIR}"

if [[ -f "${ROOT_DIR}/package-lock.json" ]]; then
  should_install_deps="false"

  if [[ ! -d "${ROOT_DIR}/node_modules" ]]; then
    should_install_deps="true"
  elif [[ ! -f "${ROOT_DIR}/node_modules/.package-lock.json" ]]; then
    should_install_deps="true"
  elif ! cmp -s "${ROOT_DIR}/package-lock.json" "${ROOT_DIR}/node_modules/.package-lock.json"; then
    should_install_deps="true"
  fi

  if [[ "${should_install_deps}" == "true" ]]; then
    echo "[dev-local] sincronizando dependencias com npm ci..."
    npm ci
  fi
fi

npm run dev
